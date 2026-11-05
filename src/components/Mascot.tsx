import { useRef } from 'react'
import type { CSSProperties } from 'react'
import { IMG } from '../config'
import { PartyHat } from './PartyHat'

/** pose maskot: normal = gasing.png (+ kedip), alert = kaget, back = membelakangi kamera (menghadap TV) */
export type MascotPose = 'normal' | 'alert' | 'back'

interface Props {
  /** ukuran kotak sprite (px); semua bingkai (gasing.png, sleepy, alert, mirrored) memakai kotak dan proporsi yang sama */
  width: number
  height: number
  pose?: MascotPose
  /** kedipan (bingkai mata terpejam di atas gasing.png, crossfade ~110 ms); hanya saat pose normal */
  blink?: boolean
  /** muat juga bingkai alert dan mirrored (hanya Scene 06 yang memakai pose selain normal) */
  extraPoses?: boolean
  /** clip-path untuk semua lapisan gambar (Scene 02: bagian bawah Gasing tertutup kursi) */
  clip?: string
  /** pakai topi (bawaan ya) */
  hat?: boolean
}

/**
 * Maskot Gasing: tumpukan bingkai bertukar dengan crossfade singkat (pose) + kedipan acak + topi pesta yang selalu menutupi
 * tanduk. Dipakai di Scene 01, 02, 05 dan 06 (Scene 04 memakai ilustrasi pesawat+Gasing yang menyatu, hanya topinya).
 */
export function Mascot({ width, height, pose = 'normal', blink = true, extraPoses = false, clip, hat = true }: Props) {
  // tiap instance berkedip pada waktu berbeda (jeda 4,4-5,6 s, fase acak) agar beberapa maskot tidak serempak
  const timing = useRef<CSSProperties>({
    animationDuration: `${(4.4 + Math.random() * 1.2).toFixed(2)}s`,
    animationDelay: `-${(Math.random() * 4).toFixed(2)}s`,
  })
  const box: CSSProperties = { width, height }
  const img: CSSProperties = { width, height, clipPath: clip }
  const normal = pose === 'normal'
  return (
    <div className="mascot" style={box}>
      <img className={`mascot-img ${normal && blink ? 'm-blink-base' : ''}`} src={IMG.gasing} alt="Gasing" draggable={false} style={{ ...img, opacity: normal ? 1 : 0, ...(normal && blink ? timing.current : null) }} />
      {blink && normal && <img className="mascot-img m-blink-eyes" src={IMG.gasingSleepy} alt="" draggable={false} style={{ ...img, ...timing.current }} />}
      {extraPoses && <img className="mascot-img" src={IMG.gasingAlert} alt="" draggable={false} style={{ ...img, opacity: pose === 'alert' ? 1 : 0 }} />}
      {extraPoses && <img className="mascot-img" src={IMG.gasingMirrored} alt="" draggable={false} style={{ ...img, opacity: pose === 'back' ? 1 : 0 }} />}
      {hat && <PartyHat variant={normal ? 'gasing' : pose} />}
    </div>
  )
}
