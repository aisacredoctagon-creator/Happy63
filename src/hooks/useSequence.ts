import { animate, useReducedMotion } from 'framer-motion'
import type { AnimationPlaybackControls, MotionValue, ValueAnimationTransition } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { audio } from '../audio/audio'
import type { PlayOpts, SfxName } from '../audio/audio'

export interface Seq {
  /** true jika komponen sudah unmount / efek dibersihkan; hentikan alur bila true */
  readonly dead: boolean
  /** prefers-reduced-motion aktif */
  readonly reduced: boolean
  wait(seconds: number): Promise<void>
  /** animasikan MotionValue; durasi dipersingkat bila reduced-motion */
  to(mv: MotionValue<number>, target: number, opts?: ValueAnimationTransition<number>): Promise<void>
  /**
   * Mainkan SFX (bercakupan scene) tepat pada titik ini di alur, atau `delay` detik setelahnya.
   * Dibatalkan otomatis bila alur dihentikan (unmount / skip / pindah scene).
   */
  sfx(name: SfxName, opts?: Omit<PlayOpts, 'scope' | 'delay'> & { delay?: number }): void
}

/**
 * Menjalankan alur animasi berurutan (async/await) yang otomatis dihentikan saat unmount.
 * Contoh: await seq.to(x, 100, { duration: 1 }); await seq.wait(0.5); ...
 */
export function useSequence(run: (seq: Seq) => Promise<void>, deps: unknown[] = []) {
  const reduced = !!useReducedMotion()
  const runRef = useRef(run)
  runRef.current = run

  useEffect(() => {
    let dead = false
    const cancels: Array<() => void> = []
    const seq: Seq = {
      get dead() {
        return dead
      },
      reduced,
      wait: (s) =>
        new Promise<void>((resolve) => {
          const t = setTimeout(resolve, (reduced ? Math.min(s, 0.3) : s) * 1000)
          cancels.push(() => clearTimeout(t))
        }),
      to: (mv, target, opts = {}) =>
        new Promise<void>((resolve) => {
          const o = { ...opts }
          if (reduced) o.duration = Math.min(o.duration ?? 0.3, 0.2)
          const controls: AnimationPlaybackControls = animate(mv, target, o)
          cancels.push(() => controls.stop())
          void controls.finished.then(() => resolve())
        }),
      sfx: (name, { delay = 0, ...o } = {}) => {
        // sedikit tunda agar eksekusi pertama React StrictMode (yang langsung dibatalkan) tidak sempat berbunyi
        const t = setTimeout(() => audio.playSfx(name, { ...o, scope: 'scene' }), delay * 1000 + 30)
        cancels.push(() => clearTimeout(t))
      },
    }
    runRef.current(seq).catch(() => {})
    return () => {
      dead = true
      cancels.forEach((c) => c())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}
