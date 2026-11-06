import { useEffect, useRef, useState } from 'react'
import { audio, useBgm } from '../audio/audio'
import { BGM_TRACKS } from '../audio/bgm'

/**
 * Tombol (ikon not musik) di pojok kanan atas, tampil sejak layar pembuka, yang membuka panel kecil untuk memilih BGM dari
 * BGM_TRACKS. Pilihan ditangani audio.setBgm: berlaku selama sesi halaman (tidak disimpan; refresh kembali ke "Coba Soal Gasing") dan di
 * seluruh project (musik sendiri baru berbunyi di Scene 04). `hidden`: disembunyikan dengan fade bersama tombol suara (Scene 07); komponen tetap terpasang.
 */
export function BgmPicker({ hidden = false }: { hidden?: boolean }) {
  const current = useBgm()
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (hidden) setOpen(false)
  }, [hidden])

  // panel tertutup saat klik di luar atau menekan Esc
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false)
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
    <div ref={box} className="bgm-dock">
      <button
        type="button"
        className={`bgm-btn ui-fade ${open ? 'is-open' : ''} ${hidden ? 'is-hidden' : ''}`}
        aria-hidden={hidden || undefined}
        tabIndex={hidden ? -1 : undefined}
        onClick={() => setOpen((o) => !o)}
        aria-label="Pilih musik latar"
        aria-expanded={open}
        title="Pilih musik latar"
      >
        <svg width="28" height="28" viewBox="0 0 26 26" aria-hidden>
          <path d="M10 19 V6.5 L21 4.5 V17.5" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          <ellipse cx="7.2" cy="19.5" rx="3.4" ry="2.8" fill="#fff" />
          <ellipse cx="18.2" cy="18" rx="3.4" ry="2.8" fill="#fff" />
        </svg>
      </button>
      {open && (
        <div className="bgm-panel" role="radiogroup" aria-label="Musik latar">
          <p className="bgm-title">Musik latar</p>
          {BGM_TRACKS.map((t) => {
            const active = t.id === current
            return (
              <button key={t.id} type="button" role="radio" aria-checked={active} className={`bgm-row ${active ? 'is-active' : ''}`} onClick={() => audio.setBgm(t.id)}>
                <span className="bgm-dot" aria-hidden>
                  {active && (
                    <svg width="24" height="24" viewBox="0 0 24 24">
                      <path d="M6 12.5 L10.5 17 L18 8" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                <span className="bgm-name">{t.title}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
