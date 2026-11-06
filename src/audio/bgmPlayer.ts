import { asset } from '../config'
import type { BgmTrack } from './bgm'

/**
 * Pemutar BGM streaming: lagu diputar lewat elemen <audio> (tidak di-decode utuh ke memori; decode lagu ~3 menit ~70-80 MB
 * PCM membuat tab iPhone dimatikan Safari) dan tetap disambung ke jalur gain manager (mute, volume, duck, fade).
 *
 * Tiga cara memutar ulang:
 *  1. `tailLoop` (file loop hasil ekspor DAW): OVERLAP ekor. Hasil analisis file (ffmpeg, lihat docs/BGM-LOOP.md): panjang file =
 *     1 ketukan senyap + N birama musik + 2 birama ekor reverb (Coba Soal Gasing: 153 ketukan @110 BPM = 1 + 36x4 + 8; Orang
 *     Jenius: 177 ketukan @100 BPM = 1 + 42x4 + 8). Ekor reverb itu memang dimaksudkan menimpa awal putaran berikutnya.
 *     Memutar file apa adanya (loop=true) membuat jeda ~5 detik (ekor memudar -30..-148 dB lalu 0,5 detik senyap), jadi: elemen
 *     baru dimulai tiap `period` (= N birama) detik pada gain penuh, elemen lama dibiarkan menyelesaikan ekornya lalu dilepas.
 *     Level di sambungan terukur kontinu (tanpa lubang atau lonjakan). Elemen <audio> dipilih (bukan buffer Web Audio utuh)
 *     agar memori iPhone aman; jeda play() diukur dan dikompensasi, dan karena yang tumpang tindih hanya ekor reverb,
 *     selisih beberapa milidetik tidak terdengar sebagai ketukan meleset.
 *  2. `crossfade` > 0 (lagu utuh, bukan loop): diputar oleh DUA elemen bergantian. Saat sisa waktu elemen aktif tinggal
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
  /** perkiraan jeda (detik) dari play() sampai bunyi mulai, dipakai memajukan pemicu salinan berikutnya (mode tailLoop) */
  private latency = 0.04

  constructor(
    private ctx: AudioContext,
    dest: AudioNode,
    private track: BgmTrack,
  ) {
    this.out = ctx.createGain()
    this.out.connect(dest)
    if (track.tailLoop) {
      this.spawnTail(true)
      this.timer = window.setInterval(() => this.tickTail(), 40)
    } else {
      this.spawn()
      if (track.crossfade > 0) this.timer = window.setInterval(() => this.tick(), 100)
    }
  }

  /** mode tailLoop: satu salinan file utuh, dimainkan sekali sampai habis (tanpa loop, tanpa fade), lalu dilepas */
  private spawnTail(first: boolean) {
    const cfg = this.track.tailLoop
    if (!cfg) return
    const el = new Audio()
    el.preload = 'auto'
    el.loop = false
    el.src = asset('audio/' + this.track.file)
    if (first && cfg.startAt > 0) {
      // lompati ketukan senyap di awal agar musik langsung terdengar; salinan berikutnya mulai dari 0 (menjaga kisi ketukan)
      el.addEventListener(
        'loadedmetadata',
        () => {
          try {
            el.currentTime = cfg.startAt
          } catch {
            /* abaikan: musik hanya mulai ~0,5 detik lebih lambat */
          }
        },
        { once: true },
      )
    }
    const src = this.ctx.createMediaElementSource(el)
    const gain = this.ctx.createGain()
    src.connect(gain).connect(this.out)
    const slot: Slot = { el, src, gain, next: false }
    this.slots.push(slot)
    el.addEventListener('ended', () => this.drop(slot), { once: true })
    const t0 = performance.now()
    void el
      .play()
      .then(() => {
        // ukur jeda play() pada salinan berikutnya (yang bisa dikompensasi), dihaluskan agar tidak melonjak
        if (!first) this.latency = Math.min(0.15, Math.max(0.01, this.latency * 0.5 + ((performance.now() - t0) / 1000) * 0.5))
      })
      .catch(() => {
        /* diblokir browser atau file belum ada: diam saja */
      })
  }

  /** mode tailLoop: picu salinan berikutnya tepat saat salinan terbaru mencapai `period` (dikurangi jeda play()) */
  private tickTail() {
    const cfg = this.track.tailLoop
    if (!cfg || this.dead || this.paused) return
    const cur = this.slots[this.slots.length - 1]
    if (!cur || cur.next) return
    const remain = cfg.period - cur.el.currentTime - this.latency
    if (remain > 0.1) return // belum dekat
    cur.next = true
    window.setTimeout(() => {
      if (this.dead) return
      if (this.paused) {
        cur.next = false // dijeda tepat di titik sambung: dicoba lagi setelah dilanjutkan
        return
      }
      this.spawnTail(false)
    }, Math.max(0, remain * 1000))
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
