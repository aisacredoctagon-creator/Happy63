import { useSyncExternalStore } from 'react'

/**
 * Mode hemat: mematikan/mengurangi efek yang paling berat di GPU (filter drop-shadow di sprite yang bergerak, matahari
 * raksasa di peta, bayangan besar pop-up, jumlah awan/kilau/konfeti) supaya perangkat lemah tidak patah-patah.
 * Tampilan tetap utuh, hanya lebih sederhana. Aturan CSS-nya ada di akhir src/index.css (html.lite ...).
 *
 * Penentuan (urutan prioritas):
 *   1. ?lite=1 / ?lite=0 di URL (sekaligus disimpan di browser)
 *   2. pilihan pengguna di panel pengaturan (disimpan di localStorage)
 *   3. otomatis: RAM <= 4 GB, CPU <= 4 inti, atau mode "Penghemat Data" aktif
 *      (deviceMemory hanya ada di Chrome/Android; Safari/iPhone tidak melaporkannya, jadi di sana mode normal)
 */
const KEY = 'ultah-lite'

function stored(): boolean | null {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'on' ? true : v === 'off' ? false : null
  } catch {
    return null
  }
}

function save(on: boolean | null) {
  try {
    if (on === null) localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, on ? 'on' : 'off')
  } catch {
    /* penyimpanan diblokir: abaikan, pilihan hanya berlaku di sesi ini */
  }
}

function detect(): boolean {
  const q = new URLSearchParams(window.location.search).get('lite')
  if (q === '1' || q === '0') {
    save(q === '1')
    return q === '1'
  }
  const s = stored()
  if (s !== null) return s
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } }
  return (
    (typeof nav.deviceMemory === 'number' && nav.deviceMemory <= 4) ||
    (typeof nav.hardwareConcurrency === 'number' && nav.hardwareConcurrency <= 4) ||
    nav.connection?.saveData === true
  )
}

let lite = false
const listeners = new Set<() => void>()
const apply = () => document.documentElement.classList.toggle('lite', lite)

/** dipanggil sekali sebelum render pertama (main.tsx) */
export function initPerf() {
  lite = detect()
  apply()
}

export function setLite(on: boolean) {
  lite = on
  save(on)
  apply()
  listeners.forEach((l) => l())
}

export const isLite = () => lite

/** true bila mode hemat aktif; komponen ikut render ulang saat pengguna mengubahnya */
export function useLite() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => lite,
  )
}
