/**
 * Warna pastel/pucat untuk amplop di atas pop-up surat.
 * Semua pengaturan kepucatan ada di ENVELOPE_PASTEL; ubah angkanya untuk membuat amplop lebih pekat/lebih pucat.
 *  - lighten : 0..1, seberapa jauh dicampur ke putih (naikkan = lebih pucat)
 *  - desat   : 0..1, seberapa banyak saturasi dikurangi (naikkan = lebih kelabu/faded)
 */
export const ENVELOPE_PASTEL = {
  body: { lighten: 0.74, desat: 0.35 }, // badan amplop
  flap: { lighten: 0.58, desat: 0.3 }, // lipatan penutup
  edge: { lighten: 0.4, desat: 0.25 }, // garis tepi
  seal: { lighten: 0.34, desat: 0.2 }, // lingkaran segel tempat ikon love
} as const

/** warna ikon love di segel (tetap cream untuk semua kado) */
export const ENVELOPE_HEART = '#fff1cf'

function hexToHsl(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16)
  const r = ((n >> 16) & 255) / 255
  const g = ((n >> 8) & 255) / 255
  const b = (n & 255) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  const d = max - min
  if (d === 0) return [0, 0, l]
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = 0
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0)
  else if (max === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4
  return [h * 60, s, l]
}

function hslToCss(h: number, s: number, l: number) {
  return `hsl(${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%)`
}

/** versi pastel dari warna hex: saturasi diturunkan, kecerahan dinaikkan */
export function pastel(hex: string, { lighten, desat }: { lighten: number; desat: number }) {
  const [h, s, l] = hexToHsl(hex)
  return hslToCss(h, s * (1 - desat), l + (1 - l) * lighten)
}
