import { CABIN, CABIN_COLORS, STAGE_H, STAGE_W } from '../config'

/** Posisi kabin pada kanvas (cangkang kabin lebar penuh, tinggi menyesuaikan, di tengah). */
export const CABIN_SCALE = STAGE_W / CABIN.w
export const CABIN_TOP = (STAGE_H - CABIN.h * CABIN_SCALE) / 2

/**
 * Gradien interior kabin (langit-langit -> dinding -> karpet), warnanya diambil dari tepi aset.
 * `offset` menggeser semua titik (px) untuk dipakai pada elemen yang lebih besar dari kanvas; di luar titik awal/akhir warnanya menerus.
 */
export function cabinGradient(offset = 0) {
  const y = (v: number) => `${offset + CABIN_TOP + v * CABIN_SCALE}px`
  const { ceil, wall, floor } = CABIN_COLORS
  return `linear-gradient(to bottom, ${ceil} 0, ${ceil} ${y(55)}, ${wall} ${y(265)}, ${wall} ${y(640)}, ${floor} ${y(700)}, ${floor} 100%)`
}
