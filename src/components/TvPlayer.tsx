import { useEffect, useRef, useState } from 'react'
import { audio } from '../audio/audio'
import { VIDEO_SRC } from '../config'

export type TvStatus = 'idle' | 'playing' | 'paused' | 'ended' | 'missing'

interface Props {
  /** mulai mencoba autoplay saat true */
  active: boolean
  status: TvStatus
  onStatus: (s: TvStatus) => void
  /** naikkan angka ini untuk memutar ulang dari awal */
  replayKey: number
}

const fmt = (s: number) => {
  if (!isFinite(s)) return '0:00'
  const m = Math.floor(s / 60)
  return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`
}

/**
 * Pemutar video di dalam layar TV. Sumber: public/assets/video/ucapan.mp4
 * Kontrol: putar/jeda, volume, layar penuh. Jika autoplay diblokir browser -> tombol Putar besar.
 * Jika file belum ada -> placeholder "Video segera hadir".
 */
export function TvPlayer({ active, status, onStatus, replayKey }: Props) {
  const ref = useRef<HTMLVideoElement>(null)
  const missing = useRef(false)
  const [time, setTime] = useState(0)
  const [dur, setDur] = useState(0)
  const [vol, setVol] = useState(1)
  const [muted, setMuted] = useState(false)
  const [full, setFull] = useState(false)

  useEffect(() => {
    if (!active) return
    const v = ref.current
    if (!v) return
    v.currentTime = 0
    v.play().catch(() => {
      /* autoplay diblokir: tombol Putar tetap tampil (status idle) */
    })
  }, [active, replayKey])

  useEffect(() => {
    const onFs = () => setFull(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFs)
    return () => document.removeEventListener('fullscreenchange', onFs)
  }, [])

  const toggle = () => {
    const v = ref.current
    if (!v || status === 'missing') return
    if (v.paused) void v.play()
    else v.pause()
  }
  const toggleFull = () => {
    if (document.fullscreenElement) void document.exitFullscreen()
    else void document.documentElement.requestFullscreen?.()
  }

  const showBig = status === 'idle' || status === 'paused'
  return (
    <div className={`tv-screen st-${status}`}>
      <video
        ref={ref}
        className="tv-video"
        src={VIDEO_SRC}
        playsInline
        preload="auto"
        onClick={toggle}
        onPlay={() => {
          if (missing.current) return
          audio.playSfx('play', { scope: 'scene' })
          onStatus('playing')
        }}
        onPause={() => {
          if (missing.current || !ref.current || ref.current.ended) return
          audio.playSfx('pause', { scope: 'scene' })
          onStatus('paused')
        }}
        onEnded={() => onStatus('ended')}
        onError={() => {
          missing.current = true
          onStatus('missing')
        }}
        onLoadedMetadata={(e) => setDur(e.currentTarget.duration)}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
      />

      {status === 'missing' && (
        <div className="tv-missing">
          <div className="tv-missing-emoji" aria-hidden>
            🎬
          </div>
          <p className="tv-missing-title">Video segera hadir</p>
          <p className="tv-missing-sub">Taruh file ucapan di public/assets/video/ucapan.mp4</p>
          <button type="button" className="tv-skip" onClick={() => onStatus('ended')}>
            Lewati ke penutup
          </button>
        </div>
      )}

      {showBig && (
        <button type="button" data-sfx="none" className="tv-big-play" onClick={toggle} aria-label="Putar video">
          <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden>
            <path d="M20 12 L54 32 L20 52 Z" fill="#fff" stroke="#fff" strokeWidth="6" strokeLinejoin="round" />
          </svg>
          <span>Putar</span>
        </button>
      )}

      {status !== 'missing' && (
        <div className="tv-controls">
          <button type="button" data-sfx="none" onClick={toggle} aria-label={status === 'playing' ? 'Jeda' : 'Putar'}>
            {status === 'playing' ? (
              <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden>
                <rect x="6" y="5" width="6" height="20" rx="2" fill="#fff" />
                <rect x="18" y="5" width="6" height="20" rx="2" fill="#fff" />
              </svg>
            ) : (
              <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden>
                <path d="M8 5 L25 15 L8 25 Z" fill="#fff" stroke="#fff" strokeWidth="2.5" strokeLinejoin="round" />
              </svg>
            )}
          </button>
          <span className="tv-time">
            {fmt(time)} / {fmt(dur)}
          </span>
          <input
            className="tv-seek"
            type="range"
            min={0}
            max={dur || 1}
            step={0.1}
            value={time}
            aria-label="Posisi video"
            onChange={(e) => {
              const v = ref.current
              if (v) v.currentTime = Number(e.target.value)
            }}
          />
          <button
            type="button"
            onClick={() => {
              const v = ref.current
              if (!v) return
              v.muted = !v.muted
              setMuted(v.muted)
            }}
            aria-label={muted ? 'Suarakan' : 'Bisukan'}
          >
            <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden>
              <path d="M4 11 H9 L15 6 V24 L9 19 H4 Z" fill="#fff" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
              {muted || vol === 0 ? (
                <path d="M19 11 L26 19 M26 11 L19 19" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
              ) : (
                <path d="M19 10 Q23 15 19 20 M22 7 Q28 15 22 23" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
              )}
            </svg>
          </button>
          <input
            className="tv-vol"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={muted ? 0 : vol}
            aria-label="Volume"
            onChange={(e) => {
              const v = ref.current
              const n = Number(e.target.value)
              audio.playSfx('tick', { rate: 0.7 + n * 0.8, scope: 'scene' })
              setVol(n)
              if (v) {
                v.volume = n
                v.muted = n === 0
                setMuted(n === 0)
              }
            }}
          />
          <button type="button" onClick={toggleFull} aria-label={full ? 'Keluar layar penuh' : 'Layar penuh'}>
            <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden>
              {full ? (
                <path d="M11 4 V11 H4 M19 4 V11 H26 M11 26 V19 H4 M19 26 V19 H26" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              ) : (
                <path d="M4 11 V4 H11 M26 11 V4 H19 M4 19 V26 H11 M26 19 V26 H19" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              )}
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}
