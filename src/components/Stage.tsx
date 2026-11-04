import { createContext, useContext, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { STAGE_H, STAGE_W } from '../config'

interface Props {
  /** isi kanvas 1920x1080 (scene, tombol, dll.) */
  children: ReactNode
  /** lapisan tambahan di atas segalanya (awan transisi) */
  overlay?: ReactNode
  /**
   * Scene ini boleh digeser kiri-kanan di layar yang agak kotak (mis. Fold, tablet 4:3): kanvas diskalakan agar TINGGI layar
   * terisi penuh, dan bagian lebar yang tidak muat digeser lewat StageView (lihat Scene3). Scene lain tidak terpengaruh
   * (tetap di tengah dengan skala biasa).
   */
  pannable?: boolean
  /**
   * Di layar ponsel (landscape), kanvas scene ini diperbesar sampai MENUTUP layar penuh (tanpa batas MAX_FILL, jadi tidak ada
   * perluasan tepi) dan tepi BAWAH gambar menempel ke tepi bawah layar; bagian yang berlebih terpotong di atas. Scene yang
   * memakainya wajib menggeser lapisan petanya ke atas sebesar `cropY` (lihat Scene3), karena Stage sendiri tetap berpusat.
   */
  fillBottom?: boolean
}

/** info tampilan kanvas untuk scene: skala, bagian kanvas yang terpotong per sisi (px kanvas), dan apakah mode geser aktif */
export interface StageViewInfo {
  scale: number
  cropX: number
  cropY: number
  panMode: boolean
  /** mode ponsel "fill + anchor bawah" aktif (lihat prop fillBottom) */
  anchorBottom: boolean
  /**
   * Seberapa jauh (px kanvas) layar terlihat melewati tiap sisi kanvas 16:9 (+ margin), dibulatkan ke atas per 50.
   * Perluasan latar (EdgeExtend, backdrop, loading) cukup sebesar ini; dulu tetap 800-1000 px sehingga di ponsel membuat
   * lapisan raksasa (belasan juta piksel) yang memakan memori GPU iOS sampai tab dimatikan Safari.
   */
  padX: number
  padY: number
}
const StageViewContext = createContext<StageViewInfo>({ scale: 1, cropX: 0, cropY: 0, panMode: false, anchorBottom: false, padX: 800, padY: 800 })
export const useStageView = () => useContext(StageViewContext)

/** layar dengan rasio lebar/tinggi di bawah ini dianggap "agak kotak" (16:9 = 1.78; 4:3 = 1.33; Fold landscape ~ 1.25-1.4) */
const PAN_BELOW_ASPECT = 1.6

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

/** di bawah skala ini (layar kecil, mis. ponsel landscape) pop-up dan teksnya dibuat relatif lebih besar agar terbaca */
const COMPACT_BELOW = 0.55

/** tinggi viewport (px CSS) di bawah ini dianggap layar ponsel (landscape) untuk mode fillBottom */
const MOBILE_BELOW_H = 600

/** celah (px kanvas) + margin, dibulatkan ke atas per 50 agar tidak memicu render ulang tiap perubahan kecil */
const pad = (gap: number) => Math.min(1200, Math.ceil((Math.max(0, gap) + 60) / 50) * 50)

export function Stage({ children, overlay, pannable, fillBottom }: Props) {
  const viewport = useRef<HTMLDivElement>(null)
  const [view, setView] = useState<StageViewInfo>({ scale: 1, cropX: 0, cropY: 0, panMode: false, anchorBottom: false, padX: 800, padY: 800 })
  useLayoutEffect(() => {
    const el = viewport.current
    if (!el) return
    // Ukuran diambil dari .viewport itu sendiri (bukan window.innerWidth/innerHeight): kanvas dipusatkan di dalam .viewport,
    // jadi skala dan pusatnya selalu memakai kotak yang sama walau address bar, fullscreen, atau safe-area mengubah ukuran.
    const update = () => {
      const vw = el.clientWidth
      const vh = el.clientHeight
      if (!vw || !vh) return
      const panMode = !!pannable && vw / vh < PAN_BELOW_ASPECT
      const anchorBottom = !!fillBottom && !panMode && vh < MOBILE_BELOW_H
      const scale = panMode ? vh / STAGE_H : anchorBottom ? Math.max(vw / STAGE_W, vh / STAGE_H) : stageScale(vw, vh)
      setView({
        scale,
        cropX: Math.max(0, (STAGE_W - vw / scale) / 2),
        cropY: Math.max(0, (STAGE_H - vh / scale) / 2),
        panMode,
        anchorBottom,
        padX: pad((vw / scale - STAGE_W) / 2),
        padY: pad((vh / scale - STAGE_H) / 2),
      })
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    window.addEventListener('resize', update)
    window.addEventListener('orientationchange', update)
    document.addEventListener('fullscreenchange', update)
    document.addEventListener('webkitfullscreenchange', update)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', update)
      window.removeEventListener('orientationchange', update)
      document.removeEventListener('fullscreenchange', update)
      document.removeEventListener('webkitfullscreenchange', update)
    }
  }, [pannable, fillBottom])
  const style = {
    transform: `translate(-50%, -50%) scale(${view.scale})`,
    '--crop-x': `${Math.round(view.cropX)}px`,
    '--crop-y': `${Math.round(view.cropY)}px`,
    '--pad-x': `${view.padX}px`,
    '--pad-y': `${view.padY}px`,
  } as CSSProperties
  return (
    <div className="viewport" ref={viewport}>
      <div className="stage" style={style} data-compact={view.scale < COMPACT_BELOW ? '' : undefined} data-pan={view.panMode ? '' : undefined}>
        <StageViewContext.Provider value={view}>
          <div className="stage-content">{children}</div>
        </StageViewContext.Provider>
        {overlay}
      </div>
    </div>
  )
}
