import { useEffect, useRef, useState } from 'react'
import { animate, motion, useMotionValue, useReducedMotion } from 'framer-motion'
import { audio } from '../audio/audio'
import { CLOUDS, IMG, STAGE_H, STAGE_W } from '../config'
import { stageScale } from './Stage'

/**
 * Transisi awan reusable, satu siklus utuh dalam satu timeline:
 *   satu gambar awan lebar (transisi.webp) masuk dari kanan, sementara 2 awan (awan.png dan awan2.png) menyapu dari kiri
 *   ke kanan -> layar tertutup penuh -> `onCovered` (di sinilah scene diganti) -> awan besar memudar perlahan (sambil
 *   hanyut pelan ke kiri) menampakkan scene baru, 2 awan kecil menyelesaikan sapuannya keluar di kanan -> `onDone`.
 * Gambar besar punya inti padat di tengah (25%-75% lebarnya, penuh dari atas ke bawah) dan tepi kiri/kanan transparan lembut.
 * Ukurannya dihitung dari ukuran jendela (melewati tepi kanvas bila perlu), jadi inti padat selalu menutup layar penuh di
 * rasio apa pun: desktop, pita letterbox, mobile landscape, jendela sangat tinggi.
 * Gambar hanya dipasang saat `busy` (hemat memori). Saat `runId` berubah, semua gambar dipastikan sudah ter-decode LEBIH DULU;
 * baru setelah itu timeline dimulai (tidak ada decode/raster saat bergerak). Hanya memakai transform/opacity.
 * prefers-reduced-motion: diganti fade singkat.
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
/** lama awan besar memudar (detik) dan jarak hanyutnya ke kiri saat memudar (px kanvas) */
const FADE_OUT = 1.2
const DRIFT = -360

/** gambar awan besar: rasio dan bagian tengah yang padat penuh (lihat analisis alpha: 25%-75% lebar, tinggi penuh) */
const BIG_ASPECT = 2000 / 669
const SOLID_FRAC = 0.5
/** sisa aman di dalam zona padat, di tiap sisi area yang terlihat */
const MARGIN = 160

/**
 * Geometri dihitung dari ukuran jendela sebenarnya: bagian kanvas yang terlihat (dalam satuan kanvas) bisa lebih
 * lebar/tinggi dari 1920x1080 (pita letterbox, jendela sangat lebar atau tinggi, mobile landscape).
 */
interface Geometry {
  /** tepi kiri dan kanan area yang terlihat, sisa tepi atas/bawah (satuan kanvas) */
  padX: number
  padY: number
  /** gambar awan besar */
  bigW: number
  bigH: number
  bigTop: number
  coverX: number // posisi saat layar tertutup penuh (gambar berpusat di kanvas)
  offscreenX: number // seluruhnya di luar layar sebelum mulai
}
function computeGeometry(): Geometry {
  const s = stageScale(window.innerWidth, window.innerHeight)
  const padX = Math.max(0, (window.innerWidth / s - STAGE_W) / 2)
  const padY = Math.max(0, (window.innerHeight / s - STAGE_H) / 2)
  const visW = STAGE_W + 2 * padX
  const visH = STAGE_H + 2 * padY
  // inti padat harus menutup lebar DAN tinggi area yang terlihat (+ sisa aman)
  const bigH = Math.ceil(Math.max(visH + 2 * MARGIN, (visW + 2 * MARGIN) / (BIG_ASPECT * SOLID_FRAC)))
  const bigW = Math.ceil(bigH * BIG_ASPECT)
  return {
    padX,
    padY,
    bigW,
    bigH,
    bigTop: Math.round(STAGE_H / 2 - bigH / 2),
    coverX: Math.round(STAGE_W / 2 - bigW / 2),
    offscreenX: Math.ceil(STAGE_W + padX + 100),
  }
}
function useGeometry() {
  const [g, setG] = useState(computeGeometry)
  useEffect(() => {
    const on = () =>
      setG((prev) => {
        const n = computeGeometry()
        return n.bigW === prev.bigW && n.bigH === prev.bigH && n.padX === prev.padX && n.padY === prev.padY ? prev : n
      })
    window.addEventListener('resize', on)
    window.addEventListener('orientationchange', on)
    return () => {
      window.removeEventListener('resize', on)
      window.removeEventListener('orientationchange', on)
    }
  }, [])
  return g
}

/**
 * 2 awan yang menyapu dari kiri ke kanan (berlawanan arah dengan awan besar) agar transisi terasa lebih hidup.
 * `top` dan `width` dalam satuan kanvas; `delay`/`dur` dalam detik (delay + dur <= CLOUD_TOTAL supaya sudah keluar saat selesai).
 */
interface Sweeper {
  src: string
  width: number
  top: number
  delay: number
  dur: number
  flip: boolean
}
const SWEEPERS: Sweeper[] = [
  { src: CLOUDS[0], width: 1250, top: 40, delay: 0, dur: 2.4, flip: false }, // atas, besar, lebih lambat
  { src: CLOUDS[1], width: 1000, top: 560, delay: 0.15, dur: 2.2, flip: true }, // bawah, lebih kecil dan cepat
]

const EASE_IN_PHASE = [0.2, 0.6, 0.3, 1] as const // melambat saat menutup
const EASE_FADE = [0.4, 0, 0.6, 1] as const // memudar: ease-in-out
const EASE_SWEEP = [0.35, 0.15, 0.6, 0.9] as const // sapuan halus, tidak berhenti mendadak

const loaded = new Map<string, HTMLImageElement>()
/** muat + decode semua gambar transisi; tahan referensinya agar bitmap tidak dibuang antar transisi */
export function loadCloudImages(): Promise<void> {
  return Promise.all(
    [IMG.transisi, ...CLOUDS].map(async (src) => {
      if (loaded.has(src)) return
      const img = new Image()
      img.src = src
      try {
        await img.decode()
      } catch {
        /* gagal: gambar itu muncul apa adanya saat selesai dimuat */
      }
      loaded.set(src, img)
    }),
  ).then(() => undefined)
}

export function CloudTransition({ runId, busy, onCovered, onDone }: Props) {
  const reduced = useReducedMotion()
  const covered = useRef(onCovered)
  const done = useRef(onDone)
  covered.current = onCovered
  done.current = onDone

  const geo = useGeometry()
  const geoRef = useRef(geo)
  geoRef.current = geo
  const bigX = useMotionValue(geo.offscreenX)
  const bigO = useMotionValue(0)
  const sweepX0 = useMotionValue(-4000)
  const sweepX1 = useMotionValue(-4000)
  const sweepX = [sweepX0, sweepX1]
  const veil = useMotionValue(0)

  useEffect(() => {
    if (runId === 0) return
    const stops: Array<() => void> = []
    if (reduced) {
      audio.playSfx('cloudSoft', { delay: 0.3 })
      const c = animate(veil, [0, 1, 1, 0], { duration: 1.2, times: [0, 0.3, 0.55, 1], ease: 'easeInOut' })
      const t = setTimeout(() => covered.current?.(), 400)
      c.finished.then(() => done.current?.())
      return () => {
        clearTimeout(t)
        c.stop()
      }
    }
    let cancelled = false
    stops.push(() => (cancelled = true))
    // gambar di-decode dulu (batas tunggu 2 dtk supaya tidak menggantung), baru timeline dimulai
    const ready = Promise.race([loadCloudImages(), new Promise<void>((r) => setTimeout(r, 2000))])
    void ready.then(() => {
      if (cancelled) return
      // suara awan dijadwalkan pada jam audio, sinkron dengan timeline: masuk (0-1,1 s), tertutup (1,1 s)
      audio.playSfx('cloudWhoosh')
      audio.playSfx('cloudSoft', { delay: COVER_AT })
      stops.push(runTimeline())
    })
    return () => stops.forEach((s) => s())

    function runTimeline() {
      const stops: Array<() => void> = []
      const T = CLOUD_TOTAL
      const { offscreenX, coverX, padX } = geoRef.current

      // awan besar: masuk dari kanan (melambat), tahan saat tertutup, lalu hanyut pelan ke kiri sambil memudar
      const fadeEnd = Math.min(T, HOLD_END + FADE_OUT)
      let finishAt = fadeEnd
      const move = animate(bigX, [offscreenX, coverX, coverX, coverX + DRIFT], {
        duration: T,
        times: [0, COVER_AT / T, HOLD_END / T, fadeEnd / T],
        ease: [EASE_IN_PHASE, 'linear', EASE_FADE],
      })
      const fade = animate(bigO, [1, 1, 0], {
        duration: T,
        times: [0, HOLD_END / T, fadeEnd / T],
        ease: ['linear', EASE_FADE],
      })
      stops.push(() => move.stop(), () => fade.stop())

      // 2 awan dari kiri: mulai di luar tepi kiri, menyapu melewati layar, keluar di tepi kanan
      SWEEPERS.forEach((sw, i) => {
        const from = -(padX + sw.width + 120)
        const to = STAGE_W + padX + 120
        finishAt = Math.max(finishAt, sw.delay + sw.dur)
        const sweep = animate(sweepX[i], [from, from, to], {
          duration: sw.delay + sw.dur,
          times: [0, sw.delay / (sw.delay + sw.dur), 1],
          ease: ['linear', EASE_SWEEP],
        })
        stops.push(() => sweep.stop())
      })

      const doneTimer = setTimeout(() => done.current?.(), finishAt * 1000 + 60)
      // scene diganti tepat ketika layar sudah tertutup penuh
      const t = setTimeout(() => covered.current?.(), ((COVER_AT + HOLD_END) / 2) * 1000)
      stops.push(() => clearTimeout(t), () => clearTimeout(doneTimer))
      return () => stops.forEach((s) => s())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId])

  return (
    <div className={`cloud-layer ${busy ? '' : 'is-idle'}`} aria-hidden>
      {/* gambar hanya dipasang selama transisi; saat diam dibuang agar memori GPU lega */}
      {busy && !reduced && (
        <>
          <motion.img
            className="cloud-big"
            src={IMG.transisi}
            alt=""
            draggable={false}
            style={{ x: bigX, opacity: bigO, top: geo.bigTop, width: geo.bigW, height: geo.bigH }}
          />
          {SWEEPERS.map((sw, i) => (
            <motion.img
              key={sw.src}
              className="cloud-sweep"
              src={sw.src}
              alt=""
              draggable={false}
              style={{ x: sweepX[i], top: sw.top, width: sw.width, scaleX: sw.flip ? -1 : 1 }}
            />
          ))}
        </>
      )}
      {reduced && <motion.div className="cloud-fade" style={{ opacity: veil }} />}
    </div>
  )
}
