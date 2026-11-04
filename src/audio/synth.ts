/**
 * SFX dan ambient prosedural (Web Audio API): tanpa file, tanpa lisensi, tanpa biaya loading.
 * Setiap SFX adalah resep kecil `play(c)` yang menjadwalkan node pada waktu `c.t`.
 * Bila sebuah SFX/loop punya file yang didaftarkan di `public/assets/audio/manifest.json` (dibuat oleh `npm run audio`),
 * file itu dipakai menggantikan resep ini. `vol` tiap SFX dan `LOOP_PEAK` hasil kalibrasi ke target di levels.json
 * (scripts/measure-synth-levels.js); kategori tiap SFX ada di `SFX_CAT`.
 */
export type SfxName =
  | 'click' | 'hover' | 'tick' | 'pop' | 'start' | 'toggleOn'
  | 'zoomOut' | 'zoomIn' | 'whooshSoft' | 'planeFlyby'
  | 'cloudWhoosh' | 'cloudSoft'
  | 'giftHover' | 'paperDrop' | 'paperClose' | 'reward' | 'takeoff'
  | 'step' | 'hopUp' | 'thud' | 'boing' | 'surprise'
  | 'tvFlicker' | 'tvOn' | 'play' | 'pause' | 'oops' | 'fanfare'
  | 'airplaneChimes'

export type SynthLoopName = 'cabin' | 'wind' | 'airport' | 'wheels'

export interface SynthCtx {
  ctx: AudioContext
  out: AudioNode
  /** waktu mulai (detik, jam AudioContext) */
  t: number
  /** pengali pitch */
  rate: number
  noise: AudioBuffer
}

export interface SfxDef {
  play: (c: SynthCtx) => void
  /** perkiraan lama bunyi (detik), untuk menghitung polifoni */
  dur: number
  vol: number
  /** variasi pitch acak +/- (mis. 0.05 = 5%) agar aksi berulang tidak monoton */
  vary?: number
  /** maksimum suara bersamaan untuk nama ini */
  max?: number
  /** jeda minimum antar pemutaran (ms) */
  cd?: number
  /** 0 = boleh dibuang saat ramai (hover), 1 = normal, 2 = penting (tidak dibuang) */
  prio?: 0 | 1 | 2
  /** potong file override sampai sekian detik */
  clip?: number
}

const MIN = 0.0001

interface OscOpts {
  type?: OscillatorType
  f: number
  f2?: number
  /** jalur frekuensi bebas: [detik relatif, Hz]; menggantikan f2 */
  path?: Array<[number, number]>
  dur: number
  gain?: number
  attack?: number
  /** geser mulai (detik) */
  at?: number
}

function osc(c: SynthCtx, o: OscOpts) {
  const { ctx, out, rate } = c
  const t = c.t + (o.at ?? 0)
  const g = ctx.createGain()
  g.gain.setValueAtTime(MIN, t)
  g.gain.exponentialRampToValueAtTime(o.gain ?? 0.5, t + (o.attack ?? 0.008))
  g.gain.exponentialRampToValueAtTime(MIN, t + o.dur)
  const s = ctx.createOscillator()
  s.type = o.type ?? 'sine'
  s.frequency.setValueAtTime(o.f * rate, t)
  if (o.path) for (const [dt, f] of o.path) s.frequency.exponentialRampToValueAtTime(f * rate, t + dt)
  else if (o.f2) s.frequency.exponentialRampToValueAtTime(o.f2 * rate, t + o.dur * 0.9)
  s.connect(g).connect(out)
  s.start(t)
  s.stop(t + o.dur + 0.05)
}

interface AirOpts {
  dur: number
  gain?: number
  type?: BiquadFilterType
  f: number
  f2?: number
  q?: number
  attack?: number
  at?: number
}

/** desis angin/noise tersaring; dipakai untuk whoosh, klik kertas, dll. */
function air(c: SynthCtx, o: AirOpts) {
  const { ctx, out } = c
  const t = c.t + (o.at ?? 0)
  const src = ctx.createBufferSource()
  src.buffer = c.noise
  src.loop = true
  const flt = ctx.createBiquadFilter()
  flt.type = o.type ?? 'bandpass'
  flt.Q.value = o.q ?? 1
  flt.frequency.setValueAtTime(o.f, t)
  if (o.f2) flt.frequency.exponentialRampToValueAtTime(o.f2, t + o.dur)
  const g = ctx.createGain()
  g.gain.setValueAtTime(MIN, t)
  g.gain.exponentialRampToValueAtTime(o.gain ?? 0.2, t + (o.attack ?? 0.01))
  g.gain.exponentialRampToValueAtTime(MIN, t + o.dur)
  src.connect(flt).connect(g).connect(out)
  src.start(t, Math.random() * 0.8)
  src.stop(t + o.dur + 0.05)
}

/** rangkaian nada berurutan (arpeggio / kilau) */
function notes(c: SynthCtx, freqs: number[], step: number, o: Omit<OscOpts, 'f'>) {
  freqs.forEach((f, i) => osc(c, { ...o, f, at: (o.at ?? 0) + i * step }))
}

const C5 = 523.25, E5 = 659.25, G5 = 783.99, C6 = 1046.5, E6 = 1318.5, G6 = 1568, C7 = 2093

const tvOn = (c: SynthCtx) => {
  osc(c, { f: 150, f2: 1400, dur: 0.22, gain: 0.25 })
  osc(c, { f: 120, dur: 1.0, gain: 0.05, attack: 0.1 })
}

export const SFX: Record<SfxName, SfxDef> = {
  // --- klik / UI ---
  click: {
    dur: 0.1, vol: 1.043, vary: 0.04, max: 3, clip: 0.28,
    play: (c) => {
      osc(c, { f: 880, f2: 520, dur: 0.07, gain: 0.55, attack: 0.004 })
      osc(c, { type: 'triangle', f: 1760, f2: 1200, dur: 0.04, gain: 0.15, attack: 0.003 })
    },
  },
  hover: { dur: 0.04, vol: 3.417, vary: 0.06, max: 2, cd: 70, prio: 0, play: (c) => osc(c, { f: 1500, dur: 0.035, gain: 0.12, attack: 0.004 }) },
  tick: { dur: 0.04, vol: 2.603, max: 2, cd: 60, prio: 0, play: (c) => osc(c, { f: 1100, dur: 0.03, gain: 0.2, attack: 0.003 }) },
  pop: { dur: 0.12, vol: 1.109, vary: 0.05, max: 2, play: (c) => osc(c, { f: 420, f2: 880, dur: 0.1, gain: 0.5, attack: 0.004 }) },
  start: {
    dur: 0.9, vol: 1.641, prio: 2,
    play: (c) => {
      notes(c, [C5, E5, G5, C6, E6], 0.07, { dur: 0.45, gain: 0.3 })
      air(c, { f: 500, f2: 3000, dur: 0.6, gain: 0.12, attack: 0.3 })
      osc(c, { f: C7, dur: 0.5, gain: 0.12, at: 0.3 })
    },
  },
  toggleOn: {
    dur: 0.25, vol: 1.462, prio: 2,
    play: (c) => {
      osc(c, { f: 660, dur: 0.09, gain: 0.35 })
      osc(c, { f: 990, dur: 0.12, gain: 0.35, at: 0.07 })
    },
  },

  // --- whoosh / transisi ---
  zoomOut: { dur: 1.9, vol: 6.32, max: 1, play: (c) => air(c, { f: 2200, f2: 500, q: 0.8, dur: 1.8, gain: 0.22, attack: 0.5 }) },
  zoomIn: { dur: 2.1, vol: 7.472, max: 1, play: (c) => air(c, { f: 350, f2: 2600, q: 0.8, dur: 2.0, gain: 0.22, attack: 1.2 }) },
  whooshSoft: { dur: 0.9, vol: 12.66, max: 2, play: (c) => air(c, { f: 500, f2: 1600, q: 0.7, dur: 0.8, gain: 0.16, attack: 0.3 }) },
  planeFlyby: {
    dur: 1.6, vol: 8.179, max: 1,
    play: (c) => {
      air(c, { f: 300, f2: 1200, dur: 1.5, gain: 0.2, attack: 0.6 })
      osc(c, { type: 'triangle', f: 95, f2: 70, dur: 1.5, gain: 0.08, attack: 0.5 })
    },
  },
  cloudWhoosh: { dur: 1.2, vol: 6.91, max: 1, prio: 2, play: (c) => air(c, { f: 350, f2: 1900, q: 0.6, dur: 1.15, gain: 0.26, attack: 0.6 }) },
  cloudSoft: {
    dur: 0.4, vol: 1.399, max: 1, prio: 2,
    play: (c) => {
      osc(c, { f: 180, f2: 70, dur: 0.35, gain: 0.45 })
      air(c, { type: 'lowpass', f: 900, dur: 0.3, gain: 0.15 })
    },
  },
  // --- kado / surat ---
  giftHover: {
    dur: 0.2, vol: 2.946, vary: 0.1, max: 2, cd: 90, prio: 0,
    play: (c) => {
      osc(c, { f: 1760, dur: 0.14, gain: 0.12 })
      osc(c, { f: 2637, dur: 0.1, gain: 0.07, at: 0.05 })
    },
  },
  paperDrop: {
    dur: 0.5, vol: 2.786, max: 1,
    play: (c) => {
      air(c, { type: 'highpass', f: 1000, dur: 0.28, gain: 0.18, attack: 0.12 })
      osc(c, { f: 150, f2: 70, dur: 0.2, gain: 0.3, at: 0.22 })
    },
  },
  paperClose: { dur: 0.3, vol: 15.954, max: 1, play: (c) => air(c, { f: 1600, f2: 450, dur: 0.22, gain: 0.15, attack: 0.05 }) },
  reward: {
    dur: 1.6, vol: 1.953, max: 1, prio: 2,
    play: (c) => {
      notes(c, [C5, E5, G5, C6, E6, G6], 0.075, { type: 'triangle', dur: 0.5, gain: 0.26 })
      for (const f of [C6, E6, G6]) osc(c, { f, dur: 0.9, gain: 0.16, at: 0.5 })
    },
  },
  takeoff: {
    dur: 2.5, vol: 5.688, max: 1, prio: 2,
    play: (c) => {
      air(c, { f: 200, f2: 1800, dur: 2.4, gain: 0.26, attack: 1.4 })
      osc(c, { type: 'triangle', f: 80, f2: 240, dur: 2.4, gain: 0.1, attack: 1 })
    },
  },

  // --- Gasing / koper ---
  step: {
    dur: 0.15, vol: 1.904, vary: 0.12, max: 3, cd: 150,
    play: (c) => {
      osc(c, { f: 280, f2: 520, dur: 0.11, gain: 0.45, attack: 0.005 })
      air(c, { f: 2500, dur: 0.02, gain: 0.08, attack: 0.003 })
    },
  },
  hopUp: {
    dur: 0.45, vol: 2.453, max: 1,
    play: (c) => {
      osc(c, { f: 280, f2: 880, dur: 0.4, gain: 0.3 })
      air(c, { f: 600, f2: 2000, dur: 0.4, gain: 0.1, attack: 0.2 })
    },
  },
  thud: {
    dur: 0.4, vol: 1.236, max: 1,
    play: (c) => {
      osc(c, { f: 120, f2: 45, dur: 0.3, gain: 0.7, attack: 0.004 })
      osc(c, { f: 100, f2: 50, dur: 0.2, gain: 0.3, at: 0.2 })
      air(c, { type: 'lowpass', f: 400, dur: 0.1, gain: 0.2, attack: 0.004 })
    },
  },
  boing: {
    dur: 0.45, vol: 1.663, vary: 0.04, max: 2,
    play: (c) => {
      osc(c, { f: 230, path: [[0.1, 620], [0.22, 300], [0.34, 480]], dur: 0.4, gain: 0.45 })
      osc(c, { type: 'triangle', f: 460, path: [[0.1, 1240], [0.22, 600], [0.34, 960]], dur: 0.4, gain: 0.08 })
    },
  },
  surprise: {
    dur: 0.6, vol: 1.515, max: 1, prio: 2,
    play: (c) => {
      notes(c, [740, 1109], 0.09, { type: 'triangle', dur: 0.3, gain: 0.35 })
      osc(c, { f: 230, path: [[0.1, 620], [0.22, 300], [0.34, 480]], dur: 0.4, gain: 0.3 })
    },
  },

  // --- TV / video ---
  tvFlicker: {
    dur: 2.0, vol: 3.676, max: 1, prio: 2,
    play: (c) => {
      // sinkron dengan keyframe tvOn (8%, 22%, 40%, 60% dari 1.4 s)
      for (const at of [0.11, 0.31, 0.56]) {
        air(c, { f: 3000, dur: 0.06, gain: 0.18, attack: 0.003, at })
        osc(c, { type: 'square', f: 110, dur: 0.06, gain: 0.1, attack: 0.003, at })
      }
      tvOn({ ...c, t: c.t + 0.84 })
    },
  },
  tvOn: { dur: 1.1, vol: 3.676, max: 1, prio: 2, play: tvOn },
  play: { dur: 0.12, vol: 1.89, max: 1, play: (c) => osc(c, { type: 'triangle', f: 560, f2: 840, dur: 0.1, gain: 0.35 }) },
  pause: { dur: 0.12, vol: 1.839, max: 1, play: (c) => osc(c, { type: 'triangle', f: 840, f2: 560, dur: 0.1, gain: 0.35 }) },
  oops: { dur: 0.4, vol: 2.467, max: 1, play: (c) => osc(c, { f: 420, path: [[0.15, 300], [0.3, 230]], dur: 0.35, gain: 0.3 }) },
  fanfare: {
    dur: 2.5, vol: 1.471, max: 1, prio: 2,
    play: (c) => {
      notes(c, [C5, E5, G5, C6], 0.1, { type: 'triangle', dur: 0.4, gain: 0.3 })
      for (const f of [C6, E6, G6]) osc(c, { f, dur: 1.2, gain: 0.2, at: 0.45 })
      // letupan konfeti
      for (let i = 0; i < 6; i++) air(c, { f: 1800 + Math.random() * 1500, q: 0.8, dur: 0.1, gain: 0.15, attack: 0.004, at: 0.45 + i * 0.13 + Math.random() * 0.05 })
      // kilau tersebar
      const sp = [C7, 2637, 3136]
      for (let i = 0; i < 6; i++) osc(c, { f: sp[i % 3], dur: 0.35, gain: 0.09, at: 0.6 + i * 0.25 + Math.random() * 0.08 })
    },
  },

  // --- suasana kabin ---
  // Versi aslinya file sfx-airplaneChimes.m4a (denting dua nada pramugari); ini cadangan sintesis bila file tidak ada
  airplaneChimes: {
    dur: 2.3, vol: 1.418, max: 1,
    play: (c) => {
      osc(c, { f: E6, dur: 1.1, gain: 0.3, attack: 0.01 })
      osc(c, { f: C6, dur: 1.2, gain: 0.3, attack: 0.01, at: 1.0 })
    },
  },
}

/** kategori tiap SFX untuk keseimbangan volume (target loudness per kategori ada di levels.json) */
export type SfxCat = 'ui' | 'transition' | 'action' | 'reward' | 'accent'
export const SFX_CAT: Record<SfxName, SfxCat> = {
  click: 'ui', hover: 'ui', tick: 'ui', pop: 'ui', toggleOn: 'ui', giftHover: 'ui', play: 'ui', pause: 'ui',
  zoomOut: 'transition', zoomIn: 'transition', whooshSoft: 'transition', planeFlyby: 'transition', cloudWhoosh: 'transition', cloudSoft: 'transition',
  takeoff: 'transition', paperDrop: 'action', paperClose: 'action', step: 'action', hopUp: 'action', thud: 'action', boing: 'action',
  surprise: 'action', tvFlicker: 'action', tvOn: 'action', oops: 'action',
  start: 'reward', reward: 'reward', fanfare: 'reward',
  airplaneChimes: 'accent',
}

// ---------------------------------------------------------------------------
// Ambient prosedural (loop 8 detik; siklus bilangan bulat supaya sambungan mulus)
// ---------------------------------------------------------------------------

function mulberry32(seed: number) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const LOOP_SECONDS = 8
const TAU = Math.PI * 2

function fillLoop(name: SynthLoopName, d: Float32Array, sr: number, seed: number) {
  const rnd = mulberry32(seed)
  const white = () => rnd() * 2 - 1
  const n = d.length
  const at = (i: number) => i / sr
  const cyc = (i: number, k: number) => Math.sin((TAU * k * i) / n) // k siklus penuh per loop

  if (name === 'cabin') {
    // dengung mesin: brown noise + hum 118 Hz
    let b = 0
    for (let i = 0; i < n; i++) {
      b = (b + 0.02 * white()) / 1.02
      const am = 1 + 0.1 * cyc(i, 4)
      d[i] = (b * 3.5 + 0.04 * Math.sin(TAU * 118 * at(i)) + 0.02 * Math.sin(TAU * 236 * at(i))) * am
    }
  } else if (name === 'wind') {
    // angin: bandpass (state-variable) dengan cutoff dan amplitudo bergelombang
    let low = 0
    let band = 0
    for (let i = 0; i < n; i++) {
      const fc = 350 + 250 * (0.5 + 0.5 * cyc(i, 1)) + 120 * cyc(i, 3)
      const f = 2 * Math.sin((Math.PI * fc) / sr)
      const w = white()
      low += f * band
      const high = w - low - 0.55 * band
      band += f * high
      d[i] = band * (0.65 + 0.35 * cyc(i, 2))
    }
  } else if (name === 'airport') {
    // dengung percakapan jauh: noise 250-1200 Hz dengan modulasi acak lambat
    let lp = 0
    let hp = 0
    const phases = [rnd() * TAU, rnd() * TAU, rnd() * TAU]
    for (let i = 0; i < n; i++) {
      const w = white()
      lp += 0.14 * (w - lp)
      hp += 0.03 * (lp - hp)
      const m = 0.6 + 0.2 * Math.sin((TAU * 3 * i) / n + phases[0]) + 0.12 * Math.sin((TAU * 7 * i) / n + phases[1]) + 0.08 * Math.sin((TAU * 13 * i) / n + phases[2])
      d[i] = (lp - hp) * m
    }
  } else {
    // roda koper: gemuruh menengah dengan denyut 6 kali per detik
    let lp = 0
    let hp = 0
    for (let i = 0; i < n; i++) {
      const w = white()
      lp += 0.06 * (w - lp)
      hp += 0.01 * (lp - hp)
      d[i] = (lp - hp) * (0.6 + 0.4 * Math.cos((TAU * 6 * LOOP_SECONDS * i) / n))
    }
  }
}

/** puncak sampel tiap loop sintesis; hasil kalibrasi ke target ambience di levels.json (scripts/measure-synth-levels.js) */
const LOOP_PEAK: Record<SynthLoopName, number> = { cabin: 0.3203, wind: 0.3698, airport: 0.2433, wheels: 0.356 }

/** buffer ambient stereo 8 detik (belum diberi crossfade sambungan) */
export function synthLoop(ctx: AudioContext, name: SynthLoopName): AudioBuffer {
  const sr = ctx.sampleRate
  const n = Math.floor(sr * LOOP_SECONDS)
  const buf = ctx.createBuffer(2, n, sr)
  let peak = 0
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch)
    fillLoop(name, d, sr, 1000 + ch * 77 + name.length)
    for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(d[i]))
  }
  const k = peak > 0 ? LOOP_PEAK[name] / peak : 1
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch)
    for (let i = 0; i < n; i++) d[i] *= k
  }
  return buf
}

/** noise putih 2 detik yang dipakai bersama oleh semua resep */
export function makeNoise(ctx: AudioContext): AudioBuffer {
  const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
  const d = buf.getChannelData(0)
  const rnd = mulberry32(42)
  for (let i = 0; i < d.length; i++) d[i] = rnd() * 2 - 1
  return buf
}
