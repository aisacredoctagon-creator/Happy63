import { useLayoutEffect, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { STAGE_H, STAGE_W } from '../config'

interface Props {
  /** isi kanvas 1920x1080 (scene, tombol, dll.) */
  children: ReactNode
  /** lapisan tambahan di atas segalanya (awan transisi) */
  overlay?: ReactNode
}

/** Seberapa besar kanvas boleh diperbesar melebihi mode "muat" (contain) supaya layar terisi: 1.2 = potong maksimal ~8% tiap sisi. */
const MAX_FILL = 1.2

/**
 * Kanvas desain 1920x1080 yang di-scale agar layar TERISI (mode "filled"/cover): bila rasio jendela bukan 16:9, kanvas
 * diperbesar sampai menutup seluruh jendela dan bagian yang berlebih terpotong, tanpa gap. Pembesaran dibatasi
 * (MAX_FILL) supaya isi interaktif (kado, tombol) tidak ikut terpotong di jendela yang rasionya ekstrem; sisa gap yang
 * mungkin masih ada ditutup oleh perluasan latar tiap scene (EdgeExtend).
 *
 * Bagian kanvas yang terpotong diumumkan lewat CSS variable --crop-x / --crop-y (px kanvas per sisi) sehingga tombol dan
 * UI di tepi layar tetap berada di area yang terlihat.
 */
/** skala kanvas untuk ukuran jendela tertentu (mode "filled" dengan batas MAX_FILL) */
export function stageScale(vw: number, vh: number) {
  const contain = Math.min(vw / STAGE_W, vh / STAGE_H)
  const cover = Math.max(vw / STAGE_W, vh / STAGE_H)
  return Math.min(cover, contain * MAX_FILL)
}

export function Stage({ children, overlay }: Props) {
  const [view, setView] = useState({ scale: 1, cropX: 0, cropY: 0 })
  useLayoutEffect(() => {
    const update = () => {
      const vw = window.innerWidth
      const vh = window.innerHeight
      const scale = stageScale(vw, vh)
      setView({
        scale,
        cropX: Math.max(0, (STAGE_W - vw / scale) / 2),
        cropY: Math.max(0, (STAGE_H - vh / scale) / 2),
      })
    }
    update()
    window.addEventListener('resize', update)
    window.addEventListener('orientationchange', update)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('orientationchange', update)
    }
  }, [])
  const style = {
    transform: `translate(-50%, -50%) scale(${view.scale})`,
    '--crop-x': `${Math.round(view.cropX)}px`,
    '--crop-y': `${Math.round(view.cropY)}px`,
  } as CSSProperties
  return (
    <div className="viewport">
      <div className="stage" style={style}>
        <div className="stage-content">{children}</div>
        {overlay}
      </div>
    </div>
  )
}
