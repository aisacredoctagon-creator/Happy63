import { useEffect, useRef, useState } from 'react'
import { audio, useAudioSettings, useMuted } from '../audio/audio'
import type { Category } from '../audio/audio'

const ROWS: Array<{ cat: Category; label: string }> = [
  { cat: 'sfx', label: 'Efek' },
  { cat: 'ambient', label: 'Suasana' },
  { cat: 'music', label: 'Musik' },
]

/** Tombol mute global (SFX, ambient, dan musik) di pojok kanan bawah, plus panel volume per kategori. */
export function AudioToggle() {
  const muted = useMuted()
  const settings = useAudioSettings()
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
            <label key={r.cat} className="audio-row">
              <span>{r.label}</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={settings[r.cat]}
                aria-label={`Volume ${r.label}`}
                onChange={(e) => audio.setVolume(r.cat, Number(e.target.value))}
              />
            </label>
          ))}
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
          <path d="M4 7 H22 M4 13 H22 M4 19 H22" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
          <circle cx="9" cy="7" r="3.2" fill="#8996ab" stroke="#fff" strokeWidth="2.4" />
          <circle cx="17" cy="13" r="3.2" fill="#8996ab" stroke="#fff" strokeWidth="2.4" />
          <circle cx="11" cy="19" r="3.2" fill="#8996ab" stroke="#fff" strokeWidth="2.4" />
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
