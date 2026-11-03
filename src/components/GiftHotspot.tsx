import { motion } from 'framer-motion'
import { useState } from 'react'
import { GIFT_SIZE, giftImg } from '../config'
import type { Gift } from '../data/gifts'

/** skala sprite kado (px sumber -> px kanvas); kado tertutup ~ 85 px lebarnya */
const K = 0.285

interface Props {
  gift: Gift
  opened: boolean
  index: number
  disabled?: boolean
  onOpen: (gift: Gift, el: HTMLElement) => void
}

/**
 * Hotspot kado: posisi absolut dalam persen terhadap gambar peta.
 * Giftbox1.png = kado tertutup, Giftbox2.png = kado terbuka (setelah suratnya dibaca).
 */
export function GiftHotspot({ gift, opened, index, disabled, onOpen }: Props) {
  const [hover, setHover] = useState(false)
  const active = hover && !disabled
  const [cw, ch] = GIFT_SIZE[gift.sprite].closed
  const [ow, oh] = GIFT_SIZE[gift.sprite].open
  const w = (opened ? ow : cw) * K
  const h = (opened ? oh : ch) * K
  // alas kotak sama untuk kedua keadaan: kotak tertutup berpusat di titik, kotak terbuka naik ke atas
  const bottom = (ch * K) / 2
  return (
    <div className="gift-spot" style={{ left: `${gift.x}%`, top: `${gift.y}%` }}>
      <div className={`gift-glow ${active ? 'on' : ''}`} />
      <div className={`gift-tip ${active ? 'on' : ''}`}>{gift.name}</div>
      <motion.button
        type="button"
        data-sfx="gift"
        className={`gift-btn ${opened ? 'is-opened' : ''}`}
        aria-label={`Buka kado dari ${gift.name}${opened ? ' (sudah dibuka)' : ''}`}
        disabled={disabled}
        onClick={(e) => onOpen(gift, e.currentTarget)}
        onHoverStart={() => setHover(true)}
        onHoverEnd={() => setHover(false)}
        onFocus={() => setHover(true)}
        onBlur={() => setHover(false)}
        whileHover={{
          scale: 1.15,
          rotate: [0, -5, 5, -3, 3, 0],
          transition: { rotate: { duration: 0.6, repeat: Infinity }, scale: { type: 'spring', stiffness: 400, damping: 14 } },
        }}
        whileTap={{ scale: 0.95 }}
      >
        <span className="gift-float" style={{ animationDelay: `${-index * 0.37}s` }}>
          <motion.img
            key={opened ? 'open' : 'closed'}
            src={giftImg(gift.sprite, opened ? 'open' : 'closed')}
            alt=""
            draggable={false}
            className="gift-img"
            style={{ width: w, height: h, left: -w / 2, top: bottom - h }}
            initial={opened ? { scale: 0.6, y: 8 } : false}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 11 }}
          />
        </span>
      </motion.button>
    </div>
  )
}
