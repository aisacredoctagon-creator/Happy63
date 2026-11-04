import { useEffect, useSyncExternalStore } from 'react'
import { asset } from '../config'

/**
 * Pengelola audio terpusat (Web Audio API).
 *  - SFX pendek (klik, kado) dan loop (ambient + musik) lewat satu jalur, satu kontrol mute.
 *  - Autoplay: AudioContext baru dibuat/di-resume pada interaksi pertama user (klik/tekan tombol);
 *    loop yang diminta sebelum itu otomatis mulai begitu audio terbuka.
 *  - File yang belum ada tidak menimbulkan error: bunyinya dilewati diam-diam (cek AUDIO_CREDITS.md).
 */
export type SfxName = 'click' | 'gift'
export type LoopName = 'cabin' | 'wind' | 'airport' | 'music'

const FILES: Record<SfxName | LoopName, string> = {
  click: asset('audio/sfx-click.mp3'),
  gift: asset('audio/sfx-gift.mp3'),
  cabin: asset('audio/amb-cabin.mp3'),
  wind: asset('audio/amb-wind.mp3'),
  airport: asset('audio/amb-airport.mp3'),
  music: asset('audio/music-gasing-loop.mp3'), // "2b. Coba Soal Gasing Loop.mp3"
}
/** keseimbangan volume: musik di bawah SFX, ambient paling pelan */
const SFX_VOL: Record<SfxName, number> = { click: 0.5, gift: 0.7 }
const LOOP_VOL: Record<LoopName, number> = { cabin: 0.32, wind: 0.34, airport: 0.3, music: 0.38 }
/** batas durasi SFX (detik); klik dipotong < 300 ms */
const SFX_MAX: Partial<Record<SfxName, number>> = { click: 0.28 }
/** loop ambient dibuat mulus dengan crossfade sambungan (detik); musik dibiarkan apa adanya */
const SEAMLESS: Partial<Record<LoopName, number>> = { cabin: 1.5, wind: 1.5, airport: 2 }

/**
 * Loop yang panjang (musik ~3 menit) TIDAK di-decode utuh ke memori: hasil decode-nya ~80 MB PCM, yang bersama gambar
 * membuat tab iPhone dimatikan Safari ("A problem repeatedly occurred"). Sebagai gantinya diputar streaming lewat <audio>
 * dan tetap disambung ke jalur gain yang sama (mute, duck, fade tetap bekerja).
 */
const STREAMED = new Set<string>(['music'])

interface LoopState {
  count: number
  vol: number
  fade: number
  node?: { stop: () => void; gain: GainNode }
  starting?: boolean
  killTimer?: ReturnType<typeof setTimeout>
}

class AudioManager {
  private ctx?: AudioContext
  private master?: GainNode
  private loopBus?: GainNode
  private raw = new Map<string, Promise<ArrayBuffer | null>>()
  private buffers = new Map<string, Promise<AudioBuffer | null>>()
  private loops = new Map<LoopName, LoopState>()
  private muted = (() => {
    try {
      return localStorage.getItem('gasing-muted') === '1'
    } catch {
      return false
    }
  })()
  private duck = 1
  private listeners = new Set<() => void>()

  constructor() {
    // ambil data file sedini mungkin (fetch tidak butuh interaksi); decode menunggu AudioContext
    for (const key of Object.keys(FILES)) if (!STREAMED.has(key)) this.fetchRaw(key)
    const unlock = () => this.unlock()
    for (const ev of ['pointerdown', 'keydown', 'touchstart']) window.addEventListener(ev, unlock, { capture: true })
  }

  private fetchRaw(key: string) {
    let p = this.raw.get(key)
    if (!p) {
      p = fetch(FILES[key as keyof typeof FILES])
        .then((r) => (r.ok && !(r.headers.get('content-type') || '').includes('text/html') ? r.arrayBuffer() : null))
        .catch(() => null)
      this.raw.set(key, p)
    }
    return p
  }

  private getBuffer(key: SfxName | LoopName): Promise<AudioBuffer | null> {
    let p = this.buffers.get(key)
    if (!p && this.ctx) {
      const ctx = this.ctx
      p = this.fetchRaw(key).then(async (data) => {
        if (!data) return null
        try {
          const buf = await ctx.decodeAudioData(data.slice(0))
          const fade = SEAMLESS[key as LoopName]
          return fade ? makeSeamless(ctx, buf, fade) : buf
        } catch {
          return null
        }
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
      this.ctx = new AC()
      this.master = this.ctx.createGain()
      this.master.gain.value = this.muted ? 0 : 1
      this.master.connect(this.ctx.destination)
      this.loopBus = this.ctx.createGain()
      this.loopBus.gain.value = this.duck
      this.loopBus.connect(this.master)
    }
    // decode semua file di muka agar loop/SFX langsung siap saat dipakai (mis. musik di scene peta)
    for (const key of Object.keys(FILES)) if (!STREAMED.has(key)) void this.getBuffer(key as SfxName | LoopName)
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().then(() => this.syncLoops())
    } else {
      this.syncLoops()
    }
    this.emit()
  }

  get isRunning() {
    return this.ctx?.state === 'running'
  }

  async playSfx(name: SfxName, volume = 1) {
    if (!this.ctx || this.ctx.state !== 'running' || !this.master) return
    const buf = await this.getBuffer(name)
    if (!buf || !this.ctx || !this.master) return
    const src = this.ctx.createBufferSource()
    src.buffer = buf
    const g = this.ctx.createGain()
    const max = SFX_MAX[name]
    const dur = max ? Math.min(max, buf.duration) : buf.duration
    const t = this.ctx.currentTime
    g.gain.setValueAtTime(SFX_VOL[name] * volume, t)
    if (max) g.gain.setTargetAtTime(0, t + dur - 0.06, 0.02) // potong halus, tanpa klik
    src.connect(g).connect(this.master)
    src.start(t, 0, dur + 0.1)
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
    if (!s || !ctx || ctx.state !== 'running' || !this.loopBus) return
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
        if (STREAMED.has(name)) {
          const el = new Audio()
          el.loop = true
          el.preload = 'auto'
          el.src = FILES[name]
          const src = ctx.createMediaElementSource(el)
          const gain = ctx.createGain()
          gain.gain.setValueAtTime(0, ctx.currentTime)
          gain.gain.linearRampToValueAtTime(s.vol, ctx.currentTime + s.fade)
          src.connect(gain).connect(this.loopBus)
          el.play().catch(() => {
            /* file belum ada / diblokir: diam saja */
          })
          s.starting = false
          s.node = {
            gain,
            stop: () => {
              el.pause()
              el.removeAttribute('src')
              el.load() // lepaskan buffer stream
              src.disconnect()
            },
          }
          return
        }
        const buf = await this.getBuffer(name)
        s.starting = false
        if (!buf || s.count <= 0 || s.node || !this.loopBus) return
        const src = ctx.createBufferSource()
        src.buffer = buf
        src.loop = true
        const gain = ctx.createGain()
        gain.gain.setValueAtTime(0, ctx.currentTime)
        gain.gain.linearRampToValueAtTime(s.vol, ctx.currentTime + s.fade)
        src.connect(gain).connect(this.loopBus)
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

  get isMuted() {
    return this.muted
  }
  setMuted(m: boolean) {
    this.muted = m
    try {
      localStorage.setItem('gasing-muted', m ? '1' : '0')
    } catch {
      /* abaikan */
    }
    if (this.ctx && this.master) this.master.gain.setTargetAtTime(m ? 0 : 1, this.ctx.currentTime, 0.05)
    this.emit()
  }
  toggleMute() {
    this.unlock()
    this.setMuted(!this.muted)
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
