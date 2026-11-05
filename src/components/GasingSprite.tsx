import { motion } from 'framer-motion'
import type { MotionValue } from 'framer-motion'
import { useEffect } from 'react'
import { audio } from '../audio/audio'
import type { SfxName } from '../audio/audio'
import { IMG } from '../config'
import { Mascot } from './Mascot'
import type { MascotPose } from './Mascot'

/** 'turn': badan berputar (squash singkat) saat berganti pose menghadap TV */
export type GasingState = 'idle' | 'walk' | 'ready' | 'pop' | 'turn'

interface Props {
  src: string
  /** ukuran tampil (px dunia) */
  width: number
  height: number
  /** MotionValue posisi telapak (tengah-bawah) dalam koordinat dunia */
  x: MotionValue<number>
  y: MotionValue<number>
  state: GasingState
  /** bunyi saat state 'pop' (bawaan: boing) */
  popSfx?: SfxName
  /** bingkai tubuh: normal (badan Glossy + mata berkedip), alert (kaget), back (menghadap TV). Selain normal hanya dipakai Scene 06. */
  pose?: MascotPose
  /** muat bingkai alert/mirrored sejak awal (Scene 06) */
  extraPoses?: boolean
}

/** satu hentakan langkah per siklus gWalk (0,46 s di index.css) */
const STEP_MS = 460

/**
 * Gasing sebagai sprite terpisah: bobbing/jalan, bayangan di lantai, dan pantulan.
 * Suara mengikuti state: langkah tiap siklus jalan, boing saat 'pop'.
 * TODO: ganti `src` dengan sprite Gasing final (PNG transparan) bila sudah tersedia.
 */
export function GasingSprite({ src, width, height, x, y, state, popSfx = 'boing', pose = 'normal', extraPoses = false }: Props) {
  const reflSrc = pose === 'alert' ? IMG.gasingAlert : pose === 'back' ? IMG.gasingMirrored : src
  useEffect(() => {
    if (state === 'walk') {
      const id = setInterval(() => audio.playSfx('step', { scope: 'scene' }), STEP_MS)
      return () => clearInterval(id)
    }
    const once: SfxName | null = state === 'pop' ? popSfx : null
    if (!once) return
    const id = setTimeout(() => audio.playSfx(once, { scope: 'scene' }), 40)
    return () => clearTimeout(id)
  }, [state, popSfx])

  return (
    <motion.div className="gasing" style={{ x, y }}>
      <div className="g-shadow" style={{ width: width * 0.78, left: -width * 0.39 }}>
        <i className={`g-shadow-i g-s-${state}`} />
      </div>
      <div className="g-refl" style={{ width, height: height * 0.5, left: -width / 2 }} aria-hidden>
        <img src={reflSrc} alt="" draggable={false} style={{ width, height }} />
      </div>
      <div className={`g-body g-${state}`} style={{ width, height, left: -width / 2, top: -height }}>
        <Mascot width={width} height={height} pose={pose} extraPoses={extraPoses} />
      </div>
    </motion.div>
  )
}
