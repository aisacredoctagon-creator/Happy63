import { asset } from '../config'
import type { BgmTrack } from './bgm'

/**
 * Pemutar BGM streaming: lagu diputar lewat elemen <audio> (tidak di-decode utuh ke memori; decode lagu ~3 menit ~70-80 MB
 * PCM membuat tab iPhone dimatikan Safari) dan tetap disambung ke jalur gain manager (mute, volume, duck, fade).
 *
 * Loop mulus: lagu dengan `crossfade` > 0 diputar oleh DUA elemen bergantian. Saat sisa waktu elemen aktif tinggal
 * `crossfade` detik, elemen kedua mulai dari awal; keduanya di-crossfade equal-power, lalu yang lama dilepas. Lagu dengan
 * `crossfade` 0 memakai loop bawaan <audio>.
 */
interface Slot {
  el: HTMLAudioElement
  src: MediaElementAudioSourceNode
  gain: GainNode
  /** sudah memicu elemen penerus */
  next: boolean
}

const CURVE_N = 64
const FADE_IN = Float32Array.from({ length: CURVE_N }, (_, i) => Math.sin((i / (CURVE_N - 1)) * (Math.PI / 2)))
const FADE_OUT = Float32Array.from({ length: CURVE_N }, (_, i) => Math.cos((i / (CURVE_N - 1)) * (Math.PI / 2)))

export class BgmPlayer {
  /** keluaran pemutar: manager mengatur fade-in/out dan volume lewat gain ini */
  readonly out: GainNode
  private slots: Slot[] = []
  private timer?: number
  private dead = false
  private paused = false

  constructor(
    private ctx: AudioContext,
    dest: AudioNode,
    private track: BgmTrack,
  ) {
    this.out = ctx.createGain()
    this.out.connect(dest)
    this.spawn()
    if (track.crossfade > 0) this.timer = window.setInterval(() => this.tick(), 100)
  }

  /** buat elemen baru dari awal lagu; `prev` (bila ada) di-crossfade keluar begitu elemen baru benar-benar berbunyi */
  private spawn(prev?: Slot) {
    const el = new Audio()
    el.preload = 'auto'
    el.loop = this.track.crossfade <= 0
    el.src = asset('audio/' + this.track.file)
    const src = this.ctx.createMediaElementSource(el)
    const gain = this.ctx.createGain()
    gain.gain.value = prev ? 0 : 1
    src.connect(gain).connect(this.out)
    const slot: Slot = { el, src, gain, next: false }
    this.slots.push(slot)
    void el
      .play()
      .then(() => {
        if (this.dead || !prev) return
        const t = this.ctx.currentTime
        const xf = this.track.crossfade
        gain.gain.setValueCurveAtTime(FADE_IN, t, xf)
        prev.gain.gain.cancelScheduledValues(t)
        prev.gain.gain.setValueCurveAtTime(FADE_OUT, t, xf)
        window.setTimeout(() => this.drop(prev), xf * 1000 + 150)
      })
      .catch(() => {
        /* diblokir browser atau file belum ada: diam saja */
      })
    return slot
  }

  private tick() {
    if (this.dead || this.paused) return
    const cur = this.slots[this.slots.length - 1]
    if (!cur || cur.next) return
    const d = cur.el.duration
    const xf = this.track.crossfade
    if (Number.isFinite(d) && d > xf * 2 && cur.el.currentTime >= d - xf - 0.05) {
      cur.next = true
      this.spawn(cur)
    }
  }

  private drop(slot: Slot) {
    const i = this.slots.indexOf(slot)
    if (i >= 0) this.slots.splice(i, 1)
    slot.el.pause()
    slot.el.removeAttribute('src')
    slot.el.load() // lepaskan buffer stream
    slot.src.disconnect()
    slot.gain.disconnect()
  }

  /** jeda/lanjutkan semua elemen (tab disembunyikan) */
  setPaused(paused: boolean) {
    this.paused = paused
    for (const s of this.slots) {
      if (paused) s.el.pause()
      else void s.el.play().catch(() => {})
    }
  }

  destroy() {
    this.dead = true
    if (this.timer) window.clearInterval(this.timer)
    for (const s of [...this.slots]) this.drop(s)
    this.out.disconnect()
  }
}
