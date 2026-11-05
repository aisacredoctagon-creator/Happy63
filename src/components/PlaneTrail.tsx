import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'

interface Props {
  /** titik knalpot: elemen penanda di dalam pesawat (dibaca tiap frame, jadi ikut gerak/skala/rotasi pesawat) */
  originRef: RefObject<HTMLElement | null>
  /** kecepatan aliran jejak relatif terhadap layar (px kanvas 1920x1080 per detik), arah ke kiri */
  flow: number
  /** skala ukuran (1 = pesawat selebar ~870 px) */
  size: number
  emitting?: boolean
}

/** resolusi kanvas = 2/3 kanvas panggung (fill-rate ringan) */
const CW = 1280
const CH = 720
const K = CW / 1920
/** satu titik per 33 ms; umur jejak 3 s -> maksimal 91 titik (batas tetap, ring buffer) */
const DT = 0.033
const LIFE = 3
const MAXN = 100

interface Sample {
  x: number
  y: number
  t: number
}

/**
 * Jejak pesawat (Scene 03 dan 04): satu garis putih tapered yang wavy. Sempit di knalpot, melebar dan memudar seiring jarak,
 * dengan gelombang halus yang merambat ke belakang. Titik-titik jejak "tertinggal" di dunia (ditambah aliran ke kiri), jadi
 * jejak mengikuti lintasan dan arah pesawat (mis. melengkung saat lepas landas di Scene 04).
 * Kanvas 2D ringan: ring buffer 100 titik; pita digambar opak sebagai satu poligon lalu dipudarkan dengan gradien dari
 * knalpot ke ujung jejak. Loop berhenti dan kanvas dibersihkan saat komponen dilepas (scene berganti).
 */
export function PlaneTrail({ originRef, flow, size, emitting = true }: Props) {
  const cv = useRef<HTMLCanvasElement>(null)
  const live = useRef({ flow, size, emitting })
  live.current = { flow, size, emitting }

  useEffect(() => {
    const canvas = cv.current
    const ctx = canvas?.getContext('2d')
    const off = document.createElement('canvas')
    off.width = CW
    off.height = CH
    const octx = off.getContext('2d')
    if (!canvas || !ctx || !octx) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const ring: Sample[] = []
    let raf = 0
    let last = performance.now()
    let t = 0
    let acc = 0
    let ox = 0
    let oy = 0
    let have = false

    // posisi jejak pada umur `age`: posisi lahir + aliran ke kiri (melambat sedikit)
    const flowOffset = (age: number, fl: number) => fl * (age - 0.05 * age * age)

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      if (dt <= 0) return
      t += dt
      const m = originRef.current
      if (m) {
        const mr = m.getBoundingClientRect()
        const cr = canvas.getBoundingClientRect()
        if (cr.width > 0) {
          const k = 1920 / cr.width
          ox = (mr.left + mr.width / 2 - cr.left) * k
          oy = (mr.top + mr.height / 2 - cr.top) * k
          have = true
        }
      }
      const L = live.current
      const sz = L.size
      if (have && L.emitting) {
        acc += dt
        while (acc >= DT) {
          acc -= DT
          ring.unshift({ x: ox, y: oy, t })
          if (ring.length > MAXN) ring.pop()
        }
      }
      while (ring.length && t - ring[ring.length - 1].t > LIFE) ring.pop()

      ctx.setTransform(K, 0, 0, K, 0, 0) // gambar dalam koordinat panggung 1920x1080
      ctx.clearRect(0, 0, 1920, 1080)
      if (!have || !ring.length) return
      // titik kepala = posisi knalpot sekarang (supaya tidak tertinggal selangkah)
      const pts: { x: number; y: number; age: number }[] = [{ x: ox, y: oy, age: 0 }]
      for (const s of ring) {
        const age = t - s.t
        pts.push({ x: s.x - flowOffset(age, L.flow), y: s.y, age })
      }
      const n = pts.length
      // normal tiap titik dari tangen (beda titik tetangga)
      const nx = new Float32Array(n)
      const ny = new Float32Array(n)
      for (let i = 0; i < n; i++) {
        const a = pts[Math.max(0, i - 1)]
        const b = pts[Math.min(n - 1, i + 1)]
        let tx = a.x - b.x
        let ty = a.y - b.y
        const len = Math.hypot(tx, ty) || 1
        tx /= len
        ty /= len
        nx[i] = -ty
        ny[i] = tx
      }
      octx.setTransform(K, 0, 0, K, 0, 0)
      octx.clearRect(0, 0, 1920, 1080)
      octx.fillStyle = '#fff'
      const lx = new Float32Array(n)
      const ly = new Float32Array(n)
      const rx = new Float32Array(n)
      const ry = new Float32Array(n)
      for (let i = 0; i < n; i++) {
        const p = pts[i]
        const u = Math.min(1, p.age / LIFE) // 0 di knalpot -> 1 ujung jejak
        // gelombang merambat ke belakang, membesar menjauhi knalpot
        const amp = 16 * sz * Math.min(1, u * 2.2) * (0.6 + 0.8 * u)
        const off2 = Math.sin(p.age * 5.2 - t * 2.1) * amp
        const cx = p.x + nx[i] * off2
        const cy = p.y + ny[i] * off2
        // lebar: sempit di knalpot (5 px), melebar menjauh (48 px)
        const hw = ((5 + 43 * Math.pow(u, 0.75)) * sz) / 2
        lx[i] = cx + nx[i] * hw
        ly[i] = cy + ny[i] * hw
        rx[i] = cx - nx[i] * hw
        ry[i] = cy - ny[i] * hw
      }
      octx.beginPath()
      octx.moveTo(lx[0], ly[0])
      for (let i = 1; i < n; i++) octx.lineTo(lx[i], ly[i])
      for (let i = n - 1; i >= 0; i--) octx.lineTo(rx[i], ry[i])
      octx.closePath()
      octx.fill()
      // pudar dari knalpot ke ujung jejak
      const hx = pts[0].x
      const tx = pts[n - 1].x
      if (hx - tx > 4) {
        const g = octx.createLinearGradient(hx, 0, tx, 0)
        g.addColorStop(0, 'rgba(255,255,255,1)')
        g.addColorStop(0.5, 'rgba(255,255,255,0.88)')
        g.addColorStop(0.85, 'rgba(255,255,255,0.35)')
        g.addColorStop(1, 'rgba(255,255,255,0)')
        octx.globalCompositeOperation = 'destination-in'
        octx.fillStyle = g
        octx.fillRect(0, 0, 1920, 1080)
        octx.globalCompositeOperation = 'source-over'
        ctx.drawImage(off, 0, 0, CW, CH, 0, 0, 1920, 1080)
      }
    }
    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, CW, CH)
    }
  }, [originRef])

  return <canvas ref={cv} className="trail-canvas" width={CW} height={CH} aria-hidden />
}
