import { motion } from 'framer-motion'
import type { MotionValue } from 'framer-motion'

export type GasingState = 'idle' | 'walk' | 'ready' | 'pop'

interface Props {
  src: string
  /** ukuran tampil (px dunia) */
  width: number
  height: number
  /** MotionValue posisi telapak (tengah-bawah) dalam koordinat dunia */
  x: MotionValue<number>
  y: MotionValue<number>
  state: GasingState
}

/**
 * Gasing sebagai sprite terpisah: bobbing/jalan, bayangan di lantai, dan pantulan.
 * TODO: ganti `src` dengan sprite Gasing final (PNG transparan) bila sudah tersedia.
 */
export function GasingSprite({ src, width, height, x, y, state }: Props) {
  return (
    <motion.div className="gasing" style={{ x, y }}>
      <div className="g-shadow" style={{ width: width * 0.78, left: -width * 0.39 }}>
        <i className={`g-shadow-i g-s-${state}`} />
      </div>
      <div className="g-refl" style={{ width, height: height * 0.5, left: -width / 2 }} aria-hidden>
        <img src={src} alt="" draggable={false} style={{ width, height }} />
      </div>
      <div className={`g-body g-${state}`} style={{ width, height, left: -width / 2, top: -height }}>
        <img src={src} alt="Gasing" draggable={false} style={{ width, height }} />
      </div>
    </motion.div>
  )
}
