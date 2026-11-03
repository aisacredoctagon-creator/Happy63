import type { SceneId } from '../types'

/**
 * Daftar resmi scene (urutan alur pengguna). Nomor dan nama inilah yang dipakai untuk feedback ("ubah animasi di
 * Scene 05 - Bandara Bagasi"), komentar header di tiap file scene, label debug, dan SCENES.md.
 * Scene baru: tambahkan di sini DAN di SCENES.md.
 *
 * `id`    = ID scene yang dirender App (null = Layar Pembuka, tampil sebelum scene mana pun).
 * `start` = (hanya dev) fase awal bila `id` dipakai bersama beberapa scene, mis. Scene 06-08 satu komponen.
 */
export interface SceneInfo {
  no: string
  name: string
  id: SceneId | null
  start?: 'tv' | 'ended'
}

export const SCENE_LIST: SceneInfo[] = [
  { no: '01', name: 'Layar Pembuka', id: null },
  { no: '02', name: 'Kabin Pesawat', id: 'scene02' },
  { no: '03', name: 'Pesawat di Langit', id: 'scene03' },
  { no: '04', name: 'Peta Kado', id: 'scene04' },
  { no: '05', name: 'Bandara Bagasi', id: 'scene05' },
  { no: '06', name: 'Gasing Melihat TV', id: 'scene06' },
  { no: '07', name: 'Video Ucapan', id: 'scene06', start: 'tv' },
  { no: '08', name: 'Kartu Penutup', id: 'scene06', start: 'ended' },
]

export const sceneLabel = (no: string) => {
  const s = SCENE_LIST.find((x) => x.no === no)
  return s ? `Scene ${s.no} - ${s.name}` : `Scene ${no}`
}
