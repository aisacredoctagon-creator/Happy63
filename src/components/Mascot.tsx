import { useEffect, useRef } from 'react'
import type { CSSProperties, RefObject } from 'react'
import { IMG } from '../config'
import { PartyHat } from './PartyHat'

/** pose maskot: normal = badan + mata (berkedip), alert = kaget, back = membelakangi kamera (menghadap TV) */
export type MascotPose = 'normal' | 'alert' | 'back'

interface Props {
  /** ukuran kotak sprite (px); badan, alert dan mirrored memakai kotak dan proporsi yang sama (1148x1371) */
  width: number
  height: number
  pose?: MascotPose
  /** kedipan (hanya saat pose normal) */
  blink?: boolean
  /** muat juga bingkai alert dan mirrored (hanya Scene 06 yang memakai pose selain normal) */
  extraPoses?: boolean
  /** clip-path untuk gambar badan (Scene 02: bagian bawah Gasing tertutup kursi) */
  clip?: string
  /** pakai topi (bawaan ya) */
  hat?: boolean
}

/**
 * Posisi layer mata terhadap badan (persen kotak badan 1148x1371): mata-buka.webp dan mata-tutup.webp dipotong dari kanvas
 * 1536x1024 yang sama dengan potongan yang sama, jadi memakai satu transformasi (skala 0,56, putar -6,5 derajat) dan tidak ada
 * lompatan posisi saat bertukar. Pusat kanvas mata ada di (635, 428) pada badan: dinaikkan dan digeser sedikit ke kanan dari
 * pencocokan awal ke wajah badan, supaya sejajar dengan posisi mata aset maskot lama (gasing.png).
 */
const EYES: CSSProperties = {
  left: '36.53%',
  top: '18.84%',
  width: '38.54%',
  transformOrigin: '48.73% 42.44%',
  transform: 'rotate(-6.5deg)',
}

/** kedip: terbuka -> tertutup 80 ms, tertutup 65 ms, tertutup -> terbuka 80 ms (crossfade linear) */
const BLINK_MS = { close: 80, hold: 65, open: 80 }

/** jadwal kedip acak tiap 2-6 detik, sesekali (22%) kedip ganda */
function useBlink(open: RefObject<HTMLImageElement | null>, closed: RefObject<HTMLImageElement | null>, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    let timer = 0
    let dead = false
    const blink = () => {
      const o = open.current
      const c = closed.current
      if (!o || !c || !o.animate) return
      const { close, hold, open: op } = BLINK_MS
      const T = close + hold + op
      const kf = (a: number, b: number): Keyframe[] => [
        { opacity: a, offset: 0 },
        { opacity: b, offset: close / T },
        { opacity: b, offset: (close + hold) / T },
        { opacity: a, offset: 1 },
      ]
      o.animate(kf(1, 0), { duration: T, easing: 'linear' })
      c.animate(kf(0, 1), { duration: T, easing: 'linear' })
    }
    const next = () => {
      timer = window.setTimeout(() => {
        if (dead) return
        blink()
        if (Math.random() < 0.22) {
          timer = window.setTimeout(() => {
            if (dead) return
            blink()
            next()
          }, 300 + Math.random() * 90)
        } else next()
      }, 2000 + Math.random() * 4000)
    }
    next()
    return () => {
      dead = true
      window.clearTimeout(timer)
    }
  }, [open, closed, enabled])
}

/**
 * Maskot Gasing sebagai layer terpisah. Urutan dari belakang ke depan:
 *   1. badan (gasing-badan.webp) atau, saat pose khusus, bingkai utuh alert / mirrored (crossfade 160 ms)
 *   2. topi pesta (selalu menutupi tanduk; kerapatannya ikut pose, lihat PartyHat)
 *   3. mata + alis PALING DEPAN, menimpa topi: mata terbuka + mata tertutup (kedip) saat normal; saat kaget, mata + alis
 *      yang dipotong dari gambar alert (gasing-alert-mata.webp, posisi identik). Pose menghadap TV tidak punya wajah.
 * Dipakai di Scene 01, 02, 05 dan 06 (Scene 04 memakai ilustrasi pesawat+Gasing yang menyatu, hanya topinya).
 */
export function Mascot({ width, height, pose = 'normal', blink = true, extraPoses = false, clip, hat = true }: Props) {
  const normal = pose === 'normal'
  const openEl = useRef<HTMLImageElement>(null)
  const closedEl = useRef<HTMLImageElement>(null)
  useBlink(openEl, closedEl, blink && normal)
  const box: CSSProperties = { width, height }
  const img: CSSProperties = { width, height }
  return (
    <div className="mascot" style={box}>
      <img className="mascot-img" src={IMG.gasingBadan} alt="Gasing" draggable={false} style={{ ...img, clipPath: clip, opacity: normal ? 1 : 0 }} />
      {extraPoses && <img className="mascot-img" src={IMG.gasingAlert} alt="" draggable={false} style={{ ...img, opacity: pose === 'alert' ? 1 : 0 }} />}
      {extraPoses && <img className="mascot-img" src={IMG.gasingMirrored} alt="" draggable={false} style={{ ...img, opacity: pose === 'back' ? 1 : 0 }} />}
      {hat && <PartyHat variant={pose} />}
      <div className="mascot-eyes" style={{ opacity: normal ? 1 : 0 }}>
        <img ref={openEl} className="mascot-eye" src={IMG.mataBuka} alt="" draggable={false} style={EYES} />
        <img ref={closedEl} className="mascot-eye" src={IMG.mataTutup} alt="" draggable={false} style={{ ...EYES, opacity: 0 }} />
      </div>
      {extraPoses && <img className="mascot-img mascot-img-bare" src={IMG.gasingAlertMata} alt="" draggable={false} style={{ ...img, opacity: pose === 'alert' ? 1 : 0 }} />}
    </div>
  )
}
