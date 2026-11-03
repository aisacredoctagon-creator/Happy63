import { AnimatePresence, motion } from 'framer-motion'
import type { Variants } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AudioToggle } from './components/AudioToggle'
import { CloudTransition } from './components/CloudTransition'
import { Stage } from './components/Stage'
import { PRELOAD_IMAGES } from './config'
import { audio } from './audio/audio'
import type { SfxName } from './audio/audio'
import { GIFTS } from './data/gifts'
import { DevSceneBadge } from './dev/DevSceneBadge'
import { readDevJump } from './dev/devJump'
import { usePreload } from './hooks/usePreload'
import { Scene01LayarPembuka } from './scenes/Scene01LayarPembuka'
import { Scene02KabinPesawat } from './scenes/Scene02KabinPesawat'
import { Scene03PesawatDiLangit } from './scenes/Scene03PesawatDiLangit'
import { Scene04PetaKado } from './scenes/Scene04PetaKado'
import { Scene05BandaraBagasi } from './scenes/Scene05BandaraBagasi'
import { Scene06GasingMelihatTv } from './scenes/Scene06GasingMelihatTv'
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

// Hanya mode dev: lompat langsung ke scene untuk pengecekan, mis. ?scene=05 / ?scene=04c / &all=1 (src/dev/devJump.ts, SCENES.md)
const DEV = import.meta.env.DEV ? readDevJump(window.location.search) : null
const DEV_SCENE: SceneId = DEV?.scene?.id ?? 'scene02'

export default function App() {
  const { progress, done } = usePreload(PRELOAD)
  const [started, setStarted] = useState(false)
  const [scene, setScene] = useState<SceneId>(DEV_SCENE)
  const [devStart, setDevStart] = useState(DEV?.scene?.start) // hanya dev: Scene 07 / 08 langsung
  const [runKey, setRunKey] = useState(0)
  const [fade, setFade] = useState(1)
  const [cloud, setCloud] = useState<CloudState | null>(null)
  const [openedGifts, setOpenedGifts] = useState<Set<string>>(() => new Set(DEV?.allGifts ? GIFTS.map((g) => g.id) : []))
  const [hasCompletedOnce, setHasCompletedOnce] = useState(!!DEV?.completed)
  const [videoPlaying, setVideoPlaying] = useState(false)
  const cloudId = useRef(0)
  const cloudNext = useRef<SceneId | null>(null)

  useEffect(() => {
    if (scene !== 'scene06') setVideoPlaying(false)
  }, [scene])

  // video ucapan sedang diputar -> pelankan ambient
  useEffect(() => {
    audio.setDuck(videoPlaying ? 0 : 1)
  }, [videoPlaying])

  // SFX terpusat untuk semua tombol. Klik: data-sfx="<nama SFX>" mengganti bunyi bawaan ("click"), "none" = diam
  // (kado memakai "gift"). Hover (mouse saja): data-sfx-hover dengan aturan sama, bawaan "hover".
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const btn = (e.target as Element | null)?.closest?.('button')
      if (!btn || (btn as HTMLButtonElement).disabled) return
      const kind = btn.closest('[data-sfx]')?.getAttribute('data-sfx') ?? 'click'
      if (kind !== 'none') audio.playSfx(kind as SfxName)
    }
    const onOver = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      const btn = (e.target as Element | null)?.closest?.('button')
      if (!btn || (btn as HTMLButtonElement).disabled || btn.contains(e.relatedTarget as Node | null)) return
      const kind = btn.closest('[data-sfx-hover]')?.getAttribute('data-sfx-hover') ?? 'hover'
      if (kind !== 'none') audio.playSfx(kind as SfxName)
    }
    document.addEventListener('click', onClick, true)
    document.addEventListener('pointerover', onOver, true)
    return () => {
      document.removeEventListener('click', onClick, true)
      document.removeEventListener('pointerover', onOver, true)
    }
  }, [])

  /** ganti scene; SFX bercakupan scene lama dipotong halus */
  const changeScene = useCallback((next: SceneId) => {
    audio.stopScene()
    setDevStart(undefined)
    setScene(next)
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
    changeScene(cloudNext.current)
  }, [changeScene])
  const onCloudDone = useCallback(() => {
    cloudNext.current = null
    setCloud(null)
  }, [])

  const goFade = useCallback((next: SceneId, duration: number) => {
    setFade(duration)
    changeScene(next)
  }, [changeScene])

  const openGift = useCallback((id: string) => setOpenedGifts((prev) => (prev.has(id) ? prev : new Set(prev).add(id))), [])

  const land = useCallback(() => {
    setHasCompletedOnce(true)
    goWithCloud('scene05')
  }, [goWithCloud])

  const startOver = useCallback(() => {
    setOpenedGifts(new Set())
    setHasCompletedOnce(false)
    setRunKey((k) => k + 1)
    audio.playSfx('whooshSoft')
    goFade('scene02', 0.9)
  }, [goFade])

  let content
  switch (scene) {
    case 'scene02':
      content = (
        <Scene02KabinPesawat
          onDone={() => {
            audio.playSfx('whooshSoft')
            goFade('scene03', 1.4)
          }}
        />
      )
      break
    case 'scene03':
      content = <Scene03PesawatDiLangit onDone={() => goWithCloud('scene04')} />
      break
    case 'scene04':
      content = (
        <Scene04PetaKado
          opened={openedGifts}
          hasCompletedOnce={hasCompletedOnce}
          onOpenGift={openGift}
          onLand={land}
          onRestart={startOver}
        />
      )
      break
    case 'scene05':
      content = <Scene05BandaraBagasi onDone={() => goFade('scene06', 1.0)} />
      break
    case 'scene06':
      content = <Scene06GasingMelihatTv onBack={() => goWithCloud('scene04')} onVideoPlaying={setVideoPlaying} devStart={devStart} />
      break
  }

  const cloudOverlay = <CloudTransition runId={cloud?.runId ?? 0} busy={!!cloud} onCovered={onCloudCovered} onDone={onCloudDone} />

  return (
    <>
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
      <Scene01LayarPembuka progress={progress} ready={done} visible={!started} onStart={() => {
          audio.unlock() // interaksi pertama: buka audio (aturan autoplay browser)
          setStarted(true)
        }} />
    </Stage>
    {/* hanya dev: label nama scene aktif + menu lompat scene (di luar Stage agar tidak ikut di-scale) */}
    {import.meta.env.DEV && <DevSceneBadge />}
    </>
  )
}
