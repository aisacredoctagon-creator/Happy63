export type SceneId = 'scene1' | 'scene2' | 'scene3' | 'scene4' | 'scene5'

/** Cara berpindah antar scene. */
export type Swap =
  | { kind: 'cloud' } // CloudTransition (awan dari kanan menutup, lalu terbuka)
  | { kind: 'fade'; duration: number } // cross-fade halus
