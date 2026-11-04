// Scene 06 - Gasing Melihat TV
// Satu komponen untuk tiga scene berurutan (satu rangkaian dengan state bersama):
//   Scene 06 Gasing Melihat TV : 06a Gasing Masuk -> 06b Gasing Kaget -> 06c TV Menyala -> 06d Zoom ke TV   (fase 'room')
//   Scene 07 Video Ucapan      : 07a Video Diputar / 07b Video Belum Ada (placeholder)                      (fase 'tv')
//   Scene 08 Kartu Penutup     : 08a Konfeti dan Kartu -> 08b Putar Ulang                                   (status 'ended')
// Tombol "Kembali ke Peta" (07c Awan Menutup ke Peta, CloudTransition) tersedia di ketiganya.
import { AnimatePresence, motion, useAnimationFrame, useMotionValue } from 'framer-motion'
import { useRef, useState } from 'react'
import { Confetti } from '../components/Confetti'
import { GasingSprite } from '../components/GasingSprite'
import { EdgeExtend } from '../components/EdgeExtend'
import type { GasingState } from '../components/GasingSprite'
import { PrimaryButton } from '../components/PrimaryButton'
import { Baggage, bagHeight } from '../components/Baggage'
import { TvPlayer } from '../components/TvPlayer'
import type { TvStatus } from '../components/TvPlayer'
import { GASING_ASPECT, IMG, WIDE } from '../config'
import { audio, useLoop } from '../audio/audio'
import { useSceneTag } from '../dev/sceneTag'
import { useSequence } from '../hooks/useSequence'

const F = WIDE.f
const GH = 370
const GW = GH * GASING_ASPECT
const FLOOR_Y = 937
const BAG_W = 150
const BAG_H = bagHeight(1, BAG_W)
/** kamera diam: menampilkan dunia mulai x = CAM_X */
const CAM_X = 560
/** posisi telapak Gasing = posisi akhir di Scene 05 (layar x=1020) */
const ENTER_X = 1020 + CAM_X
const STOP_X = ENTER_X + 130

// layar TV pada gambar asli (px): kiri-atas, kanan-atas, kanan-bawah, kiri-bawah
const TV_QUAD = [[1014, 92], [1757, 62], [1757, 472], [1014, 472]]
const TV_POLY = TV_QUAD.map(([x, y]) => `${(x * F).toFixed(0)}px ${(y * F).toFixed(0)}px`).join(',')
const TV_CENTER = { x: ((1014 + 1757) / 2) * F, y: ((92 + 62 + 472 + 472) / 4) * F }
/** pusat layar TV pada bingkai Scene 07 dalam piksel kanvas 1920x1080, dan skala zoom agar sama besar */
const TV_FRAME_CENTER = { x: 962, y: 515 }
const TV_ZOOM = 1.58

interface Props {
  onBack: () => void
  onVideoPlaying: (playing: boolean) => void
  /** hanya dev (?scene=07 / ?scene=08): langsung mulai di TV layar penuh / kartu penutup, tanpa animasi 06a-06d */
  devStart?: 'tv' | 'ended'
}

/** Scene 06 - Gasing Melihat TV (lanjut ke Scene 07 Video Ucapan dan Scene 08 Kartu Penutup): Gasing melihat TV, TV menyala, kamera zoom hingga layar penuh, video ucapan diputar. */
export function Scene06GasingMelihatTv({ onBack, onVideoPlaying, devStart }: Props) {
  useLoop('airport', { fadeIn: 2, fadeOut: 1.5 })
  const tx = useMotionValue(-CAM_X)
  const ty = useMotionValue(0)
  const sc = useMotionValue(1)

  const gx = useMotionValue(ENTER_X)
  const gy = useMotionValue(FLOOR_Y)
  const [gState, setGState] = useState<GasingState>('walk')
  const [surprised, setSurprised] = useState(false)
  const [tvOn, setTvOn] = useState(false)
  const [phase, setPhase] = useState<'room' | 'tv'>('room')
  const [status, setStatus] = useState<TvStatus>('idle')
  const [replayKey, setReplayKey] = useState(0)
  useSceneTag(status === 'ended' ? '08' : phase === 'tv' ? '07' : '06')

  // koper mengekor
  const sx = useMotionValue(ENTER_X - 330)
  const sy = useMotionValue(FLOOR_Y - 6)
  const srot = useMotionValue(0)
  const line = useRef<SVGLineElement>(null)
  useAnimationFrame((_, delta) => {
    const k = 1 - Math.exp(-delta / 1000 / 0.16)
    const target = gx.get() - 330
    const cur = sx.get()
    sx.set(cur + (target - cur) * k)
    srot.set(Math.max(-9, Math.min(9, (target - cur) / 22)))
    const l = line.current
    if (l) {
      l.setAttribute('x1', String(sx.get()))
      l.setAttribute('y1', String(sy.get() - BAG_H + 6))
      l.setAttribute('x2', String(gx.get() - GW * 0.3))
      l.setAttribute('y2', String(gy.get() - GH * 0.16))
    }
  })

  useSequence(async (seq) => {
    if (import.meta.env.DEV && devStart) {
      // hanya dev: lompat langsung ke Scene 07 / 08 (TV layar penuh), melewati 06a-06d
      tx.set(TV_FRAME_CENTER.x - TV_CENTER.x * TV_ZOOM)
      ty.set(TV_FRAME_CENTER.y - TV_CENTER.y * TV_ZOOM)
      sc.set(TV_ZOOM)
      setGState('idle')
      setTvOn(true)
      setPhase('tv')
      if (devStart === 'ended') {
        await seq.wait(0.8)
        if (!seq.dead) handleStatus('ended')
      }
      return
    }
    tx.set(-CAM_X)
    ty.set(0)
    sc.set(1)
    gx.set(ENTER_X)
    sx.set(ENTER_X - 330)
    setGState('walk')
    setSurprised(false)
    setTvOn(false)
    setPhase('room')

    await seq.wait(0.5) // 06a Gasing Masuk
    await seq.to(gx, STOP_X, { duration: 1.3, ease: [0.2, 0.7, 0.3, 1] })
    if (seq.dead) return
    setGState('idle')
    await seq.wait(0.4)
    if (seq.dead) return
    setSurprised(true)
    setGState('pop') // 06b Gasing Kaget
    await seq.wait(1.6)
    if (seq.dead) return
    setGState('idle')
    setTvOn(true) // 06c TV Menyala: layar kedip lalu terang
    seq.sfx('tvFlicker') // 4 tik elektrik mengikuti keyframe tvOn, lalu dengung menyala
    await seq.wait(1.4)
    if (seq.dead) return

    // 06d Zoom ke TV hingga bingkai memenuhi layar
    const ease = [0.5, 0, 0.25, 1] as const
    await Promise.all([
      seq.to(sc, TV_ZOOM, { duration: 2.2, ease }),
      seq.to(tx, TV_FRAME_CENTER.x - TV_CENTER.x * TV_ZOOM, { duration: 2.2, ease }),
      seq.to(ty, TV_FRAME_CENTER.y - TV_CENTER.y * TV_ZOOM, { duration: 2.2, ease }),
    ])
    if (seq.dead) return
    setPhase('tv') // Scene 07 Video Ucapan dimulai
    seq.sfx('pop') // bingkai TV layar penuh muncul
  }, [])

  const handleStatus = (s: TvStatus) => {
    if (s === 'ended' && status !== 'ended') audio.playSfx('fanfare', { delay: 0.25, scope: 'scene' }) // kartu penutup + konfeti
    if (s === 'missing' && status !== 'missing') audio.playSfx('oops', { scope: 'scene' })
    setStatus(s)
    onVideoPlaying(s === 'playing')
  }

  return (
    <div className="scene scene06">
      <motion.div className="world" style={{ width: WIDE.worldW, x: tx, y: ty, scale: sc, transformOrigin: '0 0' }}>
        <EdgeExtend src={IMG.ruangTvBg} w={WIDE.worldW} h={1080} />
        <img className="world-img" src={IMG.ruangTvBg} alt="Bandara dengan TV besar" draggable={false} width={WIDE.worldW} height={1080} />
        <div className={`tv-glow ${tvOn ? 'on' : ''}`} style={{ clipPath: `polygon(${TV_POLY})` }} aria-hidden />

        <motion.div className="abs-zero" style={{ x: sx, y: sy, rotate: srot }}>
          <div className="suitcase-anchor" style={{ left: -BAG_W / 2, top: -BAG_H }}>
              <Baggage index={1} width={BAG_W} />
            </div>
        </motion.div>
        <svg className="tether" width={WIDE.worldW} height={1080} aria-hidden>
          <line ref={line} stroke="#1c1a33" strokeWidth="5" strokeLinecap="round" />
        </svg>

        <GasingSprite src={IMG.gasing} width={GW} height={GH} x={gx} y={gy} state={gState} popSfx="surprise" />

        {/* tanda seru "kaget" */}
        <motion.div className="abs-zero" style={{ x: gx, y: gy }} aria-hidden>
          <AnimatePresence>
            {surprised && (
              <motion.svg
                className="marks"
                width="150"
                height="130"
                viewBox="0 0 150 130"
                style={{ left: 40, top: -GH - 52 }}
                initial={{ scale: 0, opacity: 0, rotate: -25 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 520, damping: 13 }}
              >
                <g stroke="#ffcf1f" strokeWidth="13" strokeLinecap="round">
                  <path d="M38 96 L28 42" />
                  <path d="M72 88 L82 28" />
                  <path d="M104 100 L132 52" />
                </g>
              </motion.svg>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>

      {/* Scene 07 Video Ucapan: bingkai TV layar penuh + video (07a Video Diputar, 07b Video Belum Ada = placeholder di TvPlayer) */}
      <AnimatePresence>
        {phase === 'tv' && (
          <motion.div className="tv-frame" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.7 }}>
            <img className="fill-img" src={IMG.tv} alt="Layar TV" draggable={false} />
            <EdgeExtend src={IMG.tv} w={1920} h={1080} />
            <div className="tv-window">
              <TvPlayer active={phase === 'tv'} status={status} onStatus={handleStatus} replayKey={replayKey} />
              <div className="tv-glare" aria-hidden />
            </div>

            <AnimatePresence>
              {/* Scene 08 Kartu Penutup: 08a Konfeti dan Kartu, 08b Putar Ulang (tombol end-replay) */}
              {status === 'ended' && (
                <motion.div className="end-card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }}>
                  <Confetti />
                  <motion.div
                    className="end-card-inner"
                    initial={{ scale: 0.6, y: 40, opacity: 0 }}
                    animate={{ scale: 1, y: 0, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 220, damping: 15, delay: 0.25 }}
                  >
                    <p className="end-kicker">Selesai</p>
                    <h2>Selamat Ulang Tahun, Prof. Yohanes Surya!</h2>
                    <p>Terima kasih telah mengajarkan kami bahwa belajar itu Gampang, Asyik, dan Menyenangkan.</p>
                    <button
                      type="button"
                      className="end-replay"
                      onClick={() => {
                        setStatus('idle')
                        setReplayKey((k) => k + 1)
                      }}
                    >
                      Putar ulang video
                    </button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 07c Awan Menutup ke Peta: tombol tersedia di Scene 06-08 */}
      <div className="corner-btn">
        <PrimaryButton tone="sky" delay={0.4} onClick={onBack}>
          ← Kembali ke Peta
        </PrimaryButton>
      </div>
    </div>
  )
}
