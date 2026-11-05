import type { CSSProperties } from 'react'
import { IMG } from '../config'

/**
 * Topi pesta (topi-pesta.webp, 640x743) yang MENUTUPI SELURUH tanduk hijau Gasing dan menempel rapat di kepala. Posisi dalam
 * PERSEN terhadap kotak sprite (induk harus position: relative/absolute dan seukuran sprite), jadi topi ikut skala, gerak, dan
 * animasi maskot di mana pun dipakai. Penempatan dihitung dari bentuk tanduk tiap bingkai (cakupan tanduk penuh):
 * - normal : badan Glossy (Scene 01, 02, 05, 06 saat berjalan/diam); rapat sedikit di bawah sambungan tanduk-kepala
 * - alert  : gasing-alert.webp (kaget, Scene 06); lebih rapat: ditekan ke bawah (scaleY 0,9) dan sedikit miring
 * - back   : gasing-mirrored.webp (menghadap TV, Scene 06); kerapatan seperti normal
 * - plane  : plane-mascot.png (1000x452), Gasing di jendela pesawat (Scene 04); kerapatan seperti normal
 * Titik tumpu rotasi/tekan = pusat bibir topi (56,25% 80,35% dari gambar topi). Saat pose berganti, topi bergeser halus
 * (transisi CSS .party-hat 0,22 s), jadi kerapatan normal -> kaget berubah tanpa lompatan.
 * Urutan layer di Mascot: badan, topi, lalu mata/alis paling depan (menimpa topi).
 */
const PLACEMENT = {
  normal: { left: 12.11, top: -17.03, width: 53.62, rotate: -8, scaleY: 1 },
  alert: { left: 12.79, top: -17.56, width: 53.33, rotate: -7.9, scaleY: 0.9 },
  back: { left: 10.07, top: -15.37, width: 54.54, rotate: -8, scaleY: 1 },
  plane: { left: 56.27, top: -10.62, width: 11.87, rotate: -10.5, scaleY: 1 },
} as const

export type HatVariant = keyof typeof PLACEMENT

export function PartyHat({ variant = 'normal' }: { variant?: HatVariant }) {
  const p = PLACEMENT[variant]
  const style: CSSProperties = {
    left: `${p.left}%`,
    top: `${p.top}%`,
    width: `${p.width}%`,
    transform: `rotate(${p.rotate}deg) scale(1, ${p.scaleY})`,
  }
  return <img className="party-hat" src={IMG.partyHat} alt="" draggable={false} style={style} />
}
