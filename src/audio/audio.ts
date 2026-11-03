import { useEffect, useSyncExternalStore } from 'react'
import { asset } from '../config'
import { SFX, makeNoise, synthLoop } from './synth'
import type { SfxName, SynthLoopName } from './synth'

/**
 * Pengelola audio terpusat (Web Audio API).
 *  - SFX pendek dan loop (ambient + musik) lewat satu jalur, tiga kategori volume (sfx / ambient / musik) + mute global.
 *  - Autoplay: AudioContext baru dibuat/di-resume pada interaksi pertama user (klik/tekan tombol);
 *    loop yang diminta sebelum itu otomatis mulai begitu audio terbuka.
 *  - Semua SFX dan ambient punya versi prosedural bawaan (src/audio/synth.ts). File asli opsional: taruh di
 *    public/assets/audio/ lalu daftarkan namanya di manifest.json (lihat AUDIO_CREDITS.md); file itu menggantikan versi bawaan.
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

const LOOP_FILES: Record<LoopName, string> = {
  cabin: asset('audio/amb-cabin.mp3'),
  wind: asset('audio/amb-wind.mp3'),
  airport: asset('audio/amb-airport.mp3'),
  belt: asset('audio/amb-belt.mp3'),
  wheels: asset('audio/amb-wheels.mp3'),
  music: asset('audio/music-gasing-loop.mp3'), // "2b. Coba Soal Gasing Loop.mp3"
}
const isLoopName = (k: string): k is LoopName => k in LOOP_FILES
const fileOf = (key: string) => (isLoopName(key) ? LOOP_FILES[key] : asset(`audio/sfx-${key}.mp3`))

/** keseimbangan volume: musik di bawah SFX, ambient paling pelan */
const LOOP_VOL: Record<LoopName, number> = { cabin: 0.32, wind: 0.34, airport: 0.3, music: 0.38, belt: 0.24, wheels: 0.22 }
/** loop ambient dibuat mulus dengan crossfade sambungan (detik); musik dibiarkan apa adanya */
const SEAMLESS: Partial<Record<LoopName, number>> = { cabin: 1.5, wind: 1.5, airport: 2, belt: 1, wheels: 1 }
/** batas total suara SFX yang berbunyi bersamaan; suara prioritas 0 (hover/tick) dibuang bila penuh */
const MAX_VOICES = 14

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
  node?: { src: AudioBufferSourceNode; gain: GainNode }
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
  private manifest: Promise<Set<string>>
  private raw = new Map<string, Promise<ArrayBuffer | null>>()
  private buffers = new Map<string, Promise<AudioBuffer | null>>()
  /** SFX berupa file (override) yang sudah di-decode; kosong = pakai resep prosedural */
  private sfxFiles = new Map<string, AudioBuffer>()
  private loops = new Map<LoopName, LoopState>()
  private voices: Voice[] = []
  private lastPlay = new Map<SfxName, number>()
  private _settings = loadSettings()
  private duck = 1
  private listeners = new Set<() => void>()

  constructor() {
    // manifest kecil berisi daftar file asli yang tersedia: tanpa itu tidak ada permintaan 404 ke file yang belum ada
    this.manifest = fetch(asset('audio/manifest.json'))
      .then((r) => r.json())
      .then((j: { overrides?: unknown }) => new Set<string>(Array.isArray(j.overrides) ? (j.overrides as string[]) : []))
      .catch(() => new Set<string>())
    void this.manifest.then((set) => set.forEach((k) => this.fetchRaw(k))) // ambil data file sedini mungkin (decode menunggu AudioContext)

    const unlock = () => this.unlock()
    for (const ev of ['pointerdown', 'keydown', 'touchstart']) window.addEventListener(ev, unlock, { capture: true })
    // tab disembunyikan: hentikan seluruh audio; kembali: lanjutkan
    document.addEventListener('visibilitychange', () => {
      const ctx = this.ctx
      if (!ctx) return
      if (document.hidden) void ctx.suspend()
      else void ctx.resume().then(() => this.syncLoops())
    })
  }

  private fetchRaw(key: string) {
    let p = this.raw.get(key)
    if (!p) {
      p = this.manifest
        .then((set) => (set.has(key) ? fetch(fileOf(key)) : null))
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

  /** Dipanggil pada gestur user. Aman dipanggil berulang. */
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!AC) return
      const ctx = (this.ctx = new AC())
      this.master = ctx.createGain()
      this.master.gain.value = this._settings.muted ? 0 : 1
      this.master.connect(ctx.destination)
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
      // siapkan file asli dan musik segera; loop prosedural lain disiapkan bertahap agar tidak menahan thread utama
      void this.getBuffer('music')
      void this.manifest.then((set) => set.forEach((k) => void this.getBuffer(k)))
      ;(['cabin', 'wind', 'airport', 'belt', 'wheels'] as const).forEach((k, i) => setTimeout(() => void this.getBuffer(k), 1500 + i * 400))
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
    if (!ctx || ctx.state !== 'running' || !def || !this.noise) return
    const scope = opts.scope ?? 'global'
    const bus = scope === 'scene' ? this.sceneBus : this.globalBus
    if (!bus) return

    const nowMs = performance.now()
    if (def.cd && nowMs - (this.lastPlay.get(name) ?? -1e9) < def.cd) return
    const now = ctx.currentTime
    this.voices = this.voices.filter((v) => v.end > now)
    if (def.max && this.voices.filter((v) => v.name === name).length >= def.max) return
    if (this.voices.length >= MAX_VOICES && (def.prio ?? 1) < 1) return
    this.lastPlay.set(name, nowMs)

    const t = now + (opts.delay ?? 0) + 0.005
    const rate = (opts.rate ?? 1) * (def.vary ? 1 + (Math.random() * 2 - 1) * def.vary : 1)
    const voice = ctx.createGain()
    voice.gain.value = def.vol * (opts.volume ?? 1)
    voice.connect(bus)

    const file = this.sfxFiles.get(name)
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

  startLoop(name: LoopName, fade = 1.5, volume = LOOP_VOL[name]) {
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
        s.node = { src, gain }
      }
    } else if (s.node) {
      const { src, gain } = s.node
      const gp = gain.gain
      gp.cancelScheduledValues(now)
      gp.setValueAtTime(gp.value, now)
      gp.linearRampToValueAtTime(0, now + Math.max(0.05, s.fade))
      s.killTimer = setTimeout(() => {
        try {
          src.stop()
        } catch {
          /* sudah berhenti */
        }
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

/** sambungan loop mulus: ekor dicampur (equal-power) ke kepala, lalu dipotong */
function makeSeamless(ctx: AudioContext, buf: AudioBuffer, fadeSec: number) {
  const f = Math.min(Math.floor(fadeSec * buf.sampleRate), Math.floor(buf.length / 3))
  const n = buf.length - f
  const out = ctx.createBuffer(buf.numberOfChannels, n, buf.sampleRate)
  for (let c = 0; c < buf.numberOfChannels; c++) {
    const src = buf.getChannelData(c)
    const dst = out.getChannelData(c)
    for (let i = 0; i < n; i++) dst[i] = src[i]
    for (let i = 0; i < f; i++) {
      const t = i / f
      dst[i] = src[i] * Math.sin((t * Math.PI) / 2) + src[n + i] * Math.cos((t * Math.PI) / 2)
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

export function useAudioSettings() {
  return useSyncExternalStore(audio.subscribe, () => audio.settings)
}
