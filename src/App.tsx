import { AnimatePresence, motion } from 'framer-motion'
import type { Variants } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AudioToggle } from './components/AudioToggle'
import { CloudTransition } from './components/CloudTransition'
import { LoadingScreen } from './components/LoadingScreen'
import { Stage } from './components/Stage'
import { PRELOAD_IMAGES } from './config'
import { audio } from './audio/audio'
import { GIFTS } from './data/gifts'
import { usePreload } from './hooks/usePreload'
import { Scene1 } from './scenes/Scene1'
import { Scene2 } from './scenes/Scene2'
import { Scene3 } from './scenes/Scene3'
import { Scene4 } from './scenes/Scene4'
import { Scene5 } from './scenes/Scene5'
import type { SceneId } from './types'

const PRELOAD = PRELOAD_IMAGES

// durasi cross-fade antar scene; 0 = potong langsung (dipakai saat layar tertutup awan)
const sceneVariants: Variants = {
  initial: (d: number) => ({ opacity: d > 0 ? 0 : 1 }),
  animate: (d: number) => ({ opacity: 1, transition: { duration: d } }),
  // scene lama tetap utuh selama scene baru memudar masuk di atasnya (tidak ada dip gelap di tengah cross-fade)
  exit: (d: number) => ({ opacity: 1, transition: { duration: d } }),
}

interface CloudState {
  next: SceneId
  runId: number
}

// Hanya mode dev: ?scene=scene3 (&all=1 untuk kado terbuka semua) melompat langsung ke scene untuk pengecekan
const DEV_PARAMS = import.meta.env.DEV ? new URLSearchParams(window.location.search) : null
const DEV_SCENE = (DEV_PARAMS?.get('scene') as SceneId | null) ?? 'scene1'

export default function App() {
  const { progress, done } = usePreload(PRELOAD)
  const [started, setStarted] = useState(false)
  const [scene, setScene] = useState<SceneId>(DEV_SCENE)
  const [runKey, setRunKey] = useState(0)
  const [fade, setFade] = useState(1)
  const [cloud, setCloud] = useState<CloudState | null>(null)
  const [openedGifts, setOpenedGifts] = useState<Set<string>>(() => new Set(DEV_PARAMS?.get('all') ? GIFTS.map((g) => g.id) : []))
  const [hasCompletedOnce, setHasCompletedOnce] = useState(!!DEV_PARAMS?.get('all'))
  const [videoPlaying, setVideoPlaying] = useState(false)
  const cloudId = useRef(0)
  const cloudNext = useRef<SceneId | null>(null)

  useEffect(() => {
    if (scene !== 'scene5') setVideoPlaying(false)
  }, [scene])

  // video ucapan sedang diputar -> pelankan ambient
  useEffect(() => {
    audio.setDuck(videoPlaying ? 0 : 1)
  }, [videoPlaying])

  // SFX klik terpusat untuk semua tombol (kecuali yang menandai data-sfx="none"; kado memakai data-sfx="gift")
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const btn = (e.target as Element | null)?.closest?.('button')
      if (!btn || (btn as HTMLButtonElement).disabled) return
      const kind = btn.closest('[data-sfx]')?.getAttribute('data-sfx') ?? 'click'
      if (kind === 'click' || kind === 'gift') void audio.playSfx(kind)
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [])

  /** pindah scene lewat CloudTransition: awan menutup -> ganti scene -> awan membuka */
  const goWithCloud = useCallback((next: SceneId) => {
    if (cloudNext.current) return // transisi sedang berjalan: abaikan klik ganda
    cloudNext.current = next
    setCloud({ next, runId: ++cloudId.current })
  }, [])
  /** layar tertutup penuh: ganti scene (cross-fade singkat di balik awan) */
  const onCloudCovered = useCallback(() => {
    if (!cloudNext.current) return
    setFade(0.4)
    setScene(cloudNext.current)
  }, [])
  const onCloudDone = useCallback(() => {
    cloudNext.current = null
    setCloud(null)
  }, [])

  const goFade = useCallback((next: SceneId, duration: number) => {
    setFade(duration)
    setScene(next)
  }, [])

  const openGift = useCallback((id: string) => setOpenedGifts((prev) => (prev.has(id) ? prev : new Set(prev).add(id))), [])

  const land = useCallback(() => {
    setHasCompletedOnce(true)
    goWithCloud('scene4')
  }, [goWithCloud])

  const startOver = useCallback(() => {
    setOpenedGifts(new Set())
    setHasCompletedOnce(false)
    setRunKey((k) => k + 1)
    goFade('scene1', 0.9)
  }, [goFade])

  let content
  switch (scene) {
    case 'scene1':
      content = <Scene1 onDone={() => goFade('scene2', 1.4)} />
      break
    case 'scene2':
      content = <Scene2 onDone={() => goWithCloud('scene3')} />
      break
    case 'scene3':
      content = (
        <Scene3
          opened={openedGifts}
          hasCompletedOnce={hasCompletedOnce}
          onOpenGift={openGift}
          onLand={land}
          onRestart={startOver}
        />
      )
      break
    case 'scene4':
      content = <Scene4 onDone={() => goFade('scene5', 1.0)} />
      break
    case 'scene5':
      content = <Scene5 onBack={() => goWithCloud('scene3')} onVideoPlaying={setVideoPlaying} />
      break
  }

  const cloudOverlay = <CloudTransition runId={cloud?.runId ?? 0} busy={!!cloud} onCovered={onCloudCovered} onDone={onCloudDone} />

  return (
    <Stage overlay={cloudOverlay}>
      <AnimatePresence custom={fade}>
        {started && (
          <motion.div
            key={`${scene}-${runKey}`}
            className="scene-layer"
            custom={fade}
            variants={sceneVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            {content}
          </motion.div>
        )}
      </AnimatePresence>


      <AudioToggle />
      <LoadingScreen progress={progress} ready={done} visible={!started} onStart={() => {
          audio.unlock() // interaksi pertama: buka audio (aturan autoplay browser)
          setStarted(true)
        }} />
    </Stage>
  )
}
