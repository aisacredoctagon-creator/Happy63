import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { audio } from '../audio/audio'
import { LETTER_TITLE } from '../data/gifts'
import type { Gift } from '../data/gifts'

function Envelope({ color }: { color: string }) {
  return (
    <svg width="96" height="68" viewBox="0 0 96 68" aria-hidden>
      <rect x="3" y="6" width="90" height="58" rx="8" fill="#fff" stroke="#e7cf9b" strokeWidth="3" />
      <path d="M5 12 L48 42 L91 12" fill="#fbe9bd" stroke="#e7cf9b" strokeWidth="3" strokeLinejoin="round" />
      <path d="M5 62 L36 34 M91 62 L60 34" stroke="#e7cf9b" strokeWidth="3" strokeLinecap="round" fill="none" />
      <circle cx="48" cy="41" r="11" fill={color} stroke="#fff" strokeWidth="3" />
      <path d="M48 46 C41 41 42 36 45 36 C47 36 48 38 48 38 C48 38 49 36 51 36 C54 36 55 41 48 46 Z" fill="#fff" />
    </svg>
  )
}

interface Props {
  gift: Gift | null
  onClose: () => void
}

/** Surat/kartu di tengah atas layar. Tutup: tombol X, klik di luar kartu, atau tombol Esc. */
export function LetterModal({ gift, onClose }: Props) {
  // suara surat jatuh dan menutup, apa pun cara menutupnya (X, klik latar, Esc)
  const prev = useRef<Gift | null>(null)
  useEffect(() => {
    if (gift && !prev.current) audio.playSfx('paperDrop', { delay: 0.05 })
    else if (!gift && prev.current) audio.playSfx('paperClose')
    prev.current = gift
  }, [gift])

  useEffect(() => {
    if (!gift) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [gift, onClose])

  return (
    <AnimatePresence>
      {gift && (
        <motion.div
          key="letter-backdrop"
          className="letter-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={onClose}
        >
          <motion.article
            key={gift.id}
            className="letter"
            role="dialog"
            aria-modal="true"
            aria-label={`${LETTER_TITLE} dari ${gift.name}`}
            initial={{ y: -220, opacity: 0, scale: 0.92, rotate: -2 }}
            animate={{ y: 0, opacity: 1, scale: 1, rotate: 0 }}
            exit={{ y: -140, opacity: 0, scale: 0.94, transition: { duration: 0.22 } }}
            transition={{ type: 'spring', stiffness: 260, damping: 15, mass: 0.9 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="letter-envelope">
              <Envelope color={gift.color} />
            </div>
            <button type="button" data-sfx="none" className="letter-close" onClick={onClose} aria-label="Tutup surat">
              <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden>
                <path d="M6 6 L20 20 M20 6 L6 20" stroke="#fff" strokeWidth="4.2" strokeLinecap="round" />
              </svg>
            </button>
            <h2 className="letter-title">{LETTER_TITLE}</h2>
            <div className="letter-chip" style={{ background: gift.color }}>
              {gift.name}
            </div>
            <div className={`letter-body ${gift.letter.length > 900 ? 'is-long' : ''}`} tabIndex={0}>
              {gift.letter.split('\n\n').map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </motion.article>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
