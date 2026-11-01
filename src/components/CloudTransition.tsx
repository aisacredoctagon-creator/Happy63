import { memo, useEffect, useMemo, useRef } from 'react'
import { animate, motion, useMotionValue, useReducedMotion } from 'framer-motion'
import { CLOUDS, STAGE_H, STAGE_W } from '../config'

/**
 * Transisi awan reusable (awan.png dan awan2.png), satu siklus utuh dalam satu timeline:
 *   awan berlapis masuk dari kanan (parallax: lapisan belakang lambat dan lebih dulu, lapisan depan cepat dan menyusul)
 *   -> layar tertutup penuh -> `onCovered` (di sinilah scene diganti) -> awan memudar perlahan (fade-out sambil
 *   hanyut pelan ke kiri) menampakkan scene baru -> `onDone`.
 * Lapisan awan melebar melewati tepi kanvas, jadi tetap menutup penuh walau jendela tidak 16:9 (ada pita letterbox).
 * Komponen selalu terpasang (gambar awan sudah di-decode sebelum dipakai); animasi dimulai saat `runId` berubah.
 * Hanya memakai transform/opacity. prefers-reduced-motion: diganti fade singkat.
 */
interface Props {
  /** naikkan angka ini untuk memulai satu siklus transisi (0 = diam) */
  runId: number
  /** true selama transisi berlangsung: lapisan menangkap klik (cegah klik ganda) */
  busy: boolean
  onCovered?: () => void
  onDone?: () => void
}

/** durasi total siklus (detik); layar tertutup penuh di COVER_AT, mulai memudar di HOLD_END */
export const CLOUD_TOTAL = 2.6
const COVER_AT = 1.1
const HOLD_END = 1.3

const STRIP_W = 4200
const RAMP = 700 // sisi kiri/kanan strip: tepi awan yang tidak padat
/** bagian kanvas yang bisa tampak di luar 16:9 (pita letterbox): sampai 500 satuan kiri/kanan, 350 atas/bawah */
const PAD_X = 450
const PAD_Y = 300
const STRIP_H = STAGE_H + PAD_Y * 2
const COVER_X = -(RAMP + PAD_X) // posisi strip saat layar tertutup penuh
const OFFSCREEN_X = STAGE_W + PAD_X + 400 // seluruh strip di luar layar sebelum mulai

interface Layer {
  seed: number
  scale: number
  tint: string
  /** kapan lapisan mulai masuk (detik); lapisan belakang lebih lambat dan lebih dulu */
  delayIn: number
  /** lama memudar (detik) dan jarak hanyut ke kiri saat memudar (px) */
  fadeOut: number
  drift: number
}
// hanya 2 lapisan dengan sprite besar dan jarang (total ~35 gambar) agar ringan; tanpa filter CSS
const LAYERS: Layer[] = [
  { seed: 7, scale: 1.35, tint: 'none', delayIn: 0, fadeOut: 1.3, drift: -160 }, // belakang: lambat
  { seed: 21, scale: 1.1, tint: 'none', delayIn: 0.3, fadeOut: 1.0, drift: -400 }, // depan: cepat
]

const EASE_IN_PHASE = [0.2, 0.6, 0.3, 1] as const // melambat saat menutup
const EASE_FADE = [0.4, 0, 0.6, 1] as const // memudar: ease-in-out

function mulberry32(a: number) {
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const smooth = (t: number) => {
  const c = Math.max(0, Math.min(1, t))
  return c * c * (3 - 2 * c)
}

function makeSprites(layer: Layer) {
  const rnd = mulberry32(layer.seed)
  const out: { src: string; x: number; y: number; w: number; flip: boolean }[] = []
  const colStep = 760 * layer.scale
  const rowStep = 420 * layer.scale
  for (let x = -300; x < STRIP_W; x += colStep) {
    const cover = Math.min(smooth((x + 300) / (RAMP + 100)), smooth((STRIP_W - x) / (RAMP + 100)))
    for (let y = -260; y < STRIP_H + 160; y += rowStep) {
      if (cover < 0.999 && rnd() > Math.max(0.15, cover * cover * 1.2)) continue
      out.push({
        src: CLOUDS[Math.floor(rnd() * CLOUDS.length)],
        x: x + (rnd() - 0.5) * 140,
        y: y + (rnd() - 0.5) * 120,
        w: (1150 + rnd() * 350) * layer.scale,
        flip: rnd() < 0.5,
      })
    }
  }
  return out
}

const CloudStrip = memo(function CloudStrip({ layer }: { layer: Layer }) {
  const sprites = useMemo(() => makeSprites(layer), [layer])
  return (
    <div className="cloud-strip-inner" style={{ width: STRIP_W, height: STRIP_H, filter: layer.tint === 'none' ? undefined : layer.tint }}>
      {/* isian di balik awan supaya tidak ada celah tembus saat layar tertutup penuh */}
      <div className="cloud-fill" style={{ left: RAMP + 260, width: STRIP_W - 2 * RAMP - 520 }} />
      {sprites.map((s, i) => (
        <img
          key={i}
          src={s.src}
          alt=""
          draggable={false}
          decoding="async"
          style={{ left: s.x, top: s.y, width: s.w, transform: s.flip ? 'scaleX(-1)' : undefined }}
        />
      ))}
    </div>
  )
})

export function CloudTransition({ runId, busy, onCovered, onDone }: Props) {
  const reduced = useReducedMotion()
  const covered = useRef(onCovered)
  const done = useRef(onDone)
  covered.current = onCovered
  done.current = onDone

  const x0 = useMotionValue(OFFSCREEN_X)
  const x1 = useMotionValue(OFFSCREEN_X)
  const xs = [x0, x1]
  const o0 = useMotionValue(0)
  const o1 = useMotionValue(0)
  const os = [o0, o1]
  const veil = useMotionValue(0)

  useEffect(() => {
    if (runId === 0) return
    const stops: Array<() => void> = []
    if (reduced) {
      const c = animate(veil, [0, 1, 1, 0], { duration: 1.2, times: [0, 0.3, 0.55, 1], ease: 'easeInOut' })
      const t = setTimeout(() => covered.current?.(), 400)
      c.finished.then(() => done.current?.())
      return () => {
        clearTimeout(t)
        c.stop()
      }
    }
    const T = CLOUD_TOTAL
    let finishAt = 0
    LAYERS.forEach((layer, i) => {
      // posisi: masuk dari kanan (melambat), tahan saat tertutup, lalu hanyut pelan ke kiri sambil memudar
      const fadeEnd = Math.min(T, HOLD_END + layer.fadeOut)
      finishAt = Math.max(finishAt, fadeEnd)
      const ctl = animate(xs[i], [OFFSCREEN_X, OFFSCREEN_X, COVER_X, COVER_X, COVER_X + layer.drift], {
        duration: T,
        times: [0, layer.delayIn / T, COVER_AT / T, HOLD_END / T, fadeEnd / T],
        ease: ['linear', EASE_IN_PHASE, 'linear', EASE_FADE],
      })
      const fade = animate(os[i], [1, 1, 0], {
        duration: T,
        times: [0, HOLD_END / T, fadeEnd / T],
        ease: ['linear', EASE_FADE],
      })
      stops.push(() => ctl.stop(), () => fade.stop())
    })
    const doneTimer = setTimeout(() => done.current?.(), finishAt * 1000 + 60)
    // scene diganti tepat ketika layar sudah tertutup penuh
    const t = setTimeout(() => covered.current?.(), ((COVER_AT + HOLD_END) / 2) * 1000)
    stops.push(() => clearTimeout(t), () => clearTimeout(doneTimer))
    return () => stops.forEach((s) => s())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId])

  return (
    <>
      <div className={`cloud-layer ${busy ? '' : 'is-idle'}`} aria-hidden>
        {LAYERS.map((layer, i) => (
          <motion.div key={layer.seed} className="cloud-strip" style={{ x: xs[i], opacity: os[i], top: -PAD_Y }}>
            <CloudStrip layer={layer} />
          </motion.div>
        ))}
        {reduced && <motion.div className="cloud-fade" style={{ opacity: veil }} />}
      </div>
    </>
  )
}
