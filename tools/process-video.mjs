// Kompres video ucapan: "aset proyek/Ucapan Ultah Prof 63.mp4" -> public/assets/video/ucapan-ultah.mp4
//   FFMPEG=C:\path\ke\ffmpeg.exe npm run video
// H.264 (High) + AAC, 1280x720 (layar TV di web tidak lebih lebar dari ini), faststart agar bisa diputar sambil diunduh.
// Encoder dicoba berurutan: libx264 (bila ffmpeg-nya punya), h264_qsv, h264_nvenc, h264_amf, h264_mf.
import { spawnSync } from 'node:child_process'
import { mkdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const ffmpeg = process.env.FFMPEG || 'ffmpeg'
const input = join(root, 'aset proyek', 'Ucapan Ultah Prof 63.mp4')
const outDir = join(root, 'public', 'assets', 'video')
const output = join(outDir, 'ucapan-ultah.mp4')
mkdirSync(outDir, { recursive: true })

const BITRATE = process.env.VBITRATE || '2000k'
const encoders = [
  ['libx264', ['-c:v', 'libx264', '-preset', 'slow', '-crf', '24', '-profile:v', 'high']],
  ['h264_qsv', ['-c:v', 'h264_qsv', '-b:v', BITRATE, '-maxrate', '3000k', '-profile:v', 'high', '-preset', 'veryslow']],
  ['h264_nvenc', ['-c:v', 'h264_nvenc', '-b:v', BITRATE, '-maxrate', '3000k', '-profile:v', 'high', '-preset', 'p7']],
  ['h264_amf', ['-c:v', 'h264_amf', '-b:v', BITRATE, '-quality', 'quality']],
  ['h264_mf', ['-c:v', 'h264_mf', '-b:v', BITRATE]],
]

let done = false
for (const [name, args] of encoders) {
  const r = spawnSync(
    ffmpeg,
    ['-hide_banner', '-y', '-loglevel', 'error', '-i', input, '-vf', 'scale=1280:720:flags=lanczos,format=yuv420p', ...args, '-g', '60', '-c:a', 'aac', '-b:a', '112k', '-ar', '44100', '-movflags', '+faststart', output],
    { encoding: 'utf8' },
  )
  const size = (() => {
    try {
      return statSync(output).size
    } catch {
      return 0
    }
  })()
  if (r.status === 0 && size > 10000) {
    console.log(`encoder ${name}: ${(statSync(input).size / 1048576).toFixed(2)} MB -> ${(size / 1048576).toFixed(2)} MB`)
    done = true
    break
  }
  console.log(`encoder ${name}: tidak tersedia / gagal`)
}
if (!done) throw new Error('tidak ada encoder H.264 yang berfungsi')
