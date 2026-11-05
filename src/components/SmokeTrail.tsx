import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'

interface Props {
  /** titik knalpot: elemen penanda (mis. div kecil di dalam elemen pesawat); posisinya dibaca tiap frame, jadi ikut gerak/skala/rotasi pesawat */
  originRef: RefObject<HTMLElement | null>
  /** arah aliran udara (derajat, 0 = jejak mengalir ke kiri/ke belakang pesawat yang terbang ke kanan) */
  flowDeg?: number
  /** kecepatan aliran jejak relatif terhadap layar (px kanvas 1920x1080 per detik) */
  flow?: number
  /** skala ukuran partikel (1 = pesawat selebar ~870 px) */
  size?: number
  /** partikel per detik di titik knalpot */
  rate?: number
  /** berhenti memancarkan (partikel yang ada memudar sendiri) */
  emitting?: boolean
}

/** batas partikel hidup: kolam objek tetap, dipakai ulang (tidak ada alokasi per frame) */
const MAX = 110
/** resolusi kanvas = setengah kanvas panggung; asap lembut tidak butuh lebih, dan hemat fill-rate di ponsel */
const CW = 960
const CH = 540
const K = CW / 1920

interface P {
  live: boolean
  x: number
  y: number
  vx: number
  vy: number
  age: number
  life: number
  s0: number
  s1: number
  a0: number
  phase: number
  freq: number
  amp: number
  rot: number
}

/** sprite asap lembut (putih kebiruan -> transparan), dibuat sekali lalu digambar berulang dengan drawImage */
function makeSprite() {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')
  if (g) {
    const r = g.createRadialGradient(32, 32, 0, 32, 32, 32)
    r.addColorStop(0, 'rgba(250,252,255,1)')
    r.addColorStop(0.45, 'rgba(232,238,248,0.82)')
    r.addColorStop(0.8, 'rgba(214,224,240,0.32)')
    r.addColorStop(1, 'rgba(210,221,238,0)')
    g.fillStyle = r
    g.fillRect(0, 0, 64, 64)
  }
  return c
}

/**
 * Jejak asap pesawat (Scene 03 dan 04): sistem partikel kanvas 2D.
 * - Kerucut sempit di knalpot yang melebar dan memudar seiring jarak; sedikit bergelombang (sinus) dengan turbulensi acak.
 * - Partikel tertinggal di "dunia" saat pesawat bergerak, jadi jejak mengikuti lintasan; arah aliran mengikuti `flowDeg`.
 * - Kolam objek 72 partikel, dipakai ulang; pesawat tidak terlihat / komponen dilepas -> loop berhenti dan kanvas dibersihkan.
 */
export function SmokeTrail({ originRef, flowDeg = 0, flow = 300, size = 1, rate = 30, emitting = true }: Props) {
  const cv = useRef<HTMLCanvasElement>(null)
  const live = useRef({ flowDeg, flow, size, rate, emitting })
  live.current = { flowDeg, flow, size, rate, emitting }

  useEffect(() => {
    const canvas = cv.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const sprite = makeSprite()
    const pool: P[] = Array.from({ length: MAX }, () => ({ live: false, x: 0, y: 0, vx: 0, vy: 0, age: 0, life: 1, s0: 1, s1: 1, a0: 0, phase: 0, freq: 1, amp: 0, rot: 0 }))
    // ponsel/perangkat lemah: laju pancar dikurangi
    const weak = (navigator.hardwareConcurrency ?? 8) <= 4 || window.innerWidth < 700
    let raf = 0
    let last = performance.now()
    let acc = 0
    let ox = 0
    let oy = 0
    let ovx = 0
    let ovy = 0
    let have = false
    const rnd = (a: number, b: number) => a + Math.random() * (b - a)

    const spawn = (x: number, y: number) => {
      const p = pool.find((q) => !q.live)
      if (!p) return
      const { flowDeg: deg, flow: fl, size: sz } = live.current
      const ang = (deg * Math.PI) / 180
      // arah belakang pesawat: kiri (-x) diputar sebesar flowDeg; ditambah sebagian kecepatan pesawat (jejak melengkung saat pesawat bermanuver)
      const sp = fl * rnd(0.9, 1.1)
      p.live = true
      p.x = x + rnd(-2, 2) * sz
      p.y = y + rnd(-2, 2) * sz
      p.vx = -Math.cos(ang) * sp - ovx * 0.35
      p.vy = -Math.sin(ang) * sp - ovy * 0.35 + rnd(-6, 6) * sz // kerucut sempit: sebaran lateral awal kecil
      p.age = 0
      p.life = rnd(2.2, 3.0)
      p.s0 = rnd(26, 36) * sz
      p.s1 = rnd(110, 160) * sz
      p.a0 = rnd(0.45, 0.75)
      p.phase = rnd(0, Math.PI * 2)
      p.freq = rnd(1.6, 2.8)
      p.amp = rnd(8, 18) * sz
      p.rot = rnd(0, Math.PI * 2)
    }

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      if (dt <= 0) return
      // titik knalpot dalam koordinat kanvas (px 1920x1080): posisi penanda relatif terhadap kanvas, dinormalkan oleh transform induk
      const m = originRef.current
      if (m) {
        const mr = m.getBoundingClientRect()
        const cr = canvas.getBoundingClientRect()
        if (cr.width > 0) {
          const k = 1920 / cr.width
          const nx = (mr.left + mr.width / 2 - cr.left) * k
          const ny = (mr.top + mr.height / 2 - cr.top) * k
          if (have) {
            // kecepatan titik knalpot (dihaluskan) untuk membelokkan jejak mengikuti gerak pesawat
            const kk = 1 - Math.exp(-dt / 0.12)
            ovx += ((nx - ox) / dt - ovx) * kk
            ovy += ((ny - oy) / dt - ovy) * kk
          }
          ox = nx
          oy = ny
          have = true
        }
      }
      const L = live.current
      if (L.emitting && have) {
        // pesawat melaju (lepas landas): pancaran dipadatkan agar jejak tetap menyambung, bukan titik-titik
        const boost = 1 + Math.min(2.5, Math.hypot(ovx, ovy) / 300)
        acc += dt * L.rate * boost * (weak ? 0.6 : 1)
        while (acc >= 1) {
          acc -= 1
          spawn(ox, oy)
        }
      }
      ctx.clearRect(0, 0, CW, CH)
      for (const p of pool) {
        if (!p.live) continue
        p.age += dt
        const t = p.age / p.life
        if (t >= 1) {
          p.live = false
          continue
        }
        // turbulensi halus + sedikit naik (asap hangat), kecepatan melambat seiring jarak
        p.vy += (Math.random() - 0.5) * 60 * dt - 4 * dt
        const drag = Math.exp(-dt * 0.35)
        p.vx *= drag
        p.vy *= drag
        p.x += p.vx * dt
        p.y += p.vy * dt
        const wob = Math.sin(p.phase + p.age * p.freq) * p.amp * Math.min(1, t * 1.6) // gelombang melebar menjauhi knalpot
        const s = p.s0 + (p.s1 - p.s0) * Math.pow(t, 0.75) // kerucut: sempit di knalpot, melebar
        const a = p.a0 * Math.min(1, t / 0.05) * Math.pow(1 - t, 1.35)
        ctx.globalAlpha = a
        const d = s * K
        ctx.drawImage(sprite, p.x * K - d / 2, (p.y + wob) * K - d / 2, d, d)
      }
      ctx.globalAlpha = 1
    }
    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      ctx.clearRect(0, 0, CW, CH)
    }
  }, [originRef])

  return <canvas ref={cv} className="smoke-canvas" width={CW} height={CH} aria-hidden />
}
