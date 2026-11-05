import { useMemo } from 'react'
import type { CSSProperties } from 'react'
import { CLOUDS } from '../config'
import { useLite } from '../perf'

function rng(seed: number) {
  let a = seed
  return () => {
    a = (a * 1664525 + 1013904223) % 4294967296
    return a / 4294967296
  }
}

interface DriftProps {
  /** daerah y (px kanvas 1080) tempat awan melayang */
  yMin: number
  yMax: number
  count?: number
  opacity?: number
  /** detik per lintasan penuh; makin kecil makin cepat */
  speed?: number
  /** lebar awan (px) min..maks */
  size?: [number, number]
}

/** Awan (awan.png / awan2.png) yang melayang dari kanan ke kiri, loop mulus. */
export function DriftClouds({ yMin, yMax, count: fullCount = 5, opacity = 0.9, speed = 120, size = [260, 520] }: DriftProps) {
  // mode hemat: separuh jumlah awan (minimal 2)
  const lite = useLite()
  const count = lite ? Math.max(2, Math.ceil(fullCount / 2)) : fullCount
  const items = useMemo(() => {
    const r = rng(99 + count)
    return Array.from({ length: count }, (_, i) => {
      const w = size[0] + r() * (size[1] - size[0])
      return {
        src: CLOUDS[i % CLOUDS.length],
        w,
        y: yMin + (i / Math.max(1, count - 1)) * (yMax - yMin) + (r() - 0.5) * 30 - w * 0.2,
        flip: r() < 0.5,
        dur: speed * (0.8 + r() * 0.5),
        delay: -(i / count) * speed - r() * 6,
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yMin, yMax, count, speed])
  return (
    <div className="drift-clouds" aria-hidden style={{ opacity }}>
      {items.map((c, i) => (
        <div key={i} className="drift-cloud" style={{ top: c.y, animationDuration: `${c.dur}s`, animationDelay: `${c.delay}s` }}>
          <img src={c.src} alt="" draggable={false} style={{ width: c.w, transform: c.flip ? 'scaleX(-1)' : undefined }} />
        </div>
      ))}
    </div>
  )
}

const SPARK_PATH = 'M0 -12 C1 -4 4 -1 12 0 C4 1 1 4 0 12 C-1 4 -4 1 -12 0 C-4 -1 -1 -4 0 -12 Z'

/** Kilau/partikel kecil yang berkedip. Posisi dalam persen kanvas. */
export function Sparkles({
  count: fullCount = 18,
  region = [0, 0, 100, 100],
  seed = 5,
}: {
  count?: number
  region?: [number, number, number, number]
  seed?: number
}) {
  const lite = useLite()
  const count = lite ? Math.ceil(fullCount / 2) : fullCount // mode hemat: separuh kilau
  const items = useMemo(() => {
    const r = rng(seed)
    return Array.from({ length: count }, () => ({
      x: region[0] + r() * (region[2] - region[0]),
      y: region[1] + r() * (region[3] - region[1]),
      s: 0.5 + r() * 0.9,
      delay: -r() * 4,
      dur: 2.2 + r() * 2.6,
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, seed])
  return (
    <div className="sparkles" aria-hidden>
      {items.map((p, i) => (
        <svg
          key={i}
          className="spark"
          width="34"
          height="34"
          viewBox="-17 -17 34 34"
          style={{ left: `${p.x}%`, top: `${p.y}%`, animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s`, '--s': p.s } as CSSProperties}
        >
          <path d={SPARK_PATH} fill="#fffbe0" />
        </svg>
      ))}
    </div>
  )
}

/** Garis angin putih tipis yang melaju dari kanan ke kiri. */
export function SpeedLines({ yMin, yMax, count = 16 }: { yMin: number; yMax: number; count?: number }) {
  const lines = useMemo(() => {
    const r = rng(42)
    return Array.from({ length: count }, (_, i) => ({
      y: yMin + r() * (yMax - yMin),
      w: 140 + r() * 360,
      h: 3 + r() * 4,
      dur: 0.9 + r() * 1.1,
      delay: -r() * 2,
      o: 0.35 + r() * 0.5,
      key: i,
    }))
  }, [yMin, yMax, count])
  return (
    <div className="speed-lines" aria-hidden>
      {lines.map((l) => (
        <i key={l.key} style={{ top: l.y, width: l.w, height: l.h, animationDuration: `${l.dur}s`, animationDelay: `${l.delay}s`, opacity: l.o }} />
      ))}
    </div>
  )
}
