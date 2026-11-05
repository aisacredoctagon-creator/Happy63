import type { CSSProperties } from 'react'
import { IMG } from '../config'

/**
 * Topi pesta (topi-pesta.webp, 640x743) yang MENUTUPI SELURUH tanduk hijau Gasing. Posisi dalam PERSEN terhadap kotak sprite
 * (induk harus position: relative/absolute dan seukuran sprite), jadi topi ikut skala, gerak, dan animasi maskot di mana pun
 * dipakai. Nilai dihitung dari bentuk tanduk di tiap bingkai (tools: pencocokan topi terhadap mask tanduk, cakupan >= 99,7%):
 * titik tumpu rotasi/penempatan = pusat bibir topi (56,25% 80,35% dari gambar topi), bukan titik tengah.
 * - gasing : gasing.png dan gasing-sleepy.webp (kedipan) dipakai bersama: satu topi menutup tanduk kedua bingkai
 * - alert  : gasing-alert.webp (kaget, Scene 06b)
 * - back   : gasing-mirrored.webp (menghadap TV, Scene 06)
 * - plane  : plane-mascot.png (1000x452), Gasing di jendela pesawat (Scene 04)
 * Saat pose berganti, topi bergeser halus (transisi CSS .party-hat) mengikuti bentuk tanduk pose baru.
 */
const PLACEMENT = {
  gasing: { left: 12.48, top: -20.34, width: 50.7, rotate: -7 },
  alert: { left: 11.88, top: -16.62, width: 49.28, rotate: -10 },
  back: { left: 9.7, top: -15.76, width: 53.62, rotate: -8 },
  plane: { left: 56.37, top: -11.47, width: 11.96, rotate: -10.5 },
} as const

export type HatVariant = keyof typeof PLACEMENT

export function PartyHat({ variant = 'gasing' }: { variant?: HatVariant }) {
  const p = PLACEMENT[variant]
  const style: CSSProperties = { left: `${p.left}%`, top: `${p.top}%`, width: `${p.width}%`, transform: `rotate(${p.rotate}deg)` }
  return <img className="party-hat" src={IMG.partyHat} alt="" draggable={false} style={style} />
}
