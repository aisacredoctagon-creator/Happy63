import { useEffect, useSyncExternalStore } from 'react'
import { asset } from '../config'
import { BGM_DEFAULT, BGM_FADE, BGM_STORAGE_KEY, BGM_TRACKS } from './bgm'
import { BgmPlayer } from './bgmPlayer'
import { MAX_CONCURRENT, MAX_VARY, VOLUME } from './mix'
import { SFX, makeNoise, synthLoop } from './synth'
import type { SfxName, SynthLoopName } from './synth'

/**
 * Pengelola audio terpusat (Web Audio API).
 *  - SFX pendek dan loop (ambient + musik) lewat satu jalur, tiga kategori volume (sfx / ambient / musik) + mute global.
 *  - Autoplay: AudioContext baru dibuat/di-resume pada interaksi pertama user (klik/tekan tombol);
 *    loop yang diminta sebelum itu otomatis mulai begitu audio terbuka.
 *  - Semua SFX dan ambient punya versi prosedural bawaan (src/audio/synth.ts). File asli opsional: letakkan di
 *    public/assets/audio/ lalu daftarkan di manifest.json (nama -> file; dibuat otomatis oleh `npm run audio`,
 *    lihat AUDIO_CREDITS.md); file itu menggantikan versi bawaan.
 *  - Keseimbangan volume: file dinormalisasi dan SFX sintesis dikalibrasi ke level acuan (levels.json), lalu gain per tingkat
 *    (ambience / minor / main / key, diatur di mix.ts) membentuk hierarki; soft-clipper di keluaran mencegah clipping.
 *  - BGM (loop 'music'): lagu dipilih lewat setBgm() (disimpan di localStorage), di-STREAM lewat <audio> (bgmPlayer.ts; tidak
 *    di-decode utuh agar iPhone tidak kehabisan memori) dan hanya lagu terpilih yang diunduh; berganti dengan crossfade, hanya
 *    satu lagu berbunyi pada satu waktu.
 *  - SFX bercakupan "scene" (seq.sfx / scope: 'scene') dipotong halus saat pindah scene (audio.stopScene()).
 */
export type { SfxName }
export type LoopName = SynthLoopName | 'music'
export type Category = 'sfx' | 'ambient' | 'music'

export interface AudioSettings {
  muted: boolean
  sfx: number
  ambient: number
  music: number
}

const LOOP_NAMES: LoopName[] = ['cabin', 'wind', 'airport', 'wheels', 'music']
const isLoopName = (k: string): k is LoopName => (LOOP_NAMES as string[]).includes(k)

/** pengali linear dari dB */
const lin = (db: number) => 10 ** (db / 20)
/** gain tingkat volume dari mix.ts (VOLUME, dalam dB) */
const tierGain = (t: keyof typeof VOLUME) => lin(VOLUME[t])
const loopMix = (n: LoopName) => tierGain(n === 'music' ? 'music' : 'ambience')

/** gain tambahan per loop (linear, 1 = apa adanya): file loop sudah dinormalisasi dan loop sintesis sudah dikalibrasi */
const LOOP_VOL: Record<LoopName, number> = { cabin: 1, wind: 1, airport: 1, wheels: 1, music: 1 }
/** loop ambient dibuat mulus dengan crossfade sambungan (detik); musik dibiarkan apa adanya (gapless dari file) */
const SEAMLESS: Partial<Record<LoopName, number>> = { cabin: 1.5, wind: 1.5, airport: 2, wheels: 1 }
/** batas total suara SFX yang berbunyi bersamaan; suara prioritas 0 (hover/tick) dibuang bila penuh */
const MAX_VOICES = 14

function loadBgm(): string {
  try {
    const v = localStorage.getItem(BGM_STORAGE_KEY)
    if (v && BGM_TRACKS.some((t) => t.id === v)) return v
  } catch {
    /* abaikan */
  }
  return BGM_DEFAULT
}

const STORAGE_KEY = 'gasing-audio'
const DEFAULTS: AudioSettings = { muted: false, sfx: 1, ambient: 1, music: 1 }

function loadSettings(): AudioSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const j = JSON.parse(raw) as Partial<AudioSettings>
      const vol = (v: unknown, d: number) => (typeof v === 'number' && v >= 0 && v <= 1 ? v : d)
      return { muted: !!j.muted, sfx: vol(j.sfx, 1), ambient: vol(j.ambient, 1), music: vol(j.music, 1) }
    }
    // kompatibel dengan versi lama yang hanya menyimpan mute
    return { ...DEFAULTS, muted: localStorage.getItem('gasing-muted') === '1' }
  } catch {
    return { ...DEFAULTS }
  }
}

interface LoopState {
  count: number
  vol: number
  fade: number
  node?: { stop: () => void; gain: GainNode; pause?: (paused: boolean) => void; id?: string }
  starting?: boolean
  killTimer?: ReturnType<typeof setTimeout>
}

export interface PlayOpts {
  /** pengali volume 0..1+ */
  volume?: number
  /** pengali pitch (1 = asli) */
  rate?: number
  /** tunda (detik) pada jam audio */
  delay?: number
  /** 'scene' = dipotong saat pindah scene; 'global' (bawaan) = dibiarkan selesai */
  scope?: 'scene' | 'global'
}

interface Voice {
  name: SfxName
  end: number
  scope: 'scene' | 'global'
}

class AudioManager {
  private ctx?: AudioContext
  private master?: GainNode
  private loopBus?: GainNode
  private cat: Partial<Record<Category, GainNode>> = {}
  private globalBus?: GainNode
  private sceneBus?: GainNode
  private noise?: AudioBuffer
  private manifest: Promise<Record<string, string>>
  private raw = new Map<string, Promise<ArrayBuffer | null>>()
  private buffers = new Map<string, Promise<AudioBuffer | null>>()
  /** SFX berupa file (override) yang sudah di-decode; kosong = pakai resep prosedural */
  private sfxFiles = new Map<string, AudioBuffer>()
  private loops = new Map<LoopName, LoopState>()
  /** BGM: pilihan lagu dan lagu lama yang sedang memudar saat berganti */
  private _bgm = loadBgm()
  private bgmOld?: { stop: () => void; gain: GainNode }
  private bgmOldTimer?: ReturnType<typeof setTimeout>
  private voices: Voice[] = []
  private lastPlay = new Map<SfxName, number>()
  private _settings = loadSettings()
  private duck = 1
  private listeners = new Set<() => void>()

  constructor() {
    // manifest kecil berisi daftar file asli yang tersedia: tanpa itu tidak ada permintaan 404 ke file yang belum ada
    this.manifest = fetch(asset('audio/manifest.json'))
      .then((r) => r.json())
      .then((j: { files?: Record<string, string> }) => (j && typeof j.files === 'object' && j.files ? j.files : {}))
      .catch(() => ({}) as Record<string, string>)
    void this.manifest.then((m) => Object.keys(m).forEach((k) => this.fetchRaw(k))) // ambil data file sedini mungkin (decode menunggu AudioContext)

    const unlock = () => this.unlock()
    for (const ev of ['pointerdown', 'keydown', 'touchstart']) window.addEventListener(ev, unlock, { capture: true })
    // tab disembunyikan: hentikan seluruh audio; kembali: lanjutkan
    document.addEventListener('visibilitychange', () => {
      const ctx = this.ctx
      if (!ctx) return
      this.loops.get('music')?.node?.pause?.(document.hidden)
      if (document.hidden) void ctx.suspend()
      else void ctx.resume().then(() => this.syncLoops())
    })
  }

  private fetchRaw(key: string) {
    let p = this.raw.get(key)
    if (!p) {
      p = this.manifest
        .then((m) => (m[key] ? fetch(asset('audio/' + m[key])) : null))
        .then((r) => (r && r.ok && !(r.headers.get('content-type') || '').includes('text/html') ? r.arrayBuffer() : null))
        .catch(() => null)
      this.raw.set(key, p)
    }
    return p
  }

  private getBuffer(key: string): Promise<AudioBuffer | null> {
    let p = this.buffers.get(key)
    if (!p && this.ctx) {
      const ctx = this.ctx
      p = this.fetchRaw(key).then(async (data) => {
        if (data) {
          try {
            const buf = await ctx.decodeAudioData(data.slice(0))
            if (!isLoopName(key)) {
              this.sfxFiles.set(key, buf)
              return buf
            }
            const fade = SEAMLESS[key]
            return fade ? makeSeamless(ctx, buf, fade) : buf
          } catch {
            /* file rusak: jatuh ke versi prosedural */
          }
        }
        if (isLoopName(key) && key !== 'music') return makeSeamless(ctx, synthLoop(ctx, key), SEAMLESS[key] ?? 1)
        return null
      })
      this.buffers.set(key, p)
    }
    return p ?? Promise.resolve(null)
  }

  get bgmId() {
    return this._bgm
  }

  /**
   * Pilih lagu BGM. Pilihan disimpan dan dipakai di seluruh project. Bila musik sedang berbunyi: lagu lama memudar dan lagu
   * baru (stream) masuk bersamaan (BGM_FADE detik), lalu lagu lama dilepas, jadi hanya satu lagu yang terdengar.
   */
  setBgm(id: string) {
    if (id === this._bgm || !BGM_TRACKS.some((t) => t.id === id)) return
    this._bgm = id
    try {
      localStorage.setItem(BGM_STORAGE_KEY, id)
    } catch {
      /* abaikan */
    }
    this.emit()
    const ctx = this.ctx
    const s = this.loops.get('music')
    if (!ctx || !s || s.count <= 0 || !s.node) return // musik belum/tidak sedang berbunyi: pilihan dipakai saat musik mulai
    this.killBgmOld()
    const old = s.node
    this.bgmOld = old
    s.node = undefined
    const now = ctx.currentTime
    const gp = old.gain.gain
    gp.cancelScheduledValues(now)
    gp.setValueAtTime(gp.value, now)
    gp.linearRampToValueAtTime(0, now + BGM_FADE)
    this.bgmOldTimer = setTimeout(() => this.killBgmOld(), BGM_FADE * 1000 + 150)
    s.fade = BGM_FADE
    void this.applyLoop('music')
  }

  private killBgmOld() {
    if (this.bgmOldTimer) clearTimeout(this.bgmOldTimer)
    this.bgmOldTimer = undefined
    const old = this.bgmOld
    this.bgmOld = undefined
    if (!old) return
    old.stop()
    old.gain.disconnect()
  }

  /** Dipanggil pada gestur user. Aman dipanggil berulang. */
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!AC) return
      const ctx = (this.ctx = new AC())
      this.master = ctx.createGain()
      this.master.gain.value = this._settings.muted ? 0 : 1
      // pengaman puncak di keluaran: soft-clipper yang meloloskan sinyal di bawah -3 dBFS apa adanya (DynamicsCompressor bawaan
      // browser menekan SFX pendek ~10 dB, jadi tidak dipakai)
      const safety = ctx.createWaveShaper()
      safety.curve = softClipCurve()
      safety.oversample = '2x'
      this.master.connect(safety)
      safety.connect(ctx.destination)
      const mk = (parent: AudioNode, v: number) => {
        const g = ctx.createGain()
        g.gain.value = v
        g.connect(parent)
        return g
      }
      this.cat.sfx = mk(this.master, this._settings.sfx)
      this.globalBus = mk(this.cat.sfx, 1)
      this.sceneBus = mk(this.cat.sfx, 1)
      this.loopBus = mk(this.master, this.duck)
      this.cat.ambient = mk(this.loopBus, this._settings.ambient)
      this.cat.music = mk(this.loopBus, this._settings.music)
      this.noise = makeNoise(ctx)
      // siapkan file asli segera; loop prosedural lain disiapkan bertahap agar tidak menahan thread utama
      void this.manifest.then((m) => Object.keys(m).forEach((k) => void this.getBuffer(k)))
      ;(['cabin', 'wind', 'airport', 'wheels'] as const).forEach((k, i) => setTimeout(() => void this.getBuffer(k), 1500 + i * 400))
    }
    if (this.ctx.state === 'suspended' && !document.hidden) {
      void this.ctx.resume().then(() => this.syncLoops())
    } else {
      this.syncLoops()
    }
    this.emit()
  }

  get isRunning() {
    return this.ctx?.state === 'running'
  }

  /** Mainkan SFX. Aman dipanggil kapan saja: diam bila audio belum terbuka, ramai, atau sedang cooldown. */
  playSfx(name: SfxName, opts: PlayOpts = {}) {
    const ctx = this.ctx
    const def = SFX[name]
    if (!ctx || !def || !this.noise) return
    if (ctx.state === 'suspended' && !document.hidden) {
      // klik pertama bisa tiba sebelum resume() selesai: ulangi begitu audio berjalan
      void ctx.resume().then(() => ctx.state === 'running' && this.playSfx(name, opts))
      return
    }
    if (ctx.state !== 'running') return
    const scope = opts.scope ?? 'global'
    const bus = scope === 'scene' ? this.sceneBus : this.globalBus
    if (!bus) return

    const nowMs = performance.now()
    if (def.cd && nowMs - (this.lastPlay.get(name) ?? -1e9) < def.cd) return
    const now = ctx.currentTime
    this.voices = this.voices.filter((v) => v.end > now)
    if (def.max && this.voices.filter((v) => v.name === name).length >= def.max) return
    // SFX kecil tidak boleh menumpuk: batasi jumlah per tingkat (suara prioritas 2 tetap lolos)
    const cap = MAX_CONCURRENT[def.tier]
    if (cap && (def.prio ?? 1) < 2 && this.voices.filter((v) => SFX[v.name].tier === def.tier).length >= cap) return
    if (this.voices.length >= MAX_VOICES && (def.prio ?? 1) < 1) return
    this.lastPlay.set(name, nowMs)

    const t = now + (opts.delay ?? 0) + 0.005
    // variasi kecil pitch dan volume (maks. +/-5%) untuk aksi yang sering berulang; tetap di dalam batas tingkatnya
    const jitter = def.vary ? Math.min(def.vary, MAX_VARY) : 0
    const rate = (opts.rate ?? 1) * (1 + (Math.random() * 2 - 1) * jitter)
    const level = 1 + (Math.random() * 2 - 1) * jitter
    const file = this.sfxFiles.get(name)
    const voice = ctx.createGain()
    // file sudah dinormalisasi ke target kategorinya (gain 1); resep sintesis memakai def.vol hasil kalibrasi
    voice.gain.value = (file ? 1 : def.vol) * tierGain(def.tier) * lin(def.trimDb ?? 0) * level * (opts.volume ?? 1)
    voice.connect(bus)

    if (file) {
      const src = ctx.createBufferSource()
      src.buffer = file
      src.playbackRate.value = rate
      const dur = def.clip ? Math.min(def.clip, file.duration) : file.duration
      if (def.clip) voice.gain.setTargetAtTime(0, t + dur - 0.06, 0.02) // potong halus, tanpa klik
      src.connect(voice)
      src.start(t, 0, dur + 0.1)
      this.voices.push({ name, end: t + dur, scope })
    } else {
      def.play({ ctx, out: voice, t, rate, noise: this.noise })
      this.voices.push({ name, end: t + def.dur, scope })
    }
  }

  /** Potong halus semua SFX bercakupan scene (dipanggil saat pindah scene). SFX global dibiarkan selesai. */
  stopScene() {
    const ctx = this.ctx
    if (!ctx || !this.cat.sfx) return
    const old = this.sceneBus
    if (old) {
      old.gain.cancelScheduledValues(ctx.currentTime)
      old.gain.setTargetAtTime(0, ctx.currentTime, 0.03)
      setTimeout(() => old.disconnect(), 500)
    }
    this.sceneBus = ctx.createGain()
    this.sceneBus.connect(this.cat.sfx)
    this.voices = this.voices.filter((v) => v.scope === 'global')
  }

  startLoop(name: LoopName, fade = 1.5, volume = LOOP_VOL[name] * loopMix(name)) {
    const s = this.loops.get(name) ?? { count: 0, vol: volume, fade }
    s.count++
    s.vol = volume
    s.fade = fade
    this.loops.set(name, s)
    void this.applyLoop(name)
  }

  stopLoop(name: LoopName, fade = 1.2) {
    const s = this.loops.get(name)
    if (!s) return
    s.count = Math.max(0, s.count - 1)
    s.fade = fade
    void this.applyLoop(name)
  }

  private syncLoops() {
    for (const name of this.loops.keys()) void this.applyLoop(name)
  }

  private async applyLoop(name: LoopName) {
    const s = this.loops.get(name)
    const ctx = this.ctx
    const bus = this.cat[name === 'music' ? 'music' : 'ambient']
    if (!s || !ctx || ctx.state !== 'running' || !bus) return
    const now = ctx.currentTime
    if (s.count > 0) {
      if (s.killTimer) {
        clearTimeout(s.killTimer)
        s.killTimer = undefined
      }
      if (s.node) {
        const gp = s.node.gain.gain
        gp.cancelScheduledValues(now)
        gp.setValueAtTime(gp.value, now)
        gp.linearRampToValueAtTime(s.vol, now + s.fade)
      } else if (name === 'music') {
        // BGM di-stream lewat <audio> (tanpa decode ~70 MB yang mematikan tab iPhone); loop mulus oleh BgmPlayer
        const track = BGM_TRACKS.find((t) => t.id === this._bgm) ?? BGM_TRACKS[0]
        const player = new BgmPlayer(ctx, bus, track)
        player.out.gain.setValueAtTime(0, now)
        player.out.gain.linearRampToValueAtTime(s.vol, now + s.fade)
        s.node = { gain: player.out, stop: () => player.destroy(), pause: (p) => player.setPaused(p), id: track.id }
      } else if (!s.starting) {
        s.starting = true
        const buf = await this.getBuffer(name)
        s.starting = false
        if (!buf || s.count <= 0 || s.node) return
        const src = ctx.createBufferSource()
        src.buffer = buf
        src.loop = true
        const gain = ctx.createGain()
        gain.gain.setValueAtTime(0, ctx.currentTime)
        gain.gain.linearRampToValueAtTime(s.vol, ctx.currentTime + s.fade)
        src.connect(gain).connect(bus)
        src.start()
        s.node = {
          gain,
          stop: () => {
            try {
              src.stop()
            } catch {
              /* sudah berhenti */
            }
          },
        }
      }
    } else if (s.node) {
      const { stop, gain } = s.node
      const gp = gain.gain
      gp.cancelScheduledValues(now)
      gp.setValueAtTime(gp.value, now)
      gp.linearRampToValueAtTime(0, now + Math.max(0.05, s.fade))
      s.killTimer = setTimeout(() => {
        stop()
        s.node = undefined
      }, s.fade * 1000 + 120)
    }
  }

  /** 0..1: pelankan semua loop (dipakai saat video ucapan diputar) */
  setDuck(v: number) {
    this.duck = v
    if (this.ctx && this.loopBus) this.loopBus.gain.setTargetAtTime(v, this.ctx.currentTime, 0.25)
  }

  // ---- pengaturan (mute + volume per kategori), tersimpan di localStorage ----
  get settings() {
    return this._settings
  }
  get isMuted() {
    return this._settings.muted
  }
  private commit(next: AudioSettings) {
    this._settings = next
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      /* abaikan */
    }
    const ctx = this.ctx
    if (ctx && this.master) {
      this.master.gain.setTargetAtTime(next.muted ? 0 : 1, ctx.currentTime, 0.05)
      for (const c of ['sfx', 'ambient', 'music'] as const) this.cat[c]?.gain.setTargetAtTime(next[c], ctx.currentTime, 0.05)
    }
    this.emit()
  }
  setMuted(m: boolean) {
    this.commit({ ...this._settings, muted: m })
  }
  setVolume(cat: Category, v: number) {
    this.commit({ ...this._settings, [cat]: Math.max(0, Math.min(1, v)) })
    if (cat === 'sfx') this.playSfx('tick', { rate: 0.8 + v * 0.6 }) // umpan balik saat menggeser
  }
  toggleMute() {
    this.unlock()
    const m = !this._settings.muted
    this.setMuted(m)
    if (!m) this.playSfx('toggleOn', { delay: 0.06 })
  }

  subscribe = (fn: () => void) => {
    this.listeners.add(fn)
    return () => {
      this.listeners.delete(fn)
    }
  }
  private emit() {
    this.listeners.forEach((f) => f())
  }
}

/** kurva soft-clip: lurus (y = x) sampai -3 dBFS, lalu melandai halus (tanh) ke maksimum 1,0 */
function softClipCurve() {
  const T = 0.708
  const n = 4096
  const c = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1
    const a = Math.abs(x)
    c[i] = a <= T ? x : Math.sign(x) * (T + (1 - T) * Math.tanh((a - T) / (1 - T)))
  }
  return c
}

/**
 * sambungan loop mulus: ekor dicampur (equal-power) ke kepala, lalu dipotong.
 * Daya campuran = 1 + korelasi * sin(2t): ekor-kepala yang berkorelasi negatif (umum pada dengung bernada rendah) membuat level
 * turun di sambungan, yang positif membuatnya naik, jadi dikoreksi dengan korelasi terukur agar level tetap rata.
 */
function makeSeamless(ctx: AudioContext, buf: AudioBuffer, fadeSec: number) {
  const f = Math.min(Math.floor(fadeSec * buf.sampleRate), Math.floor(buf.length / 3))
  const n = buf.length - f
  let sxy = 0
  let sxx = 0
  let syy = 0
  for (let c = 0; c < buf.numberOfChannels; c++) {
    const d = buf.getChannelData(c)
    for (let i = 0; i < f; i++) {
      sxy += d[i] * d[n + i]
      sxx += d[i] * d[i]
      syy += d[n + i] * d[n + i]
    }
  }
  const corr = Math.max(-0.9, Math.min(0.9, sxy / Math.sqrt(sxx * syy || 1)))
  const out = ctx.createBuffer(buf.numberOfChannels, n, buf.sampleRate)
  for (let c = 0; c < buf.numberOfChannels; c++) {
    const src = buf.getChannelData(c)
    const dst = out.getChannelData(c)
    for (let i = 0; i < n; i++) dst[i] = src[i]
    for (let i = 0; i < f; i++) {
      const t = (i / f) * (Math.PI / 2)
      const head = Math.sin(t)
      const tail = Math.cos(t)
      dst[i] = (src[i] * head + src[n + i] * tail) / Math.sqrt(Math.max(0.2, 1 + corr * 2 * head * tail))
    }
  }
  return out
}

export const audio = new AudioManager()

/** loop yang hidup selama komponen tampil (dan `enabled`) */
export function useLoop(name: LoopName, opts: { enabled?: boolean; fadeIn?: number; fadeOut?: number } = {}) {
  const { enabled = true, fadeIn = 1.5, fadeOut = 1.2 } = opts
  useEffect(() => {
    if (!enabled) return
    audio.startLoop(name, fadeIn)
    return () => audio.stopLoop(name, fadeOut)
  }, [name, enabled, fadeIn, fadeOut])
}

export function useMuted() {
  return useSyncExternalStore(audio.subscribe, () => audio.isMuted)
}

/** id lagu BGM terpilih (berubah saat audio.setBgm dipanggil) */
export function useBgm() {
  return useSyncExternalStore(audio.subscribe, () => audio.bgmId)
}

export function useAudioSettings() {
  return useSyncExternalStore(audio.subscribe, () => audio.settings)
}
