import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { CSSProperties } from 'react'
import { LETTER_TITLE } from '../data/gifts'
import type { Gift } from '../data/gifts'
import { ENVELOPE_HEART, ENVELOPE_PASTEL, pastel } from '../data/pastel'

/** Warna amplop lewat CSS variable (--env-*), diturunkan dari warna kado dalam versi pastel. */
function envelopeVars(gift: Gift): CSSProperties {
  const base = gift.envelope ?? gift.color
  return {
    '--env-body': pastel(base, ENVELOPE_PASTEL.body),
    '--env-flap': pastel(base, ENVELOPE_PASTEL.flap),
    '--env-edge': pastel(base, ENVELOPE_PASTEL.edge),
    '--env-seal': pastel(base, ENVELOPE_PASTEL.seal),
    '--env-heart': ENVELOPE_HEART,
  } as CSSProperties
}

function Envelope() {
  return (
    <svg width="96" height="68" viewBox="0 0 96 68" aria-hidden>
      <rect x="3" y="6" width="90" height="58" rx="8" style={{ fill: 'var(--env-body)', stroke: 'var(--env-edge)' }} strokeWidth="3" />
      <path d="M5 12 L48 42 L91 12" style={{ fill: 'var(--env-flap)', stroke: 'var(--env-edge)' }} strokeWidth="3" strokeLinejoin="round" />
      <path d="M5 62 L36 34 M91 62 L60 34" style={{ stroke: 'var(--env-edge)' }} strokeWidth="3" strokeLinecap="round" fill="none" />
      <circle cx="48" cy="41" r="11" style={{ fill: 'var(--env-seal)', stroke: 'var(--env-body)' }} strokeWidth="3" />
      <path d="M48 46 C41 41 42 36 45 36 C47 36 48 38 48 38 C48 38 49 36 51 36 C54 36 55 41 48 46 Z" style={{ fill: 'var(--env-heart)' }} />
    </svg>
  )
}

interface Props {
  gift: Gift | null
  /** pusat kado yang diklik (koordinat kanvas); pop-up tumbuh dari titik ini dan kembali ke sana saat ditutup */
  origin: { x: number; y: number } | null
  onClose: () => void
}

/** Skala awal/akhir pop-up saat "tersimpan" di dalam kado */
const TUCKED = 0.04
const EASE_OUT = [0.22, 1, 0.36, 1] as const // membesar: cepat lalu melambat halus
const EASE_IN = [0.55, 0, 0.85, 0.35] as const // mengecil: pelan lalu menyedot ke kado
const OPEN_S = 0.62
const CLOSE_S = 0.46

/**
 * Surat/kartu. Muncul dengan tumbuh dari kado yang diklik (transform-origin = titik kado, dihitung dari posisi kado di
 * layar), ditutup dengan animasi terbalik (mengecil masuk kembali ke kado); pop-up baru dilepas dari DOM setelah animasi
 * tutup selesai (AnimatePresence). Tutup: tombol X, klik di luar kartu, atau tombol Esc.
 * Letak akhir: tengah-atas (default) atau tepat di tengah layar bila gift.popup === 'center'.
 */
export function LetterModal({ gift, origin, onClose }: Props) {
  const reduced = useReducedMotion()
  const card = useRef<HTMLElement>(null)
  const [pivot, setPivot] = useState('50% 0%')
  // pop-up dirender sebagai anak langsung .stage (bukan di dalam scene): lepas dari stacking context apa pun milik scene/peta
  const [host, setHost] = useState<Element | null>(null)
  useLayoutEffect(() => {
    setHost(document.querySelector('.stage'))
  }, [])

  useEffect(() => {
    if (!gift) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [gift, onClose])

  // transform-origin dalam koordinat kartu = titik kado - posisi akhir kartu (offset layout, tidak terpengaruh transform)
  useLayoutEffect(() => {
    const el = card.current
    if (!gift || !el) return
    if (origin) setPivot(`${origin.x - el.offsetLeft}px ${origin.y - el.offsetTop}px`)
    else setPivot('50% 0%')
  }, [gift, origin])

  const tucked = reduced ? 1 : TUCKED

  if (!host) return null

  return createPortal(
    <AnimatePresence>
      {gift && (
        <motion.div
          key="letter-backdrop"
          className={`letter-backdrop ${gift.popup === 'center' ? 'is-center' : ''}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.35 } }}
          exit={{ opacity: 0, transition: { duration: CLOSE_S + 0.05 } }}
          onClick={onClose}
        >
          <motion.article
            key={gift.id}
            ref={card}
            className="letter"
            role="dialog"
            aria-modal="true"
            aria-label={`${LETTER_TITLE} dari ${gift.name}`}
            style={{ transformOrigin: pivot }}
            initial={{ opacity: 0, scale: tucked }}
            animate={{
              opacity: 1,
              scale: 1,
              transition: { scale: { duration: reduced ? 0.2 : OPEN_S, ease: EASE_OUT }, opacity: { duration: 0.1 } },
            }}
            exit={{
              opacity: 0,
              scale: tucked,
              transition: { scale: { duration: reduced ? 0.2 : CLOSE_S, ease: EASE_IN }, opacity: { duration: 0.1, delay: reduced ? 0 : CLOSE_S - 0.1 } },
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="letter-envelope" style={envelopeVars(gift)}>
              <Envelope />
            </div>
            <button type="button" className="letter-close" onClick={onClose} aria-label="Tutup surat">
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
            {gift.members.length > 0 && (
              <p className="letter-members">
                <span className="letter-members-label">Anggota:</span> {gift.members.join(', ')}
              </p>
            )}
          </motion.article>
        </motion.div>
      )}
    </AnimatePresence>,
    host,
  )
}
