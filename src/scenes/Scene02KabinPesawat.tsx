// Scene 02 - Kabin Pesawat
// 02a Fade dari Hitam (0-2,4 s) -> 02b Zoom Keluar (2,4-6,0 s) -> 02c Crossfade ke Langit (1,4 s, diatur App ke Scene 03)
import { motion, useMotionValue } from 'framer-motion'
import type { ReactNode } from 'react'
import { useLoop } from '../audio/audio'
import { DriftClouds } from '../components/Atmosphere'
import { CABIN, CABIN_COLORS, GASING_ASPECT, IMG, STAGE_H, STAGE_W } from '../config'
import { useSceneTag } from '../dev/sceneTag'
import { useSequence } from '../hooks/useSequence'

/**
 * Scene 02 - Kabin Pesawat: Gasing di kabin pesawat. Dibangun dari layer terpisah:
 *   langit (langit1.png, scroll horizontal) + awan (awan.png / awan2.png) di belakang,
 *   interior kabin (Dalam Pesawat.png, jendela transparan), lalu karakter (Airplane Seat Cartoon Character Cutouts.png,
 *   Floating Family Cartoon Stickers.png dan Character GASING.png) dengan animasi idle halus.
 * Koordinat dalam piksel gambar kabin (1983x793). Gambar kabin sangat lebar, jadi ditampilkan "cover" (memenuhi tinggi
 * layar, sisi kiri/kanan terpotong secara alami) tanpa dikecilkan.
 */
const S = Math.max(STAGE_W / CABIN.w, STAGE_H / CABIN.h)
const PLATE_LEFT = (STAGE_W - CABIN.w * S) / 2
const PLATE_TOP = (STAGE_H - CABIN.h * S) / 2
/** langit di jendela: langit1.png setinggi kabin; 2 salinan (asli + cermin) = 1 siklus loop mulus */
const SKY_W = Math.round((1672 * CABIN.h) / 941)

/**
 * Tempat duduk (9 kursi). SEAT_DX = pergeseran tiap kursi terhadap kursi 2 (template-matching pada Dalam Pesawat.png).
 * BUTT_X = titik di bantalan tempat pantat karakter bersandar; BUTT_Y = permukaan bantalan.
 */
const SEAT_DX = [-222, 0, 210, 419, 622, 824, 1029, 1235, 1443]
const BUTT_X = SEAT_DX.map((dx) => 345 + dx)
const BUTT_Y = 548
/** sandaran tangan kursi 2 (poligon dalam piksel kabin); disalin ke depan karakter agar tangan kursi menutupi pangkuan */
const ARMREST: Array<[number, number]> = [
  [284, 538], [290, 526], [305, 520], [330, 513], [360, 509], [395, 507], [415, 509], [421, 520],
  [414, 530], [395, 533], [365, 538], [335, 545], [315, 552], [300, 556], [288, 553],
]
const ARMREST_PATH = SEAT_DX.map(
  (dx) => 'M' + ARMREST.map(([x, y], i) => `${i ? 'L' : ''}${x + dx} ${y}`).join(' ') + ' Z',
).join(' ')

interface PartDef {
  /** area yang digerakkan (piksel sprite) */
  x: number
  y: number
  w: number
  h: number
  pivot: [number, number]
  anim: string
  dur: number
  delay?: number
}
interface EyeDef {
  cx: number
  cy: number
  rx: number
  ry: number
  rot?: number
  color: string
  /** jeda kedip (detik) supaya tidak serempak */
  delay?: number
}
interface CharDef {
  key: string
  src: string
  /** ukuran asli sprite */
  w: number
  h: number
  /** kursi (1-7), titik duduk pada sprite (piksel sprite), skala, dan koreksi halus (piksel kabin) */
  seat: number
  rest: [number, number]
  scale: number
  nudge?: [number, number]
  breathe?: { anim: string; dur: number; delay?: number }
  parts?: PartDef[]
  eyes?: EyeDef[]
  /** layer tambahan di dalam sprite (mis. tanda zZ) */
  extra?: ReactNode
}

const GASING_H = 190
const CHARS: CharDef[] = [
  {
    key: 'woman',
    src: IMG.charWoman,
    w: 407,
    h: 742,
    seat: 2,
    rest: [90, 500],
    scale: 0.38,
    breathe: { anim: 'idle-breathe', dur: 4.2 },
    parts: [
      { x: 0, y: 0, w: 320, h: 330, pivot: [190, 300], anim: 'mm-sway-s', dur: 5, delay: -1 },
      { x: 285, y: 185, w: 120, h: 140, pivot: [330, 300], anim: 'mm-thumb', dur: 0.9 },
    ],
    eyes: [
      { cx: 184, cy: 138, rx: 13, ry: 16, color: '#fdad7a', delay: -1.2 },
      { cx: 245, cy: 141, rx: 13, ry: 16, color: '#fdad7a', delay: -1.2 },
    ],
  },
  {
    key: 'man',
    src: IMG.charMan,
    w: 456,
    h: 768,
    seat: 3,
    rest: [90, 520],
    scale: 0.38,
    breathe: { anim: 'idle-breathe', dur: 4.8, delay: -1.5 },
    parts: [
      { x: 80, y: 0, w: 230, h: 245, pivot: [170, 235], anim: 'mm-sway-s', dur: 4.6 },
      { x: 160, y: 255, w: 220, h: 165, pivot: [270, 400], anim: 'mm-book', dur: 5.4 },
    ],
    eyes: [
      { cx: 187, cy: 161, rx: 14, ry: 17, color: '#fdab78', delay: -3 },
      { cx: 238, cy: 163, rx: 14, ry: 17, color: '#fdab78', delay: -3 },
    ],
  },
  {
    key: 'girl',
    src: IMG.charGirl,
    w: 384,
    h: 476,
    seat: 4,
    rest: [120, 320],
    scale: 0.4,
    breathe: { anim: 'idle-breathe-deep', dur: 3.6, delay: -0.8 },
    parts: [
      { x: 150, y: 140, w: 170, h: 125, pivot: [230, 255], anim: 'mm-breathe', dur: 3.6 },
      { x: 50, y: 0, w: 195, h: 215, pivot: [150, 205], anim: 'mm-nod', dur: 4.4 },
    ],
    extra: <img className="zz" src={IMG.charZz} alt="" draggable={false} style={{ left: 195, top: -72, width: 76 }} />,
  },
  {
    key: 'boy',
    src: IMG.charBoy,
    w: 409,
    h: 580,
    seat: 6,
    rest: [100, 405],
    scale: 0.4,
    breathe: { anim: 'idle-breathe', dur: 3.4, delay: -0.4 },
    parts: [
      { x: 35, y: 0, w: 225, h: 215, pivot: [140, 215], anim: 'mm-sway-s', dur: 2.8, delay: -0.6 },
      { x: 120, y: 225, w: 180, h: 95, pivot: [200, 300], anim: 'mm-thumb', dur: 0.22 },
    ],
    eyes: [
      { cx: 146, cy: 169, rx: 13, ry: 16, color: '#ef9b6c', delay: -2 },
      { cx: 196, cy: 173, rx: 13, ry: 16, color: '#ef9b6c', delay: -2 },
    ],
  },
  // kursi 1 dan 9 (di tepi; tampak penuh pada jendela yang lebih lebar dari 16:9)
  {
    key: 'bWoman',
    src: IMG.charBWoman,
    w: 437,
    h: 745,
    seat: 1,
    rest: [95, 505],
    scale: 0.36,
    breathe: { anim: 'idle-breathe', dur: 4.4, delay: -3 },
    parts: [{ x: 0, y: 0, w: 330, h: 340, pivot: [200, 310], anim: 'mm-sway-s', dur: 5.2, delay: -2.4 }],
  },
  {
    key: 'bGirl',
    src: IMG.charBGirl,
    w: 421,
    h: 549,
    seat: 9,
    rest: [135, 345],
    scale: 0.37,
    breathe: { anim: 'idle-breathe-deep', dur: 3.6, delay: -2 },
    parts: [{ x: 160, y: 150, w: 190, h: 140, pivot: [250, 280], anim: 'mm-breathe', dur: 3.6 }],
  },
  // kursi 6 dan 7: karakter dari "Floating Family Cartoon Stickers.png"
  {
    key: 'bMan',
    src: IMG.charBMan,
    w: 465,
    h: 764,
    seat: 7,
    rest: [95, 525],
    scale: 0.38,
    breathe: { anim: 'idle-breathe', dur: 4.5, delay: -2.2 },
    parts: [
      { x: 60, y: 0, w: 260, h: 260, pivot: [180, 245], anim: 'mm-sway-s', dur: 5.2, delay: -2 },
      { x: 160, y: 265, w: 225, h: 160, pivot: [270, 410], anim: 'mm-book', dur: 6 },
    ],
    eyes: [
      { cx: 185, cy: 162, rx: 14, ry: 17, color: '#fdab78', delay: -4.1 },
      { cx: 230, cy: 166, rx: 14, ry: 17, color: '#fdab78', delay: -4.1 },
    ],
  },
  {
    key: 'bBoy',
    src: IMG.charBBoy,
    w: 455,
    h: 608,
    seat: 8,
    rest: [100, 420],
    scale: 0.35,
    breathe: { anim: 'idle-breathe', dur: 3.2, delay: -1.1 },
    parts: [
      { x: 40, y: 0, w: 225, h: 225, pivot: [150, 225], anim: 'mm-sway-s', dur: 3.1, delay: -1.4 },
      { x: 125, y: 235, w: 190, h: 100, pivot: [210, 310], anim: 'mm-thumb', dur: 0.24 },
    ],
    eyes: [
      { cx: 160, cy: 178, rx: 14, ry: 17, color: '#ef9b6c', delay: -0.7 },
      { cx: 213, cy: 182, rx: 14, ry: 17, color: '#ef9b6c', delay: -0.7 },
    ],
  },
]

function Part({ p, src, W, H }: { p: PartDef; src: string; W: number; H: number }) {
  return (
    <div
      className={`mm ${p.anim}`}
      style={{
        left: p.x,
        top: p.y,
        width: p.w,
        height: p.h,
        transformOrigin: `${p.pivot[0] - p.x}px ${p.pivot[1] - p.y}px`,
        animationDuration: `${p.dur}s`,
        animationDelay: `${p.delay ?? 0}s`,
      }}
    >
      <img src={src} alt="" draggable={false} style={{ left: -p.x, top: -p.y, width: W, height: H }} />
    </div>
  )
}

function Lid({ e, edge }: { e: EyeDef; edge?: string }) {
  return (
    <div className="lid-wrap" style={{ left: e.cx - e.rx, top: e.cy - e.ry, width: e.rx * 2, height: e.ry * 2, transform: `rotate(${e.rot ?? 0}deg)` }}>
      <div className="lid" style={{ background: e.color, animationDelay: `${e.delay ?? 0}s`, borderBottomColor: edge ?? '#2a1a12' }} />
    </div>
  )
}

function Character({ c }: { c: CharDef }) {
  const left = BUTT_X[c.seat - 1] - c.rest[0] * c.scale + (c.nudge?.[0] ?? 0)
  const top = BUTT_Y - c.rest[1] * c.scale + (c.nudge?.[1] ?? 0)
  return (
    <>
      {/* bayangan lembut di bantalan di bawah karakter */}
      <i className="seat-shadow" style={{ left: BUTT_X[c.seat - 1] - 70, top: BUTT_Y - 12 }} />
    <div className="char" style={{ left, top, width: c.w, height: c.h, transform: `scale(${c.scale})` }}>
      <div
        className={`char-body ${c.breathe?.anim ?? ''}`}
        style={{ animationDuration: `${c.breathe?.dur ?? 4}s`, animationDelay: `${c.breathe?.delay ?? 0}s` }}
      >
        <img className="char-img" src={c.src} alt="" draggable={false} style={{ width: c.w, height: c.h }} />
        {c.parts?.map((p, i) => <Part key={i} p={p} src={c.src} W={c.w} H={c.h} />)}
        {c.eyes?.map((e, i) => <Lid key={i} e={e} />)}
        {c.extra}
      </div>
    </div>
    </>
  )
}

/** Gasing di kursi ketiga: bobbing + kedip (Character GASING.png) */
const GW = GASING_H * GASING_ASPECT
const G_SCALE = GW / 900
/** Gasing duduk di bantalan kursi 3; titik duduk = dasar mangkuk (y=880 pada sprite 900x1074), ekor disembunyikan di balik kursi */
const GASING_REST_Y = 880
const GASING = { x: BUTT_X[4] - GW / 2 + 5, y: BUTT_Y + 6 - GASING_REST_Y * G_SCALE }

interface Props {
  onDone: () => void
}

export function Scene02KabinPesawat({ onDone }: Props) {
  useSceneTag('02')
  useLoop('cabin', { fadeIn: 2.5, fadeOut: 1.5 })

  // fokus awal pada Gasing
  const ox = PLATE_LEFT + (GASING.x + GW / 2) * S
  const oy = PLATE_TOP + (GASING.y + GASING_H / 2) * S
  const zoom = useMotionValue(1.5)
  const tx = useMotionValue(STAGE_W / 2 - ox)
  const ty = useMotionValue(560 - oy)

  // hanya dev: ?still=1 menahan scene ini pada tampilan penuh (tanpa zoom dan tanpa pindah scene) untuk pengecekan
  const still = import.meta.env.DEV && new URLSearchParams(window.location.search).has('still')

  useSequence(async (seq) => {
    if (still) {
      zoom.set(1)
      tx.set(0)
      ty.set(0)
      return
    }
    zoom.set(seq.reduced ? 1 : 1.5)
    tx.set(seq.reduced ? 0 : STAGE_W / 2 - ox)
    ty.set(seq.reduced ? 0 : 560 - oy)
    await seq.wait(2.4) // 02a Fade dari Hitam: fade-in dari hitam + jeda ~2 detik
    if (seq.dead) return
    const ease = [0.22, 1, 0.36, 1] as const // ease-out
    seq.sfx('zoomOut') // 02b Zoom Keluar: kamera menarik mundur dari Gasing
    await Promise.all([
      seq.to(zoom, 1, { duration: 3.6, ease }),
      seq.to(tx, 0, { duration: 3.6, ease }),
      seq.to(ty, 0, { duration: 3.6, ease }),
    ])
    await seq.wait(0.5)
    if (!seq.dead) onDone() // 02c Crossfade ke Langit (App memulai cross-fade ke Scene 03)
  }, [])

  return (
    <div className="scene scene02">
      <motion.div className="cam" style={{ x: tx, y: ty, scale: zoom, transformOrigin: `${ox}px ${oy}px` }}>
        {/* cadangan untuk jendela yang sangat tinggi/lebar (di atas rasio kabin 2,5:1): warna langit-langit dan karpet */}
        <div className="cabin-backdrop" aria-hidden style={{ background: `linear-gradient(to bottom, ${CABIN_COLORS.ceil} 0, ${CABIN_COLORS.ceil} 800px, ${CABIN_COLORS.floor} 1880px, ${CABIN_COLORS.floor} 100%)` }} />
        <div className="plate" style={{ width: CABIN.w, height: CABIN.h, left: PLATE_LEFT, top: PLATE_TOP, transform: `scale(${S})` }}>
          {/* di luar jendela: langit1.png (scroll horizontal, loop mulus) + awan.png/awan2.png, hanya tampak lewat lubang jendela */}
          <div className="win-layer" style={{ maskImage: `url(${IMG.cabinWindows})`, WebkitMaskImage: `url(${IMG.cabinWindows})` }} aria-hidden>
            <div className="sky-track" style={{ width: SKY_W * 4, height: CABIN.h, ['--sky-loop' as string]: `${SKY_W * 2}px` }}>
              {[0, 1, 2, 3].map((i) => (
                <img key={i} src={IMG.langit1} alt="" draggable={false} style={{ width: SKY_W, height: CABIN.h, transform: i % 2 ? 'scaleX(-1)' : undefined }} />
              ))}
            </div>
            <DriftClouds yMin={340} yMax={470} count={6} speed={22} size={[90, 170]} opacity={1} />
          </div>

          <img className="plate-img" src={IMG.cabinShell} alt="Kabin pesawat" draggable={false} />

          {CHARS.map((c) => (
            <Character key={c.key} c={c} />
          ))}

          {/* Gasing duduk di kursi 3 */}
          <i className="seat-shadow" style={{ left: BUTT_X[4] - 60, top: BUTT_Y - 10, width: 130 }} />
          <div className="char" style={{ left: GASING.x, top: GASING.y, width: 900, height: 1074, transform: `scale(${G_SCALE})` }}>
            <div className="char-body gasing-bob">
              <img className="char-img" src={IMG.gasing} alt="Gasing" draggable={false} style={{ width: 900, height: 1074, clipPath: 'inset(0 0 17% 0)' }} />
              <Lid e={{ cx: 420, cy: 405, rx: 92, ry: 142, rot: -10, color: '#b2d34b', delay: -0.5 }} edge="#26300a" />
              <Lid e={{ cx: 611, cy: 347, rx: 88, ry: 138, rot: -12, color: '#b2d34b', delay: -0.5 }} edge="#26300a" />
            </div>
          </div>

          {/* sandaran tangan kursi di DEPAN karakter: salinan bagian armrest dari cangkang kabin (clip-path) */}
          <div className="fg-seat" style={{ clipPath: `path('${ARMREST_PATH}')` }} aria-hidden>
            <img src={IMG.cabinShell} alt="" draggable={false} />
          </div>
        </div>
      </motion.div>
      <motion.div
        className="blackout"
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 1.6, ease: 'easeIn', delay: 0.2 }}
      />
    </div>
  )
}
