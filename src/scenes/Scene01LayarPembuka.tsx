// Scene 01 - Layar Pembuka
// 01a Gasing Berpatroli (PatrollingGasing, selama loading) -> 01b Tombol Mulai (muncul setelah aset siap)
import { AnimatePresence, motion } from 'framer-motion'
import { PrimaryButton } from '../components/PrimaryButton'
import { IMG } from '../config'
import { PartyHat } from '../components/PartyHat'
import { useSceneTag } from '../dev/sceneTag'

/** 01a: Gasing berjalan-jalan (patrol kiri-kanan, berbalik arah di ujung) selagi loading. */
function PatrollingGasing() {
  return (
    <div className="patrol-lane" aria-hidden>
      <div className="patrol">
        <div className="patrol-flip">
          <div className="patrol-shadow" />
          <div className="patrol-hop">
            <img src={IMG.gasing} alt="" draggable={false} />
            <PartyHat />
          </div>
        </div>
      </div>
    </div>
  )
}

/** penanda scene aktif (debug dev) selama layar ini tampil */
function SceneTag() {
  useSceneTag('01')
  return null
}

interface Props {
  progress: number
  ready: boolean
  visible: boolean
  onStart: () => void
}

export function Scene01LayarPembuka({ progress, ready, visible, onStart }: Props) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div className="loading" exit={{ opacity: 0 }} transition={{ duration: 0.8 }}>
          <SceneTag />
          <PatrollingGasing />
          <h1 className="loading-title">Suatu Hari disebuah Pesawat</h1>
          <p className="loading-sub">Gasing mau kemana yaa?</p>
          <div className="loading-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
            <motion.i animate={{ scaleX: progress }} initial={{ scaleX: 0 }} transition={{ ease: 'easeOut', duration: 0.3 }} />
          </div>
          {/* 01b: tombol mulai (pop saat aset siap, memicu SFX "start") */}
          <div className="loading-cta">{ready ? <PrimaryButton pulse sfx="start" appear="none" onClick={onStart}>Mulai Perjalanan</PrimaryButton> : <span className="loading-pct">{Math.round(progress * 100)}%</span>}</div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
