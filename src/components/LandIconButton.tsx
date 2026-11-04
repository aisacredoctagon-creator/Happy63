import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { audio } from '../audio/audio'
import { IMG } from '../config'

interface Props {
  /** posisi pusat tombol dalam persen terhadap gambar peta */
  x: number
  y: number
  onClick: () => void
}

/**
 * Tombol "Mendarat" versi gambar saja (Button Mendarat.png) yang ditaruh di peta pada ronde ke-2.
 * Aksesibilitas: aria-label "Mendarat" + tooltip teks (tampil saat hover maupun fokus keyboard).
 */
export function LandIconButton({ x, y, onClick }: Props) {
  const [show, setShow] = useState(false)
  // sama seperti tombol teks "Mendarat": muncul dengan SFX reward, dan bersuara saat di-hover (data-sfx-hover)
  useEffect(() => {
    const t = setTimeout(() => audio.playSfx('reward'), 80)
    return () => clearTimeout(t)
  }, [])
  return (
    <div className="land-spot" style={{ left: `${x}%`, top: `${y}%` }}>
      <div id="land-tip" role="tooltip" className={`gift-tip ${show ? 'on' : ''}`}>
        Mendarat
      </div>
      <motion.button
        type="button"
        data-sfx-hover="hover"
        className="land-btn"
        aria-label="Mendarat"
        aria-describedby="land-tip"
        onClick={onClick}
        onHoverStart={() => setShow(true)}
        onHoverEnd={() => setShow(false)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.94 }}
        transition={{ type: 'spring', stiffness: 380, damping: 15 }}
      >
        <img className="land-img" src={IMG.btnMendarat} alt="" draggable={false} />
      </motion.button>
    </div>
  )
}
