import { AnimatePresence, motion } from 'framer-motion'
import { IMG } from '../config'
import { PrimaryButton } from './PrimaryButton'

/** Gasing berjalan-jalan (patrol kiri-kanan, berbalik arah di ujung) selagi loading. */
function PatrollingGasing() {
  return (
    <div className="patrol-lane" aria-hidden>
      <div className="patrol">
        <div className="patrol-flip">
          <div className="patrol-shadow" />
          <div className="patrol-hop">
            <img src={IMG.gasing} alt="" draggable={false} />
          </div>
        </div>
      </div>
    </div>
  )
}

interface Props {
  progress: number
  ready: boolean
  visible: boolean
  onStart: () => void
}

export function LoadingScreen({ progress, ready, visible, onStart }: Props) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div className="loading" exit={{ opacity: 0 }} transition={{ duration: 0.8 }}>
          <PatrollingGasing />
          <h1 className="loading-title">Suatu Hari disebuah Pesawat</h1>
          <p className="loading-sub">Gasing mau kemana yaa?</p>
          <div className="loading-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
            <motion.i animate={{ scaleX: progress }} initial={{ scaleX: 0 }} transition={{ ease: 'easeOut', duration: 0.3 }} />
          </div>
          <div className="loading-cta">{ready ? <PrimaryButton pulse onClick={onStart}>Mulai Perjalanan</PrimaryButton> : <span className="loading-pct">{Math.round(progress * 100)}%</span>}</div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
