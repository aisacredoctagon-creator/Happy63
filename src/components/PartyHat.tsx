import type { CSSProperties } from 'react'
import { IMG } from '../config'

/**
 * Posisi topi dalam PERSEN terhadap kotak sprite (induk harus position: relative/absolute dan seukuran sprite), jadi topi
 * ikut skala, gerak, dan animasi maskot di mana pun dipakai. Nilai ditentukan dari bentuk kepala di tiap aset:
 * - gasing : gasing.png (900x1074), dipakai Scene 1, 4, 5 dan layar loading
 * - plane  : plane-mascot.png (1001x453), Gasing di jendela pesawat (Scene 3)
 */
const PLACEMENT = {
  gasing: { left: 40, top: -8.5, width: 28, rotate: 10 },
  plane: { left: 62, top: -6.5, width: 12, rotate: 8 },
} as const

export type HatVariant = keyof typeof PLACEMENT

export function PartyHat({ variant = 'gasing' }: { variant?: HatVariant }) {
  const p = PLACEMENT[variant]
  const style: CSSProperties = { left: `${p.left}%`, top: `${p.top}%`, width: `${p.width}%`, transform: `rotate(${p.rotate}deg)` }
  return <img className="party-hat" src={IMG.partyHat} alt="" draggable={false} style={style} />
}
