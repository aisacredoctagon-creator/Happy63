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
 * Tombol layar penuh (pojok kanan bawah, di kanan tombol suara). Memakai Fullscreen API (termasuk awalan webkit untuk
 * Safari) dan mengikuti event fullscreenchange, jadi tetap sinkron saat pengguna keluar lewat Esc. Setelah masuk layar
 * penuh orientasi dikunci ke landscape bila didukung (Android). Di browser tanpa Fullscreen API (iPhone Safari)
 * tombol disembunyikan. `hidden`: disembunyikan dengan fade (Scene 07), komponen tetap terpasang.
 */
export function FullscreenToggle({ hidden = false }: { hidden?: boolean }) {
  const [active, setActive] = useState(fsActive)
  const supported = fsSupported()

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
  }, [])

  if (!supported) return null

  const label = active ? 'Keluar dari layar penuh' : 'Masuk layar penuh'
  return (
    <button type="button" data-sfx="none" className={`fs-toggle ui-fade ${hidden ? 'is-hidden' : ''}`} aria-hidden={hidden || undefined} tabIndex={hidden ? -1 : undefined} onClick={toggle} aria-label={label} title={label} aria-pressed={active}>
      <Icon active={active} />
    </button>
  )
}
