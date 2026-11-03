/**
 * ID scene yang dirender App (Scene 01 "Layar Pembuka" bukan scene: ia tampil selama `started` masih false).
 * Nomor dan nama resmi ada di src/data/scenes.ts dan SCENES.md. Scene 06-08 memakai satu komponen (scene06).
 */
export type SceneId = 'scene02' | 'scene03' | 'scene04' | 'scene05' | 'scene06'

/** Cara berpindah antar scene. */
export type Swap =
  | { kind: 'cloud' } // CloudTransition (awan dari kanan menutup, lalu terbuka)
  | { kind: 'fade'; duration: number } // cross-fade halus
