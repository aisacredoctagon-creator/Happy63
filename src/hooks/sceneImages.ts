import { BAG_SIZE, CLOUDS, GIFT_SIZE, IMG, bagImg, giftImg } from '../config'
import type { SceneId } from '../types'

/**
 * Gambar yang dipakai tiap scene, dan scene mana yang mungkin tampil sesudahnya. Dipakai untuk men-decode gambar scene
 * BERIKUTNYA sebelum transisi dimulai, supaya saat scene itu muncul tidak ada decode besar di tengah animasi (penyebab
 * background dan aset muncul bertahap per ubin di Chrome mobile).
 *
 * Hanya scene saat ini dan kemungkinan berikutnya yang di-decode dan ditahan (bukan semua gambar sekaligus): men-decode
 * semuanya membuat memori ponsel jebol (lihat catatan di usePreload).
 */
/** maskot berlapis (badan, mata terbuka/tertutup, topi); pose kaget dan menghadap TV hanya dipakai Scene 06 */
const MASCOT = [IMG.gasingBadan, IMG.mataBuka, IMG.mataTutup, IMG.partyHat]

const SCENE_IMAGES: Record<SceneId, string[]> = {
  scene02: [
    IMG.cabinShell, IMG.cabinWindows, IMG.langit1, ...MASCOT,
    IMG.charWoman, IMG.charMan, IMG.charGirl, IMG.charBoy, IMG.charZz,
    IMG.charBWoman, IMG.charBMan, IMG.charBGirl, IMG.charBBoy,
  ],
  scene03: [IMG.langitBg, IMG.pesawatLangit, ...CLOUDS],
  scene04: [
    IMG.petaBg, IMG.planeMascot, IMG.partyHat, IMG.btnMendarat, ...CLOUDS,
    ...GIFT_SIZE.map((_, i) => giftImg(i, 'closed')),
  ],
  scene05: [IMG.bandara, ...MASCOT, ...BAG_SIZE.map((_, i) => bagImg(i))],
  scene06: [IMG.ruangTvBg, IMG.tv, ...MASCOT, IMG.gasingAlert, IMG.gasingAlertMata, IMG.gasingMirrored],
}

/** scene yang bisa menyusul tiap scene (lihat App.tsx) */
const NEXT: Record<SceneId, SceneId[]> = {
  scene02: ['scene03'],
  scene03: ['scene04'],
  scene04: ['scene05'], // "Mulai Ulang" ke scene02 jarang dipakai: di-decode saat diperlukan (goFade menunggu prepareScene)
  scene05: ['scene06'],
  scene06: ['scene04'],
}

/** elemen Image yang ditahan supaya bitmap hasil decode tidak langsung dibuang browser */
const held = new Map<string, HTMLImageElement>()
const pending = new Map<string, Promise<void>>()

function decodeOne(url: string): Promise<void> {
  const have = pending.get(url)
  if (have) return have
  const img = new Image()
  img.decoding = 'async'
  img.src = url
  held.set(url, img)
  const p = (img.decode ? img.decode() : Promise.resolve()).catch(() => {
    /* gagal dimuat/di-decode: jangan menahan transisi */
  })
  pending.set(url, p)
  return p
}

/** decode semua gambar scene; selesai bila semua beres atau setelah `timeoutMs` (jaringan lambat tidak boleh menggantung) */
export function prepareScene(id: SceneId, timeoutMs = 1800): Promise<void> {
  const all = Promise.all(SCENE_IMAGES[id].map(decodeOne)).then(() => undefined)
  return Promise.race([all, new Promise<void>((r) => setTimeout(r, timeoutMs))])
}

/** tahan hanya gambar scene `current` dan kemungkinan berikutnya; sisanya dilepas */
export function holdScenes(current: SceneId) {
  const keep = new Set([...SCENE_IMAGES[current], ...NEXT[current].flatMap((n) => SCENE_IMAGES[n])])
  for (const url of [...held.keys()]) {
    if (!keep.has(url)) {
      held.delete(url)
      pending.delete(url)
    }
  }
}

/** decode di muka scene berikutnya selagi pemain masih di scene ini (dipanggil saat idle) */
export function prefetchNext(current: SceneId) {
  holdScenes(current)
  for (const n of NEXT[current]) void prepareScene(n, 10_000)
}
