import { useMemo } from 'react'
import type { CSSProperties } from 'react'

const COLORS = ['#ffd23f', '#ff6b6b', '#4dabf7', '#51cf66', '#cc5de8', '#ff922b', '#ffffff']

/** Konfeti ringan: hanya transform + opacity, jalan sekali lalu berhenti. */
export function Confetti({ count = 70 }: { count?: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        w: 10 + Math.random() * 12,
        h: 14 + Math.random() * 14,
        color: COLORS[i % COLORS.length],
        delay: Math.random() * 2.2,
        dur: 3.4 + Math.random() * 2.6,
        dx: (Math.random() - 0.5) * 360,
        rot: (Math.random() < 0.5 ? -1 : 1) * (360 + Math.random() * 720),
        round: Math.random() < 0.3,
      })),
    [count],
  )
  return (
    <div className="confetti" aria-hidden>
      {pieces.map((p) => (
        <i
          key={p.id}
          style={
            {
              left: `${p.left}%`,
              width: p.w,
              height: p.round ? p.w : p.h,
              background: p.color,
              borderRadius: p.round ? '50%' : 3,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.dur}s`,
              '--dx': `${p.dx}px`,
              '--rot': `${p.rot}deg`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  )
}
