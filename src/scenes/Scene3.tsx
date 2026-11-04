import { AnimatePresence, animate, motion, useMotionValue, useTransform } from 'framer-motion'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import { useStageView } from '../components/Stage'
import { useLoop } from '../audio/audio'
import { DriftClouds, Sparkles } from '../components/Atmosphere'
import { GiftHotspot } from '../components/GiftHotspot'
import { LandIconButton } from '../components/LandIconButton'
import { PartyHat } from '../components/PartyHat'
import { EdgeExtend } from '../components/EdgeExtend'
import { LetterModal } from '../components/LetterModal'
import { PrimaryButton } from '../components/PrimaryButton'
import { IMG, PLANE_MASCOT, SKY, STAGE_H, STAGE_W } from '../config'
import { GIFTS, LAND_ICON_POS } from '../data/gifts'
import type { Gift } from '../data/gifts'
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

export function Scene3({ opened, hasCompletedOnce, onOpenGift, onLand, onRestart }: Props) {
  const [active, setActive] = useState<Gift | null>(null)
  /** titik kado yang diklik (asal/tujuan animasi Genie pop-up); posisinya dibaca LetterModal tiap frame */
  const [originEl, setOriginEl] = useState<HTMLElement | null>(null)
  const [landing, setLanding] = useState(false)

  // musik hanya ada di scene ini; saat mendarat di-fade out lalu berhenti
  useLoop('music', { enabled: !landing, fadeIn: 2.8, fadeOut: 2.6 })

  const allOpened = opened.size >= GIFTS.length
  const showActions = (allOpened || hasCompletedOnce) && !landing
  const open = useCallback(
    (g: Gift, el: HTMLElement) => {
      setOriginEl(el.closest<HTMLElement>('.gift-spot') ?? el)
      setActive(g)
      onOpenGift(g.id)
    },
    [onOpenGift],
  )
  const close = useCallback(() => setActive(null), [])

  // ===== geser peta kiri-kanan (hanya di layar agak kotak, mis. Fold): lapisan peta bergeser, UI tetap di tepi layar =====
  const { scale, cropX, panMode } = useStageView()
  /** geseran lapisan peta (px kanvas); +cropX = tepi kiri peta terlihat, -cropX = tepi kanan peta terlihat */
  const panX = useMotionValue(0)
  const limit = panMode ? cropX : 0
  const limitRef = useRef(limit)
  limitRef.current = limit
  const panInit = useRef(false)
  useEffect(() => {
    if (!panMode) {
      panX.set(0)
      panInit.current = false
      return
    }
    // awal: tepi kiri peta (Sumatra + pesawat) terlihat; saat ukuran layar berubah, geseran dijaga di dalam batas
    panX.set(panInit.current ? Math.max(-limit, Math.min(limit, panX.get())) : limit)
    panInit.current = true
  }, [panMode, limit, panX])

  const drag = useRef<{ id: number; startX: number; startPan: number; moved: boolean } | null>(null)
  const suppressClick = useRef(false)
  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!panMode || active || landing || (e.pointerType === 'mouse' && e.button !== 0)) return
    drag.current = { id: e.pointerId, startX: e.clientX, startPan: panX.get(), moved: false }
  }
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    const dxScreen = e.clientX - d.startX
    if (!d.moved) {
      if (Math.abs(dxScreen) < 8) return // di bawah ambang = klik biasa pada kado
      d.moved = true
      e.currentTarget.setPointerCapture(e.pointerId)
    }
    panX.set(Math.max(-limitRef.current, Math.min(limitRef.current, d.startPan + dxScreen / scale)))
  }
  const endDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    drag.current = null
    if (d.moved) {
      suppressClick.current = true // klik yang menyusul setelah menggeser tidak boleh membuka kado
      window.setTimeout(() => (suppressClick.current = false), 0)
    }
  }
  const onClickCapture = (e: React.MouseEvent) => {
    if (suppressClick.current) {
      suppressClick.current = false
      e.stopPropagation()
      e.preventDefault()
    }
  }
  // mendarat: pesawat terbang dari kiri atas peta, jadi peta dikembalikan ke tepi kiri dulu
  useEffect(() => {
    if (landing && panMode) animate(panX, limitRef.current, { duration: 0.6, ease: 'easeOut' })
  }, [landing, panMode, panX])

  // penerbangan parabola: kiri atas -> kanan bawah (keluar layar)
  const t = useMotionValue(0)
  const px = useTransform(t, (v) => v * 2150)
  const py = useTransform(t, (v) => -520 * v + 840 * v * v)
  const rot = useTransform(t, (v) => (Math.atan2(-520 + 1680 * v, 2150) * 180 * 0.9) / Math.PI)

  useSequence(
    async (seq) => {
      if (!landing) return
      const fly = seq.to(t, 1, { duration: 3.4, ease: [0.4, 0, 0.55, 1] })
      await seq.wait(1.9)
      if (seq.dead) return
      onLand()
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
    <div
      className={`scene scene3 ${panMode ? 'is-pannable' : ''}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onClickCapture={onClickCapture}
    >
      <motion.div className="fill" style={{ x: panX }}>
      <motion.div
        className="fill"
        inert={active ? true : undefined}
        initial={{ scale: 1.06 }}
        animate={{ scale: 1 }}
        transition={{ duration: 2.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <img className="fill-img" src={IMG.scene3Bg} alt="Peta Indonesia dari udara" draggable={false} />
        <EdgeExtend src={IMG.scene3Bg} w={STAGE_W} h={STAGE_H} />

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
            <PartyHat variant="plane" />
          </div>
        </motion.div>

        {/* kado */}
        {GIFTS.map((g, i) => (
          <GiftHotspot key={g.id} gift={g} index={i} opened={opened.has(g.id)} disabled={landing} onOpen={open} />
        ))}

        {/* ronde ke-2 (sudah pernah mendarat): tombol Mendarat pindah ke peta, berupa ikon pesawat di Jawa Barat */}
        <AnimatePresence>
          {hasCompletedOnce && !landing && (
            <LandIconButton key="land-icon" x={LAND_ICON_POS.x} y={LAND_ICON_POS.y} onClick={() => setLanding(true)} />
          )}
        </AnimatePresence>
      </motion.div>
      </motion.div>

      {/* UI atas-tengah */}
      <div className="top-actions" inert={active ? true : undefined}>
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
              {panMode ? 'Geser peta ke kiri-kanan, lalu klik kado untuk membuka suratnya' : 'Klik kado di peta untuk membuka suratnya'}
            </motion.div>
          )}
          {showActions && (
            <motion.div key="actions" className="top-actions-row" exit={{ opacity: 0 }}>
              {/* ronde 1: tombol teks seperti semula; ronde 2: tombol Mendarat ada di peta (lihat LandIconButton) */}
              {!hasCompletedOnce && (
                <PrimaryButton tone="sun" pulse onClick={() => setLanding(true)}>
                  Mendarat
                </PrimaryButton>
              )}
              {hasCompletedOnce && (
                <PrimaryButton tone="sky" onClick={onRestart}>
                  Mulai Ulang
                </PrimaryButton>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {!landing && (
          <motion.div className="progress-pill" inert={active ? true : undefined} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} transition={{ delay: 0.8 }}>
            <span className="progress-dots">
              {GIFTS.map((g) => (
                <i key={g.id} className={opened.has(g.id) ? 'on' : ''} style={{ ['--c' as string]: g.color }} />
              ))}
            </span>
            Kado terbuka: {opened.size} / {GIFTS.length}
          </motion.div>
        )}
      </AnimatePresence>

      <LetterModal gift={active} originEl={originEl} onClose={close} />
    </div>
  )
}
