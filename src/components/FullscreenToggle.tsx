import { useCallback, useEffect, useState } from 'react'

type FsDocument = Document & {
  webkitFullscreenEnabled?: boolean
  webkitFullscreenElement?: Element | null
  webkitExitFullscreen?: () => Promise<void> | void
}
type FsElement = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void }

const doc = document as FsDocument

const fsSupported = () => !!(doc.fullscreenEnabled || doc.webkitFullscreenEnabled)
const fsActive = () => !!(doc.fullscreenElement || doc.webkitFullscreenElement)

/** iPhone/iPod Safari tidak punya Fullscreen API untuk elemen biasa (iPad modern mengaku "MacIntel" dengan layar sentuh). */
const isIOS = () => /iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
const isStandalone = () => (navigator as Navigator & { standalone?: boolean }).standalone === true || window.matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches

const orientation = () => screen.orientation as (ScreenOrientation & { lock?: (o: string) => Promise<void> }) | undefined

function Icon({ active }: { active: boolean }) {
  // ikon sudut: keluar (panah ke luar) saat belum layar penuh, masuk (panah ke dalam) saat sedang layar penuh
  return (
    <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
      {active ? (
        <>
          <path d="M12 6 V12 H6" />
          <path d="M22 6 V12 H28" />
          <path d="M12 28 V22 H6" />
          <path d="M22 28 V22 H28" />
        </>
      ) : (
        <>
          <path d="M6 12 V6 H12" />
          <path d="M28 12 V6 H22" />
          <path d="M6 22 V28 H12" />
          <path d="M28 22 V28 H22" />
        </>
      )}
    </svg>
  )
}

/**
 * Tombol layar penuh (pojok kanan bawah, di kiri tombol suara). Memakai Fullscreen API (termasuk awalan webkit untuk
 * Safari) dan mengikuti event fullscreenchange, jadi tetap sinkron saat pengguna keluar lewat Esc. Setelah masuk layar
 * penuh orientasi dikunci ke landscape bila didukung (Android). Di iPhone Safari API-nya tidak ada: tombol tetap tampil
 * tetapi menjelaskan cara "Tambah ke Layar Utama" (halaman lalu terbuka tanpa bilah browser); di browser lain yang tidak
 * mendukung, tombol disembunyikan.
 */
export function FullscreenToggle() {
  const [active, setActive] = useState(fsActive)
  const [hint, setHint] = useState(false)
  const supported = fsSupported()
  const iosFallback = !supported && isIOS() && !isStandalone()

  useEffect(() => {
    const sync = () => {
      const on = fsActive()
      setActive(on)
      if (!on) {
        try {
          orientation()?.unlock?.()
        } catch {
          /* tidak didukung */
        }
      }
    }
    document.addEventListener('fullscreenchange', sync)
    document.addEventListener('webkitfullscreenchange', sync)
    return () => {
      document.removeEventListener('fullscreenchange', sync)
      document.removeEventListener('webkitfullscreenchange', sync)
    }
  }, [])

  const toggle = useCallback(async () => {
    if (iosFallback) {
      setHint((h) => !h)
      return
    }
    try {
      if (fsActive()) {
        await (doc.exitFullscreen?.() ?? doc.webkitExitFullscreen?.())
        return
      }
      const root = document.documentElement as FsElement
      await (root.requestFullscreen?.({ navigationUI: 'hide' }) ?? root.webkitRequestFullscreen?.())
      void orientation()?.lock?.('landscape')?.catch(() => {})
    } catch {
      /* ditolak browser (mis. bukan gestur pengguna): biarkan */
    }
  }, [iosFallback])

  if (!supported && !iosFallback) return null

  const label = iosFallback ? 'Cara layar penuh di iPhone' : active ? 'Keluar dari layar penuh' : 'Masuk layar penuh'
  return (
    <>
      <button type="button" data-sfx="none" className="fs-toggle" onClick={toggle} aria-label={label} title={label} aria-pressed={iosFallback ? undefined : active}>
        <Icon active={active} />
      </button>
      {hint && (
        <div className="fs-hint" role="status">
          iPhone tidak mendukung layar penuh di Safari. Ketuk <b>Bagikan</b>, lalu <b>Tambah ke Layar Utama</b>, dan buka dari ikon itu untuk tampilan tanpa bilah browser.
          <button type="button" data-sfx="none" onClick={() => setHint(false)}>
            Mengerti
          </button>
        </div>
      )}
    </>
  )
}
