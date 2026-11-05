import { useEffect, useRef, useState } from 'react'
import { audio, useAudioSettings, useMuted } from '../audio/audio'
import type { Category } from '../audio/audio'
import { setLite, useLite } from '../perf'

/** Satu baris bisa mengatur beberapa kategori sekaligus: "Musik" menggerakkan musik latar dan suasana bersamaan. */
const ROWS: Array<{ cats: Category[]; label: string }> = [
  { cats: ['sfx'], label: 'Efek' },
  { cats: ['music', 'ambient'], label: 'Musik' },
]

/** Tombol mute global (SFX, ambient, dan musik) dan gerigi pengaturan di pojok kanan atas, plus panel volume. */
export function AudioToggle() {
  const muted = useMuted()
  const settings = useAudioSettings()
  const lite = useLite()
  const [open, setOpen] = useState(false)
  const dock = useRef<HTMLDivElement>(null)

  // panel tertutup saat klik di luar atau menekan Esc
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!dock.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={dock} className="audio-dock">
      {open && (
        <div className="audio-panel" role="group" aria-label="Volume suara">
          {ROWS.map((r) => (
            <label key={r.label} className="audio-row">
              <span>{r.label}</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={settings[r.cats[0]]}
                aria-label={`Volume ${r.label}`}
                onChange={(e) => r.cats.forEach((c) => audio.setVolume(c, Number(e.target.value)))}
              />
            </label>
          ))}
          <label className="audio-row lite-row">
            <span>Mode hemat</span>
            <input type="checkbox" checked={lite} aria-label="Mode hemat (animasi lebih ringan)" onChange={(e) => setLite(e.target.checked)} />
          </label>
        </div>
      )}
      <button
        type="button"
        className={`audio-more ${open ? 'is-open' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-label="Atur volume"
        aria-expanded={open}
        title="Atur volume"
      >
        <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden>
          <path
            d="M11.04 4.83 L11.51 1.90 L14.49 1.90 L14.96 4.83 L17.39 5.84 L19.79 4.10 L21.90 6.21 L20.16 8.61 L21.17 11.04 L24.10 11.51 L24.10 14.49 L21.17 14.96 L20.16 17.39 L21.90 19.79 L19.79 21.90 L17.39 20.16 L14.96 21.17 L14.49 24.10 L11.51 24.10 L11.04 21.17 L8.61 20.16 L6.21 21.90 L4.10 19.79 L5.84 17.39 L4.83 14.96 L1.90 14.49 L1.90 11.51 L4.83 11.04 L5.84 8.61 L4.10 6.21 L6.21 4.10 L8.61 5.84 Z"
            fill="#fff"
            stroke="#fff"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          <circle cx="13" cy="13" r="3.6" fill="#8996ab" />
        </svg>
      </button>
      <button
        type="button"
        data-sfx="none"
        className={`audio-toggle ${muted ? '' : 'is-on'}`}
        onClick={() => audio.toggleMute()}
        aria-label={muted ? 'Nyalakan suara' : 'Matikan suara'}
        aria-pressed={!muted}
        title={muted ? 'Nyalakan suara' : 'Matikan suara'}
      >
        <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden>
          <path d="M5 13 H11 L18 7 V27 L11 21 H5 Z" fill="#fff" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
          {muted ? (
            <path d="M23 12 L31 22 M31 12 L23 22" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" />
          ) : (
            <>
              <path d="M22 12 Q26 17 22 22" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
              <path d="M25.5 8.5 Q32 17 25.5 25.5" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
            </>
          )}
        </svg>
      </button>
    </div>
  )
}
