import { SCENE_LIST } from '../data/scenes'
import type { SceneInfo } from '../data/scenes'

/**
 * Lompat scene untuk pengecekan (hanya mode dev). Parameter URL:
 *   ?scene=05        langsung ke Scene 05 (01-08; angka tanpa nol di depan juga boleh)
 *   ?scene=04c       Peta Kado dengan semua kado sudah terbuka (tombol "Mendarat" tampil)
 *   ?scene=scene3    format lama (nomor lama, = Peta Kado) tetap dikenali: scene1..scene5 -> Scene 02..06
 *   &all=1           semua kado terbuka dan Mulai Ulang tersedia (seperti setelah satu putaran penuh)
 * Setelah halaman dimuat tetap klik "Mulai Perjalanan" (diperlukan browser untuk membuka audio).
 */
export interface DevJump {
  scene: SceneInfo | null
  /** semua kado sudah dibuka */
  allGifts: boolean
  /** sudah pernah menyelesaikan satu putaran (tombol Mulai Ulang) */
  completed: boolean
}

export function readDevJump(search: string): DevJump {
  const p = new URLSearchParams(search)
  const all = !!p.get('all')
  let raw = (p.get('scene') ?? '').trim().toLowerCase()

  const legacy = /^scene([1-5])$/.exec(raw)
  if (legacy) raw = String(Number(legacy[1]) + 1)

  const m = /^(\d{1,2})([a-z])?$/.exec(raw)
  const no = m ? m[1].padStart(2, '0') : ''
  const scene = SCENE_LIST.find((s) => s.no === no && s.id) ?? null
  return {
    scene,
    allGifts: all || (no === '04' && m?.[2] === 'c'),
    completed: all,
  }
}
