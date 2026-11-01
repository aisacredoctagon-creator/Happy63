import { audio, useMuted } from '../audio/audio'

/** Tombol mute global (SFX, ambient, dan musik) di pojok kanan bawah. */
export function AudioToggle() {
  const muted = useMuted()
  return (
    <button
      type="button"
      data-sfx="none"
      className={`audio-toggle ${muted ? '' : 'is-on'}`}
      onClick={() => audio.toggleMute()}
      aria-label={muted ? 'Nyalakan suara' : 'Matikan suara'}
      aria-pressed={!muted}
      title={muted ? 'Nyalakan suara' : 'Matikan suara'}
    >
      <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden>
        <path d="M5 13 H11 L18 7 V27 L11 21 H5 Z" fill="#fff" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
        {muted ? (
          <path d="M23 12 L31 22 M31 12 L23 22" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" />
        ) : (
          <>
            <path d="M22 12 Q26 17 22 22" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
            <path d="M25.5 8.5 Q32 17 25.5 25.5" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
          </>
        )}
      </svg>
    </button>
  )
}
