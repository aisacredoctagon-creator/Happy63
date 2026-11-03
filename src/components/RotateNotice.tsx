import { useEffect } from 'react'

/**
 * Website ini hanya mendukung landscape. Saat perangkat portrait (media query `orientation: portrait`) overlay ini
 * menutup layar penuh dan konten utama disembunyikan lewat CSS; overlay hilang otomatis ketika perangkat diputar.
 */
export function RotateNotice() {
  // Coba kunci ke landscape bila didukung. Banyak browser (mis. Chrome Android) hanya mengizinkannya setelah gestur
  // user / dalam layar penuh, dan iOS Safari tidak mendukungnya: gagal diam-diam, overlay tetap jadi cadangannya.
  useEffect(() => {
    const tryLock = () => {
      const orientation = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }
      try {
        void orientation?.lock?.('landscape')?.catch(() => {})
      } catch {
        /* tidak didukung */
      }
    }
    tryLock()
    window.addEventListener('pointerdown', tryLock, { once: true })
    return () => window.removeEventListener('pointerdown', tryLock)
  }, [])

  return (
    <div className="rotate-overlay" role="alert" aria-live="polite">
      <svg className="rotate-icon" width="140" height="140" viewBox="0 0 140 140" aria-hidden>
        <g className="rotate-phone">
          <rect x="44" y="20" width="52" height="100" rx="10" fill="#fff" stroke="#17539d" strokeWidth="6" />
          <rect x="52" y="32" width="36" height="66" rx="3" fill="#bfe3ff" />
          <circle cx="70" cy="108" r="4.5" fill="#17539d" />
        </g>
        <path className="rotate-arrow" d="M18 60 C18 28 44 10 74 12 M74 12 L62 4 M74 12 L64 24" fill="none" stroke="#ffb627" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <p className="rotate-text">Putar perangkat Anda ke mode landscape</p>
    </div>
  )
}
