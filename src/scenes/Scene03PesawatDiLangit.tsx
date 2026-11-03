// Scene 03 - Pesawat di Langit
// 03a Pesawat Masuk (0,3-1,7 s) -> 03b Pesawat Melayang (sampai 5,6 s) -> 03c Awan Menutup ke Peta (CloudTransition, 2,6 s)
import { motion } from 'framer-motion'
import { useState } from 'react'
import { useLoop } from '../audio/audio'
import { DriftClouds, SpeedLines } from '../components/Atmosphere'
import { EdgeExtend } from '../components/EdgeExtend'
import { IMG, SKY, SPRITE, STAGE_H, STAGE_W } from '../config'
import { useSceneTag } from '../dev/sceneTag'
import { useSequence } from '../hooks/useSequence'

const P = SPRITE.scene2Plane
const pos = {
  left: `${(P.x / SKY.srcW) * 100}%`,
  top: `${(P.y / SKY.srcH) * 100}%`,
  width: `${(P.width / SKY.srcW) * 100}%`,
  height: `${(P.height / SKY.srcH) * 100}%`,
}

interface Props {
  /** dipanggil saat awan harus masuk (03c, transisi ke Scene 04) */
  onDone: () => void
}

/** Scene 03 - Pesawat di Langit: pesawat melayang di langit; awan besar lalu menutup layar (CloudTransition di App). */
export function Scene03PesawatDiLangit({ onDone }: Props) {
  useSceneTag('03')
  // angin fade out halus selama transisi awan (bukan setelah scene hilang)
  const [leaving, setLeaving] = useState(false)
  useLoop('wind', { enabled: !leaving, fadeIn: 1.8, fadeOut: 2 })
  useSequence(async (seq) => {
    seq.sfx('planeFlyby', { delay: 0.3 }) // 03a Pesawat Masuk (animasi mulai di 0,3 s)
    await seq.wait(5.6) // 03b Pesawat Melayang
    if (seq.dead) return
    setLeaving(true)
    onDone() // 03c Awan Menutup ke Peta
  }, [])

  return (
    <div className="scene scene03">
      <motion.div
        className="fill"
        initial={{ scale: 1.12 }}
        animate={{ scale: 1 }}
        transition={{ duration: 2.8, ease: [0.22, 1, 0.36, 1] }}
      >
        <img className="fill-img" src={IMG.langitBg} alt="Langit biru dengan awan" draggable={false} />
        <EdgeExtend src={IMG.langitBg} w={STAGE_W} h={STAGE_H} />
        <DriftClouds yMin={60} yMax={300} count={4} opacity={0.95} speed={26} size={[320, 520]} />
        <SpeedLines yMin={330} yMax={680} count={14} />
        {/* TODO: ganti dengan sprite pesawat terpisah (PNG transparan) */}
        <motion.div
          className="abs"
          style={pos}
          initial={{ opacity: 0, x: -140, scale: 0.94 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
        >
          <div className="plane2-idle">
            <img src={IMG.pesawatLangit} alt="Pesawat terbang" draggable={false} className="fill-img" />
          </div>
        </motion.div>
        <SpeedLines yMin={430} yMax={660} count={7} />
        <DriftClouds yMin={760} yMax={940} count={3} opacity={0.95} speed={18} size={[520, 760]} />
      </motion.div>
    </div>
  )
}
