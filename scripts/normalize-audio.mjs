#!/usr/bin/env node
/**
 * Normalisasi audio proyek (EBU R128), bisa dijalankan ulang kapan saja:
 *
 *   npm run audio                  proses semua item di scripts/audio-sources.json
 *   npm run audio -- cabin chimes  hanya item tertentu (cocok dengan `name`)
 *
 * Untuk tiap item: cadangkan sumber ke 'aset proyek/original/', potong senyap di awal/akhir (silenceremove),
 * ukur loudness (ebur128), beri gain linear ke target kategori (src/audio/levels.json), batasi true peak
 * (alimiter), encode AAC .m4a ke public/assets/audio/, ukur ulang hasilnya, lalu perbarui manifest.json.
 *
 * Butuh ffmpeg: di PATH, atau set variabel lingkungan FFMPEG ke lokasi ffmpeg.exe.
 * Memasang ffmpeg (Windows): winget install Gyan.FFmpeg
 */
import { spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const FFMPEG = process.env.FFMPEG || 'ffmpeg'
const SRC_DIR = join(ROOT, 'aset proyek')
const BACKUP_DIR = join(SRC_DIR, 'original')
const AUDIO_DIR = join(ROOT, 'public', 'assets', 'audio')
const MANIFEST = join(AUDIO_DIR, 'manifest.json')

const levels = JSON.parse(readFileSync(join(ROOT, 'src/audio/levels.json'), 'utf8'))
const cfg = JSON.parse(readFileSync(join(ROOT, 'scripts/audio-sources.json'), 'utf8'))
const TP_MAX = levels.truePeakDb
const dbToLin = (db) => 10 ** (db / 20)

function ffmpeg(args, { binary = false } = {}) {
  const r = spawnSync(FFMPEG, ['-hide_banner', '-nostats', '-y', ...args], { maxBuffer: 1 << 30, encoding: binary ? 'buffer' : 'utf8' })
  if (r.error) {
    console.error(`Tidak bisa menjalankan ffmpeg (${FFMPEG}): ${r.error.message}\nPasang ffmpeg (winget install Gyan.FFmpeg) atau set FFMPEG=<lokasi ffmpeg.exe>.`)
    process.exit(1)
  }
  return { stderr: String(r.stderr), stdout: r.stdout, status: r.status }
}

/**
 * ukur loudness terintegrasi (LUFS), true peak (dBTP), dan LRA dari file setelah rantai filter `chain`.
 * ebur128 butuh minimal 400 ms: klip yang lebih pendek (`clipSec`) di-pad ke 400 ms lalu dikoreksi ke rata-rata energi selama
 * durasi klipnya sendiri (sama dengan cara kalibrasi SFX sintesis).
 */
function measure(file, chain = '', clipSec = 0) {
  const short = clipSec > 0 && clipSec < 0.4
  const af = [chain, short ? 'apad=whole_dur=0.4' : '', 'ebur128=peak=true:framelog=quiet'].filter(Boolean).join(',')
  const { stderr } = ffmpeg(['-i', file, '-af', af, '-f', 'null', '-'])
  const sum = stderr.slice(stderr.lastIndexOf('Summary:'))
  const num = (re) => Number(re.exec(sum)?.[1])
  const I = num(/I:\s+(-?[\d.]+) LUFS/) + (short ? 10 * Math.log10(0.4 / clipSec) : 0)
  return { I, LRA: num(/LRA:\s+([\d.]+) LU/), TP: num(/Peak:\s+(-?[\d.]+) dBFS/) }
}

/** durasi persis (detik) setelah rantai filter, dengan menghitung sampel */
function duration(file, chain = '') {
  const args = ['-i', file]
  if (chain) args.push('-af', chain)
  args.push('-ac', '1', '-ar', '48000', '-f', 's16le', 'pipe:1')
  return ffmpeg(args, { binary: true }).stdout.length / 2 / 48000
}

const silence = (db) => `silenceremove=start_periods=1:start_threshold=${db}dB:start_silence=0`
const headChain = (db) => silence(db)
const tailChain = (db) => `areverse,${silence(db)},areverse`
/** ambang senyap (dB) awal dan akhir: trimHeadDb / trimTailDb menimpa trimDb (mis. potong fade-out lagu dengan trimTailDb tinggi) */
const headDb = (item) => item.trimHeadDb ?? item.trimDb ?? -50
const tailDb = (item) => item.trimTailDb ?? item.trimDb ?? -50
function trimChain(item) {
  const t = item.trim ?? 'none'
  return [t === 'both' || t === 'head' ? headChain(headDb(item)) : '', t === 'both' || t === 'tail' ? tailChain(tailDb(item)) : ''].filter(Boolean).join(',')
}

function backup(item) {
  mkdirSync(BACKUP_DIR, { recursive: true })
  const original = join(BACKUP_DIR, item.src)
  const loose = join(SRC_DIR, item.src)
  if (!existsSync(original)) {
    if (!existsSync(loose)) throw new Error(`Sumber tidak ditemukan: ${item.src} (taruh di 'aset proyek/')`)
    copyFileSync(loose, original) // cadangan file asli
  }
  return original
}

function process_(item) {
  const target = item.targetLufs ?? levels.targetLufs[item.category]
  if (target === undefined) throw new Error(`Kategori tidak dikenal: ${item.category}`)
  const src = backup(item)
  // sumber mono diputar browser ke L = R (amplitudo penuh di kedua speaker, +3 LU): ukur dan encode sebagai stereo identik
  const mono = /mono/.test(ffmpeg(['-i', src, '-f', 'null', '-']).stderr)
  const chain = [mono ? 'pan=stereo|c0=c0|c1=c0' : '', trimChain(item)].filter(Boolean).join(',')

  const raw = measure(src)
  const durRaw = duration(src)
  const durHead = duration(src, item.trim === 'both' || item.trim === 'head' ? headChain(headDb(item)) : '')
  const durTrim = duration(src, chain)
  const post = measure(src, chain, durTrim)
  if (!(post.I > -60)) throw new Error(`Loudness ${item.name} tidak terukur (${post.I} LUFS): file terlalu pendek atau senyap?`)
  const headMs = (durRaw - durHead) * 1000
  const tailMs = (durHead - durTrim) * 1000

  const out = join(AUDIO_DIR, item.out)
  const tmp = join(AUDIO_DIR, `.tmp-${item.out}`)
  let gain = target - post.I
  let ceil = TP_MAX - 0.7
  let fin
  for (let i = 0; i < 5; i++) {
    const af = [chain, `volume=${gain.toFixed(2)}dB`, `alimiter=limit=${dbToLin(ceil).toFixed(4)}:attack=3:release=40:level=false`].filter(Boolean).join(',')
    const r = ffmpeg(['-i', src, '-af', af, '-c:a', 'aac', '-b:a', item.bitrate ?? (mono ? '96k' : '128k'), '-ar', '44100', '-map_metadata', '-1', '-movflags', '+faststart', tmp])
    if (r.status !== 0) throw new Error(`ffmpeg gagal untuk ${item.name}:\n${r.stderr.slice(-600)}`)
    fin = measure(tmp, '', durTrim)
    const dI = target - fin.I
    const dTP = fin.TP - TP_MAX
    if (Math.abs(dI) <= 0.3 && dTP <= 0.05) break
    if (dTP > 0.05) ceil -= dTP + 0.2
    gain += dI * 0.9
  }
  renameSync(tmp, out)
  const durOut = duration(out)

  // daftarkan di manifest agar dipakai SoundManager (register: false = tidak, mis. lagu BGM yang dimuat lazy lewat src/audio/bgm.ts)
  if (item.register !== false) {
    const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : { files: {} }
    manifest.files = { ...(manifest.files ?? {}), [item.name]: item.out }
    writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n')
  }

  return { name: item.name, src: item.src, out: item.out, category: item.category, target, lufsBefore: raw.I, lufsAfter: fin.I, tpAfter: fin.TP, lraAfter: fin.LRA, durRaw, durOut, headMs, tailMs }
}

const only = process.argv.slice(2)
const items = cfg.items.filter((it) => !only.length || only.some((o) => it.name.toLowerCase().includes(o.toLowerCase())))
if (!items.length) {
  console.error('Tidak ada item yang cocok. Cek scripts/audio-sources.json')
  process.exit(1)
}
mkdirSync(AUDIO_DIR, { recursive: true })
const rows = []
for (const it of items) {
  process.stdout.write(`> ${it.name} ... `)
  const r = process_(it)
  rows.push(r)
  console.log(`${r.lufsBefore.toFixed(1)} -> ${r.lufsAfter.toFixed(1)} LUFS (target ${r.target}), TP ${r.tpAfter.toFixed(1)} dBTP`)
}
console.log('\nnama            kategori  durasi awal -> akhir      dipotong awal/akhir     LUFS awal -> akhir   TP akhir')
for (const r of rows) {
  console.log(
    `${r.name.padEnd(15)} ${r.category.padEnd(9)} ${r.durRaw.toFixed(2).padStart(6)}s -> ${r.durOut.toFixed(2).padStart(6)}s   ${r.headMs.toFixed(0).padStart(5)} ms / ${r.tailMs.toFixed(0).padStart(5)} ms   ${r.lufsBefore.toFixed(1).padStart(6)} -> ${r.lufsAfter.toFixed(1).padStart(6)}   ${r.tpAfter.toFixed(1)}`,
  )
}
