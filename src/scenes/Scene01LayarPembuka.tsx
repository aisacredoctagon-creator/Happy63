// Scene 01 - Layar Pembuka
// 01a Gasing Berpatroli (PatrollingGasing, selama loading) -> 01b Tombol Mulai (muncul setelah aset siap)
import { AnimatePresence, motion, useIsPresent } from 'framer-motion'
import { audio } from '../audio/audio'
import { PrimaryButton } from '../components/PrimaryButton'
import { Mascot } from '../components/Mascot'
import { useSceneTag } from '../dev/sceneTag'

/**
 * 01a: Gasing berjalan-jalan (patrol kiri-kanan, berbalik arah di ujung) selagi loading.
 * Bunyi langkah (SFX minor `step`, variasi +/-5%) satu per langkah: dipicu tepat saat satu siklus lompat-kecil (patrolHop, 0,5 s)
 * selesai, yaitu saat kaki menapak. Berhenti seketika begitu layar pembuka mulai keluar (klik Mulai atau scene berganti); bila
 * animasi mati (prefers-reduced-motion) tidak ada siklus, jadi tidak ada bunyi.
 */
function PatrollingGasing() {
  const present = useIsPresent()
  return (
    <div className="patrol-lane" aria-hidden>
      <div className="patrol">
        <div className="patrol-flip">
          <div className="patrol-shadow" />
          <div className="patrol-hop" onAnimationIteration={(e) => present && e.target === e.currentTarget && audio.playSfx('step', { scope: 'scene' })}>
            <Mascot width={200} height={239} />
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
          <h1 className="loading-title">Suatu Hari di sebuah Pesawat...</h1>
          <p className="loading-sub">Gasing mau ke mana ya?</p>
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
