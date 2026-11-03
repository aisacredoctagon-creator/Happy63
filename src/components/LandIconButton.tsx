import { motion } from 'framer-motion'
import { useState } from 'react'

interface Props {
  /** posisi pusat tombol dalam persen terhadap gambar peta */
  x: number
  y: number
  onClick: () => void
}

/**
 * Tombol "Mendarat" versi ikon saja (ikon pesawat) yang ditaruh di peta pada ronde ke-2.
 * Aksesibilitas: aria-label "Mendarat" + tooltip teks (tampil saat hover maupun fokus keyboard).
 */
export function LandIconButton({ x, y, onClick }: Props) {
  const [show, setShow] = useState(false)
  return (
    <div className="land-spot" style={{ left: `${x}%`, top: `${y}%` }}>
      <div id="land-tip" role="tooltip" className={`gift-tip ${show ? 'on' : ''}`}>
        Mendarat
      </div>
      <motion.button
        type="button"
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
        <span className="pill-shine" aria-hidden />
        <svg className="land-icon" width="46" height="46" viewBox="0 0 24 24" aria-hidden>
          <path
            d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"
            fill="#7a3b00"
            transform="rotate(45 12 12)"
          />
        </svg>
      </motion.button>
    </div>
  )
}
