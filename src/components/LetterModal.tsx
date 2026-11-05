import { useReducedMotion } from 'framer-motion'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { CSSProperties } from 'react'
import { audio } from '../audio/audio'
import type { Gift } from '../data/gifts'
import { ENVELOPE_HEART, ENVELOPE_PASTEL, pastel } from '../data/pastel'
import { genieAnimate } from './genie'
import type { Point } from './genie'

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
  /** elemen kado yang diklik (titik asal Genie); posisinya dibaca saat animasi buka/tutup dimulai */
  originEl: HTMLElement | null
  onClose: () => void
}

/** keluarga font pop-up (sinkron dengan .letter[data-font] di index.css): di-prefetch agar kartu pertama tidak menunggu unduhan */
const POPUP_FONTS = ['Mali', 'Gaegu', 'Grandstander', 'Sniglet', 'Baloo 2', 'Kalam', 'Comic Neue', 'Fredoka', 'Bricolage Grotesque']
const FONT_WAIT_MS = 700

/** pastikan font kartu sudah termuat sebelum Genie mengukur/menyalin kartu (batas tunggu FONT_WAIT_MS, lalu lanjut dengan cadangan) */
function fontsReady(el: HTMLElement): Promise<void> {
  if (!document.fonts?.load) return Promise.resolve()
  const family = getComputedStyle(el).fontFamily.split(',')[0].trim()
  const load = Promise.all([document.fonts.load(`400 1em ${family}`), document.fonts.load(`700 1em ${family}`)]).then(() => undefined)
  return Promise.race([load, new Promise<void>((r) => window.setTimeout(r, FONT_WAIT_MS))]).catch(() => undefined)
}

const OPEN_MS = 500
const CLOSE_MS = 400
const REDUCED_MS = 180

/** ukuran judul mengikuti panjang teks supaya ucapan panjang tidak meluap */
const titleSize = (t: string) => (t.length <= 28 ? 'l' : t.length <= 46 ? 'm' : 's')

/**
 * Surat/kartu pop-up. Selalu tepat di tengah layar (flex center pada .letter-backdrop, yang satu pusat dengan .stage dan
 * .stage selalu berpusat di viewport). Buka/tutup memakai efek Genie dari/ke kado yang diklik (lihat genie.ts); dengan
 * prefers-reduced-motion diganti fade + scale singkat. Tutup: tombol X, klik di luar kartu, atau Esc.
 */
export function LetterModal({ gift, originEl, onClose }: Props) {
  const reduced = useReducedMotion()
  // suara surat jatuh dan menutup, apa pun cara menutupnya (X, klik latar, Esc); dipicu bersamaan dengan animasi Genie
  const prevGift = useRef<Gift | null>(null)
  useEffect(() => {
    if (gift && !prevGift.current) audio.playSfx('paperDrop')
    else if (!gift && prevGift.current) audio.playSfx('paperClose')
    prevGift.current = gift
  }, [gift])
  const card = useRef<HTMLElement>(null)
  /** animasi Genie yang sedang berjalan pada kartu (satu elemen, Web Animations API) */
  const genie = useRef<Animation | null>(null)
  const lastOrigin = useRef<Point | null>(null)
  const returnFocus = useRef<HTMLElement | null>(null)
  /** true sejak penutupan dimulai: animasi buka yang masih menunggu font tidak boleh jalan lagi */
  const closingRef = useRef(false)
  /** gift yang sedang dirender; tetap terpasang selama animasi tutup berjalan */
  const [shown, setShown] = useState<Gift | null>(null)
  const [closing, setClosing] = useState(false)
  // pop-up dirender sebagai anak langsung .stage (bukan di dalam scene): lepas dari stacking context apa pun milik scene/peta
  const [host, setHost] = useState<HTMLElement | null>(null)
  useLayoutEffect(() => {
    setHost(document.querySelector<HTMLElement>('.stage'))
  }, [])
  useEffect(() => {
    if (!document.fonts?.load) return
    for (const f of POPUP_FONTS) {
      void document.fonts.load(`400 1em "${f}"`).catch(() => {})
      void document.fonts.load(`700 1em "${f}"`).catch(() => {})
    }
  }, [])

  /** titik kado dalam koordinat kanvas .stage (memperhitungkan scale/crop); null bila elemennya sudah tidak ada */
  const readOrigin = useCallback((): Point | null => {
    if (!host || !originEl?.isConnected) return lastOrigin.current
    const sr = host.getBoundingClientRect()
    const k = sr.width / host.offsetWidth
    const r = originEl.getBoundingClientRect()
    lastOrigin.current = { x: (r.left - sr.left) / k, y: (r.top - sr.top) / k }
    return lastOrigin.current
  }, [host, originEl])

  const fallbackOrigin = (): Point => {
    const sr = host!.getBoundingClientRect()
    const k = sr.width / host!.offsetWidth
    return { x: host!.offsetWidth / 2, y: (sr.height / k) * 0.8 }
  }

  // kado diklik: pasang kartu (animasi buka dimulai oleh efek berikutnya, sebelum frame pertama dilukis)
  useLayoutEffect(() => {
    if (!gift) return
    returnFocus.current = document.activeElement as HTMLElement | null
    closingRef.current = false
    setClosing(false)
    setShown(gift)
  }, [gift])

  // animasi buka
  useLayoutEffect(() => {
    const el = card.current
    if (!shown || !host || !el || closing) return
    let cancelled = false
    el.style.visibility = 'hidden' // disembunyikan sampai font siap (sebelum frame pertama dilukis)
    void fontsReady(el).then(() => {
      if (cancelled || closingRef.current) return
      if (reduced) {
        el.style.visibility = ''
        el.animate?.([{ opacity: 0, transform: 'scale(0.96)' }, { opacity: 1, transform: 'scale(1)' }], { duration: REDUCED_MS, easing: 'ease-out' })
        el.focus({ preventScroll: true })
        return
      }
      const g = genieAnimate(el, host, readOrigin() ?? fallbackOrigin(), 'open', OPEN_MS)
      genie.current = g
      el.style.visibility = '' // animasi sudah terpasang (fill: both), jadi frame pertama langsung berupa titik asal
      g.finished.then(
        () => {
          // bila penutupan sudah dimulai (Esc/klik saat masih membuka), animasi ini dibalik oleh animasi tutup
          if (cancelled || closingRef.current || genie.current !== g) return
          g.cancel()
          genie.current = null
          el.focus({ preventScroll: true })
        },
        () => {}, // dibatalkan
      )
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown, host])

  const close = onClose

  // kado ditutup: animasi tutup, lalu lepas kartu dari DOM
  useLayoutEffect(() => {
    if (gift || !shown) return
    const el = card.current
    closingRef.current = true
    setClosing(true)
    const finish = () => {
      // animasi tidak di-cancel di sini: keadaan akhirnya (tak terlihat) tertahan sampai kartu lepas dari DOM, tanpa kedipan
      genie.current = null
      setShown(null)
      setClosing(false)
      returnFocus.current?.focus?.({ preventScroll: true })
    }
    if (!el || !host) return finish()
    if (reduced) {
      el.animate?.([{ opacity: 1 }, { opacity: 0 }], { duration: REDUCED_MS, fill: 'forwards' })
      const t = window.setTimeout(finish, REDUCED_MS)
      return () => window.clearTimeout(t)
    }
    // bila pop-up masih setengah terbuka, balikkan animasi buka dari posisinya saat ini; selain itu mulai animasi tutup
    let g = genie.current
    if (g && g.playState === 'running') {
      g.reverse()
    } else {
      g?.cancel()
      g = genieAnimate(el, host, readOrigin() ?? fallbackOrigin(), 'close', CLOSE_MS)
    }
    genie.current = g
    const cur = g
    cur.finished.then(
      () => {
        if (genie.current === cur) finish()
      },
      () => {}, // dibatalkan
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gift])

  useEffect(() => {
    if (!gift) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [gift, close])

  useEffect(
    () => () => {
      genie.current?.cancel()
      genie.current = null
    },
    [],
  )

  if (!host || !shown) return null

  return createPortal(
    <div className={`letter-backdrop ${closing ? 'is-closing' : ''}`} onClick={close}>
      <article
        key={shown.id}
        ref={card}
        className="letter"
        data-font={shown.font}
        role="dialog"
        aria-modal="true"
        aria-labelledby="letter-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="letter-envelope" style={envelopeVars(shown)}>
          <Envelope />
        </div>
        <button type="button" data-sfx="none" className="letter-close" onClick={close} aria-label="Tutup surat">
          <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden>
            <path d="M6 6 L20 20 M20 6 L6 20" stroke="#fff" strokeWidth="4.2" strokeLinecap="round" />
          </svg>
        </button>
        <h2 id="letter-title" className="letter-title" data-size={titleSize(shown.title)}>
          {shown.title}
        </h2>
        <div className="letter-chip" style={{ '--fill': shown.color } as CSSProperties}>
          {shown.name}
        </div>
        <div className={`letter-body ${shown.letter.length > 900 ? 'is-long' : ''}`} tabIndex={0}>
          {shown.letter.split('\n\n').map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
        {shown.members.length > 0 && (
          <p className="letter-members">
            <span className="letter-members-label">Anggota:</span> {shown.members.join(', ')}
          </p>
        )}
      </article>
    </div>,
    host,
  )
}
