import { SCENE_LIST, sceneLabel } from '../data/scenes'
import { useCurrentSceneTag } from './sceneTag'

/**
 * Label debug (hanya mode dev): nama scene aktif di pojok kiri bawah + menu lompat scene.
 * Memilih scene memuat ulang halaman dengan ?scene=NN (lihat src/dev/devJump.ts).
 */
export function DevSceneBadge() {
  const no = useCurrentSceneTag()
  const jump = (value: string) => {
    const u = new URL(window.location.href)
    u.searchParams.set('scene', value)
    window.location.href = u.toString()
  }
  return (
    <div
      style={{
        position: 'fixed',
        left: 8,
        bottom: 8,
        zIndex: 99999,
        display: 'flex',
        gap: 6,
        alignItems: 'center',
        padding: '4px 8px',
        borderRadius: 6,
        background: 'rgba(0,0,0,0.65)',
        color: '#fff',
        font: '600 12px/1.2 system-ui, sans-serif',
      }}
    >
      <span style={{ opacity: 0.6 }}>DEV</span>
      <span>{no ? sceneLabel(no) : 'Scene ...'}</span>
      <select
        aria-label="Lompat ke scene"
        value=""
        onChange={(e) => e.target.value && jump(e.target.value)}
        style={{ font: 'inherit', background: '#222', color: '#fff', border: '1px solid #555', borderRadius: 4 }}
      >
        <option value="">lompat...</option>
        {SCENE_LIST.filter((s) => s.id).map((s) => (
          <option key={s.no} value={s.no}>
            {sceneLabel(s.no)}
          </option>
        ))}
        <option value="04c">Scene 04c - Semua Kado Terbuka</option>
      </select>
    </div>
  )
}
