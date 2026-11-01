import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  onClick?: () => void
  /** sun = kuning hangat, sky = biru langit */
  tone?: 'sun' | 'sky'
  /** animasi pop saat muncul + denyut pelan */
  pulse?: boolean
  /** jeda sebelum animasi muncul (detik) */
  delay?: number
  disabled?: boolean
  className?: string
}

/** Tombol pill bulat dengan outline putih tebal dan bayangan lembut (gaya sama untuk semua tombol utama). */
export function PrimaryButton({ children, onClick, tone = 'sun', pulse = false, delay = 0, disabled, className = '' }: Props) {
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0, y: -24 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.6, opacity: 0, y: -16 }}
      transition={{ type: 'spring', stiffness: 380, damping: 15, delay }}
      className={`pill-wrap ${pulse ? 'pill-wrap-pulse' : ''}`}
      style={{ display: 'inline-block' }}
    >
      <motion.button
        type="button"
        className={`pill-btn pill-${tone} ${className}`}
        onClick={onClick}
        disabled={disabled}
        whileHover={{ scale: 1.07 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 400, damping: 18 }}
      >
        <span className="pill-shine" aria-hidden />
        <span className="pill-label">{children}</span>
      </motion.button>
    </motion.div>
  )
}
