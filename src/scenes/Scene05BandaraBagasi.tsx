// Scene 05 - Bandara Bagasi
// 05a Ban Berjalan (Gasing datang, koper di ban) -> 05b Koper Melompat (~1 s) -> 05c Berjalan ke Kanan (~4,4 s, lalu cross-fade ke Scene 06)
import { motion, useAnimationFrame, useMotionValue, useTransform } from 'framer-motion'
import { useRef, useState } from 'react'
import { GasingSprite } from '../components/GasingSprite'
import { EdgeExtend } from '../components/EdgeExtend'
import type { GasingState } from '../components/GasingSprite'
import { Baggage, bagHeight } from '../components/Baggage'
import { GASING_ASPECT, IMG, WIDE } from '../config'
import { useLoop } from '../audio/audio'
import { useSceneTag } from '../dev/sceneTag'
import { useSequence } from '../hooks/useSequence'

const F = WIDE.f
const GH = 400
const GW = GH * GASING_ASPECT
/** posisi awal telapak Gasing (tengah-bawah sprite) dan lantai */
const START_X = 846
const FLOOR_Y = 922
const BAG_W = 150
const BAG_H = bagHeight(1, BAG_W)

/** permukaan atas ban berjalan (px gambar asli, scene 4) */
const BELT_POLY = [[880, 506], [940, 488], [1010, 474], [1080, 462], [1983, 462], [1983, 517], [1200, 517], [1000, 515], [900, 512]]
  .map(([x, y]) => `${(x * F).toFixed(0)}px ${(y * F).toFixed(0)}px`)
  .join(',')
const BELT_Y = 684 // alas koper di ban (px dunia)
const BELT_LEFT_END = 1330

const DECOYS = [
  { bag: 0, w: 128, delay: -1.2 },
  { bag: 2, w: 122, delay: -4.3 },
  { bag: 3, w: 126, delay: -6.6 },
]

interface Props {
  onDone: () => void
}

/** Scene 05 - Bandara Bagasi: Gasing mengambil koper dari ban berjalan lalu berjalan ke kanan (kamera ikut bergeser). */
export function Scene05BandaraBagasi({ onDone }: Props) {
  useSceneTag('05')
  useLoop('airport', { fadeIn: 2, fadeOut: 1.5 })
  const cam = useMotionValue(0)
  const worldX = useTransform(cam, (v) => -v)

  const gx = useMotionValue(START_X)
  const gy = useMotionValue(FLOOR_Y)
  const [gState, setGState] = useState<GasingState>('idle')

  // koper utama (biru): dari ban, lompat ke lantai, lalu mengekor Gasing
  const sx = useMotionValue(2600)
  const sy = useMotionValue(BELT_Y)
  const srot = useMotionValue(0)
  const follow = useRef(false)
  // koper sudah menempel pada Gasing (tali penariknya sudah dibuang oleh teman, state ini tetap dipakai untuk suara roda)
  const [carried, setCarried] = useState(false)
  // roda koper hanya terdengar saat koper ditarik berjalan
  useLoop('wheels', { enabled: carried && gState === 'walk', fadeIn: 0.5, fadeOut: 0.6 })

  useAnimationFrame((_, delta) => {
    if (!follow.current) return
    const k = 1 - Math.exp(-delta / 1000 / 0.16)
    const target = gx.get() - 330
    const cur = sx.get()
    sx.set(cur + (target - cur) * k)
    sy.set(FLOOR_Y - 6)
    srot.set(Math.max(-9, Math.min(9, (target - cur) / 22)))
  })

  const hop = useMotionValue(0)
  useSequence(async (seq) => {
    cam.set(0)
    gx.set(START_X)
    sx.set(2600)
    sy.set(BELT_Y)
    srot.set(0)
    follow.current = false
    setCarried(false)
    setGState('idle')

    // 05a Ban Berjalan: koper bergerak di ban, Gasing berjalan menjemput
    const belt = seq.to(sx, BELT_LEFT_END, { duration: 5.2, ease: 'linear' })
    await seq.wait(1.0)
    if (seq.dead) return
    setGState('walk')
    await seq.to(gx, 1090, { duration: 2.6, ease: [0.45, 0, 0.35, 1] })
    if (seq.dead) return
    setGState('ready')
    await belt
    if (seq.dead) return
    await seq.wait(0.25)

    // 05b Koper Melompat: dari ban, melewati kepala Gasing, mendarat di belakangnya
    const startX = sx.get()
    const landX = gx.get() - 330
    const unsub = hop.on('change', (v) => {
      sx.set(startX + (landX - startX) * v)
      sy.set(BELT_Y + (FLOOR_Y - 6 - BELT_Y) * v - 470 * Math.sin(Math.PI * v))
      srot.set(-360 * v)
    })
    seq.sfx('hopUp')
    await seq.to(hop, 1, { duration: 1.0, ease: [0.3, 0, 0.6, 1] })
    unsub()
    if (seq.dead) return
    seq.sfx('thud') // koper mendarat di lantai
    srot.set(0)
    follow.current = true
    setCarried(true)
    setGState('pop')
    await seq.wait(1.1)
    if (seq.dead) return

    // 05c Berjalan ke Kanan: kamera ikut menggeser
    setGState('walk')
    const walk = seq.to(gx, 1800, { duration: 4.4, ease: [0.45, 0, 0.45, 1] })
    await seq.wait(0.25)
    await Promise.all([walk, seq.to(cam, WIDE.worldW - 1920, { duration: 4.2, ease: [0.45, 0, 0.45, 1] })])
    if (seq.dead) return
    setGState('idle')
    await seq.wait(0.5)
    if (!seq.dead) onDone()
  }, [])

  return (
    <div className="scene scene05">
      <motion.div className="world" style={{ width: WIDE.worldW, x: worldX }}>
        <EdgeExtend src={IMG.bandara} w={WIDE.worldW} h={1080} />
        <img className="world-img" src={IMG.bandara} alt="Area pengambilan bagasi di bandara" draggable={false} width={WIDE.worldW} height={1080} />

        {/* ban berjalan bergerak */}
        <div className="belt" style={{ clipPath: `polygon(${BELT_POLY})` }} aria-hidden>
          <div className="belt-slats" />
        </div>

        {/* koper-koper lain di ban. TODO: ganti dengan sprite koper final */}
        {DECOYS.map((d, i) => (
          <div key={i} className="belt-suitcase" style={{ top: BELT_Y - bagHeight(d.bag, d.w), animationDelay: `${d.delay}s` }}>
            <Baggage index={d.bag} width={d.w} />
          </div>
        ))}

        <motion.div className="abs-zero" style={{ x: sx, y: sy, rotate: srot }}>
          <div className="suitcase-anchor" style={{ left: -BAG_W / 2, top: -BAG_H }}>
              <Baggage index={1} width={BAG_W} />
            </div>
        </motion.div>

        <GasingSprite src={IMG.gasingBadan} width={GW} height={GH} x={gx} y={gy} state={gState} />
      </motion.div>
    </div>
  )
}
