// Scene 04 - Peta Kado
// 04a Peta Terbuka (masuk + petunjuk) -> 04b Surat Kado (tiap kado diklik, LetterModal) -> 04c Semua Kado Terbuka
// (tombol Mendarat / Mulai Ulang) -> 04d Pesawat Lepas Landas (3,4 s) -> 04e Awan Menutup ke Bandara (CloudTransition)
import { AnimatePresence, motion, useMotionValue, useTransform } from 'framer-motion'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { audio, useLoop } from '../audio/audio'
import { DriftClouds, Sparkles } from '../components/Atmosphere'
import { GiftHotspot } from '../components/GiftHotspot'
import { EdgeExtend } from '../components/EdgeExtend'
import { LetterModal } from '../components/LetterModal'
import { PrimaryButton } from '../components/PrimaryButton'
import { IMG, PLANE_MASCOT, SKY, STAGE_H, STAGE_W } from '../config'
import { GIFTS } from '../data/gifts'
import type { Gift } from '../data/gifts'
import { useSceneTag } from '../dev/sceneTag'
import { useSequence } from '../hooks/useSequence'

const kx = STAGE_W / SKY.srcW
const ky = STAGE_H / SKY.srcH
// Maskot Pesawat.png: sama dengan posisi pesawat lama di kiri atas peta (pusat di sekitar 245,210 px gambar acuan)
const PLANE_W = 360
const PLANE_H = (PLANE_W * PLANE_MASCOT.height) / PLANE_MASCOT.width
const planeBox = { left: 245 * kx - PLANE_W / 2, top: 205 * ky - PLANE_H / 2, width: PLANE_W, height: PLANE_H }

// titik laut (px gambar 1672x941) untuk kilau ombak
const WAVES: Array<[number, number]> = [
  [540, 640], [560, 520], [1050, 520], [1250, 500], [1150, 745], [640, 820],
  [900, 820], [1300, 820], [480, 790], [760, 640], [1000, 790],
]

interface Props {
  opened: Set<string>
  hasCompletedOnce: boolean
  onOpenGift: (id: string) => void
  /** pesawat sudah terbang setengah jalan: minta App menutup layar dengan CloudTransition */
  onLand: () => void
  onRestart: () => void
}

/** Scene 04 - Peta Kado: peta Indonesia dengan 8 kado berisi surat; setelah semua terbuka, pesawat mendarat. */
export function Scene04PetaKado({ opened, hasCompletedOnce, onOpenGift, onLand, onRestart }: Props) {
  useSceneTag('04')
  const [active, setActive] = useState<Gift | null>(null)
  const [landing, setLanding] = useState(false)

  // musik hanya ada di scene ini; saat mendarat di-fade out lalu berhenti
  useLoop('music', { enabled: !landing, fadeIn: 2.8, fadeOut: 2.6 })

  const allOpened = opened.size >= GIFTS.length
  const showActions = (allOpened || hasCompletedOnce) && !landing
  const open = useCallback(
    (g: Gift) => {
      setActive(g)
      onOpenGift(g.id)
    },
    [onOpenGift],
  )

  // pill progres (0,8 s) dan petunjuk (1,2 s, hanya bila belum ada kado terbuka) muncul dengan "pop" pelan
  useEffect(() => {
    const ts = [0.8, ...(opened.size === 0 ? [1.2] : [])].map((d) => setTimeout(() => audio.playSfx('pop', { volume: 0.5, scope: 'scene' }), d * 1000 + 80))
    return () => ts.forEach(clearTimeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const close = useCallback(() => setActive(null), [])

  // penerbangan parabola: kiri atas -> kanan bawah (keluar layar)
  const t = useMotionValue(0)
  const px = useTransform(t, (v) => v * 2150)
  const py = useTransform(t, (v) => -520 * v + 840 * v * v)
  const rot = useTransform(t, (v) => (Math.atan2(-520 + 1680 * v, 2150) * 180 * 0.9) / Math.PI)

  useSequence(
    async (seq) => {
      if (!landing) return
      seq.sfx('takeoff') // 04d Pesawat Lepas Landas
      const fly = seq.to(t, 1, { duration: 3.4, ease: [0.4, 0, 0.55, 1] })
      await seq.wait(1.9)
      if (seq.dead) return
      onLand() // 04e Awan Menutup ke Bandara
      await fly
    },
    [landing],
  )

  const waves = useMemo(
    () =>
      WAVES.map(([x, y], i) => ({
        left: `${(x / SKY.srcW) * 100}%`,
        top: `${(y / SKY.srcH) * 100}%`,
        delay: -i * 0.83,
        dur: 4 + (i % 4) * 0.9,
      })),
    [],
  )

  return (
    <div className="scene scene04">
      {/* 04a Peta Terbuka */}
      <motion.div
        className="fill"
        initial={{ scale: 1.06 }}
        animate={{ scale: 1 }}
        transition={{ duration: 2.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <img className="fill-img" src={IMG.petaBg} alt="Peta Indonesia dari udara" draggable={false} />
        <EdgeExtend src={IMG.petaBg} w={STAGE_W} h={STAGE_H} />

        {/* latar yang hidup */}
        <div className="sun-glow" aria-hidden />
        <div className="sun-rays" aria-hidden />
        <DriftClouds yMin={40} yMax={290} count={5} opacity={0.9} speed={150} size={[260, 460]} />
        <Sparkles count={22} region={[2, 3, 98, 96]} seed={11} />
        <div className="waves" aria-hidden>
          {waves.map((w, i) => (
            <svg key={i} className="wave" width="90" height="26" viewBox="0 0 90 26" style={{ left: w.left, top: w.top, animationDelay: `${w.delay}s`, animationDuration: `${w.dur}s` } as CSSProperties}>
              <path d="M4 18 Q15 6 26 16 T48 16 T70 14 T86 8" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" />
            </svg>
          ))}
        </div>

        {/* pesawat berisi Gasing (kiri atas). TODO: ganti dengan sprite pesawat+Gasing terpisah */}
        <motion.div className="plane3" style={{ ...planeBox, x: px, y: py, rotate: rot }}>
          <div className="contrail" aria-hidden>
            <i className="ct ct1" />
            <i className="ct ct2" />
            <i className="ct ct3" />
            {Array.from({ length: 7 }, (_, i) => (
              <b key={i} className="puff" style={{ animationDelay: `${-i * 0.62}s` }} />
            ))}
          </div>
          <div className="plane3-idle">
            <img src={IMG.planeMascot} alt="Pesawat berisi Gasing" draggable={false} className="fill-img" />
          </div>
        </motion.div>

        {/* 04b Surat Kado: klik kado membuka LetterModal (di bawah) */}
        {GIFTS.map((g, i) => (
          <GiftHotspot key={g.id} gift={g} index={i} opened={opened.has(g.id)} disabled={landing} onOpen={open} />
        ))}
      </motion.div>

      {/* UI atas-tengah: petunjuk (04a) lalu tombol Mendarat / Mulai Ulang (04c Semua Kado Terbuka) */}
      <div className="top-actions">
        <AnimatePresence>
          {!showActions && !landing && opened.size === 0 && (
            <motion.div
              key="hint"
              className="hint-pill"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: 1.2, duration: 0.5 }}
            >
              Klik kado di peta untuk membuka suratnya
            </motion.div>
          )}
          {showActions && (
            <motion.div key="actions" className="top-actions-row" exit={{ opacity: 0 }}>
              <PrimaryButton tone="sun" pulse appear="reward" onClick={() => setLanding(true)}>
                Mendarat
              </PrimaryButton>
              {hasCompletedOnce && (
                <PrimaryButton tone="sky" delay={0.12} appear="none" onClick={onRestart}>
                  Mulai Ulang
                </PrimaryButton>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {!landing && (
          <motion.div className="progress-pill" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} transition={{ delay: 0.8 }}>
            <span className="progress-dots">
              {GIFTS.map((g) => (
                <i key={g.id} className={opened.has(g.id) ? 'on' : ''} style={{ ['--c' as string]: g.color }} />
              ))}
            </span>
            Kado terbuka: {opened.size} / {GIFTS.length}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 04b Surat Kado */}
      <LetterModal gift={active} onClose={close} />
    </div>
  )
}
