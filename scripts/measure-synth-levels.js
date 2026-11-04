/**
 * Ukur dan kalibrasi level SFX/loop SINTESIS (src/audio/synth.ts) ke target di src/audio/levels.json.
 * File audio (m4a/mp3) dinormalisasi oleh `npm run audio`; skrip ini melakukan hal setara untuk suara hasil sintesis.
 * Semua SFX dikalibrasi ke level acuan yang sama (targetLufs.sfx); hierarki minor/main/key diterapkan saat diputar (mix.ts).
 *
 * Cara pakai: jalankan `npm run dev`, buka halaman di browser, buka konsol (F12), tempel seluruh isi file ini lalu Enter.
 * Hasil: tabel berisi loudness sekarang (LUFS), `vol` baru, puncak, dan loudness EFEKTIF saat diputar (setelah gain tingkat).
 * Salin `vol` baru ke tiap SFX di synth.ts, dan `LOOP_PEAK` ke konstanta di synth.ts (fungsi synthLoop).
 *
 * Metode: render offline 48 kHz, K-weighting ITU-R BS.1770, rata-rata kuadrat selama durasi nominal SFX (`dur`).
 * Sumber mono diputar ke dua speaker (L = R), jadi dihitung sebagai stereo identik (+3 LU), sama seperti saat diputar.
 * Puncak sampel dibatasi -1,5 dBFS. Tingkat key (+3 dB saat diputar) bisa melewati batas itu pada puncak yang singkat; soft-clipper di keluaran (audio.ts) melunakkannya.
 */
;(async () => {
  const synth = await import('/src/audio/synth.ts')
  const { VOLUME } = await import('/src/audio/mix.ts')
  const levels = (await import('/src/audio/levels.json')).default
  const SR = 48000
  const KW = [
    { b: [1.53512485958697, -2.69169618940638, 1.19839281085285], a: [1, -1.69065929318241, 0.73248077421585] },
    { b: [1, -2, 1], a: [1, -1.99004745483398, 0.99007225036621] },
  ]
  const kweight = (x) => {
    let y = x
    for (const { b, a } of KW) {
      const o = new Float64Array(y.length)
      let x1 = 0, x2 = 0, y1 = 0, y2 = 0
      for (let i = 0; i < y.length; i++) {
        const xi = y[i]
        const yi = b[0] * xi + b[1] * x1 + b[2] * x2 - a[1] * y1 - a[2] * y2
        o[i] = yi
        x2 = x1; x1 = xi; y2 = y1; y1 = yi
      }
      y = o
    }
    return y
  }
  const lufs = (channels, n) => {
    let ms = 0
    for (const ch of channels) {
      const k = kweight(ch.subarray(0, n))
      let s = 0
      for (let i = 0; i < n; i++) s += k[i] * k[i]
      ms += s / n
    }
    return -0.691 + 10 * Math.log10(ms)
  }
  const peakDb = (channels, n) => {
    let m = 0
    for (const ch of channels) for (let i = 0; i < n; i++) m = Math.max(m, Math.abs(ch[i]))
    return 20 * Math.log10(m || 1e-9)
  }

  const sfx = []
  for (const [name, def] of Object.entries(synth.SFX)) {
    const len = Math.ceil((def.dur + 0.4) * SR)
    const oc = new OfflineAudioContext(1, len, SR)
    const voice = oc.createGain()
    voice.gain.value = def.vol
    voice.connect(oc.destination)
    def.play({ ctx: oc, out: voice, t: 0.005, rate: 1, noise: synth.makeNoise(oc) })
    const x = (await oc.startRendering()).getChannelData(0)
    const n = Math.min(len, Math.ceil((def.dur + 0.005) * SR))
    const L = lufs([x, x], n)
    const pk = peakDb([x], len)
    const tierDb = VOLUME[def.tier]
    const cap = -1.5
    let g = levels.targetLufs.sfx - L
    const capped = pk + g > cap
    if (capped) g = cap - pk
    sfx.push({ name, tier: def.tier, lufsNow: +L.toFixed(1), volNow: def.vol, volNew: +(def.vol * 10 ** (g / 20)).toFixed(3), peakNew: +(pk + g).toFixed(1), calibrated: +(L + g).toFixed(1), effective: +(L + g + tierDb).toFixed(1), capped })
  }

  const loops = []
  for (const name of ['cabin', 'wind', 'airport', 'wheels']) {
    const oc = new OfflineAudioContext(2, SR * 8, SR)
    const buf = synth.synthLoop(oc, name) // dengan puncak saat ini
    const ch = [buf.getChannelData(0), buf.getChannelData(1)]
    const L = lufs(ch, buf.length)
    const peakNow = 10 ** (peakDb(ch, buf.length) / 20)
    loops.push({ name, lufsNow: +L.toFixed(1), target: levels.targetLufs.ambience, peakNow: +peakNow.toFixed(3), LOOP_PEAK: +(peakNow * 10 ** ((levels.targetLufs.ambience - L) / 20)).toFixed(4) })
  }
  console.table(sfx)
  console.table(loops)
  return { sfx, loops }
})()
