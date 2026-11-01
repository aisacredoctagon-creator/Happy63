// Utilitas pemrosesan gambar sederhana (tanpa OpenCV) untuk tools/process-assets.mjs
import sharp from 'sharp'

export async function loadRGB(path) {
  const { data, info } = await sharp(path).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  return { data: new Uint8ClampedArray(data), w: info.width, h: info.height }
}

export const idx = (w, x, y) => y * w + x

/** polygon -> mask (even-odd) */
export function polyMask(w, h, pts) {
  const m = new Uint8Array(w * h)
  const minY = Math.max(0, Math.floor(Math.min(...pts.map((p) => p[1]))))
  const maxY = Math.min(h - 1, Math.ceil(Math.max(...pts.map((p) => p[1]))))
  for (let y = minY; y <= maxY; y++) {
    const xs = []
    for (let i = 0; i < pts.length; i++) {
      const [x1, y1] = pts[i]
      const [x2, y2] = pts[(i + 1) % pts.length]
      if ((y1 <= y && y2 > y) || (y2 <= y && y1 > y)) xs.push(x1 + ((y - y1) / (y2 - y1)) * (x2 - x1))
    }
    xs.sort((a, b) => a - b)
    for (let i = 0; i + 1 < xs.length; i += 2) {
      for (let x = Math.max(0, Math.round(xs[i])); x <= Math.min(w - 1, Math.round(xs[i + 1])); x++) m[idx(w, x, y)] = 1
    }
  }
  return m
}

export function rectMask(w, h, x0, y0, x1, y1) {
  const m = new Uint8Array(w * h)
  for (let y = Math.max(0, y0); y <= Math.min(h - 1, y1); y++) for (let x = Math.max(0, x0); x <= Math.min(w - 1, x1); x++) m[idx(w, x, y)] = 1
  return m
}

export function ellipseMask(w, h, cx, cy, rx, ry) {
  const m = new Uint8Array(w * h)
  for (let y = Math.max(0, Math.floor(cy - ry)); y <= Math.min(h - 1, Math.ceil(cy + ry)); y++)
    for (let x = Math.max(0, Math.floor(cx - rx)); x <= Math.min(w - 1, Math.ceil(cx + rx)); x++) {
      const dx = (x - cx) / rx, dy = (y - cy) / ry
      if (dx * dx + dy * dy <= 1) m[idx(w, x, y)] = 1
    }
  return m
}

export const union = (...ms) => {
  const o = new Uint8Array(ms[0].length)
  for (const m of ms) for (let i = 0; i < o.length; i++) if (m[i]) o[i] = 1
  return o
}
export const intersect = (a, b) => {
  const o = new Uint8Array(a.length)
  for (let i = 0; i < o.length; i++) o[i] = a[i] & b[i]
  return o
}
export const subtract = (a, b) => {
  const o = new Uint8Array(a.length)
  for (let i = 0; i < o.length; i++) o[i] = a[i] & (b[i] ^ 1)
  return o
}

function maxFilter1D(src, w, h, r, horizontal) {
  const out = new Uint8Array(src.length)
  if (horizontal) {
    for (let y = 0; y < h; y++) {
      let last = -1e9
      const row = y * w
      // jarak ke 1 terdekat di kiri & kanan
      const left = new Int32Array(w)
      for (let x = 0; x < w; x++) { if (src[row + x]) last = x; left[x] = last }
      last = 1e9
      for (let x = w - 1; x >= 0; x--) {
        if (src[row + x]) last = x
        if (x - left[x] <= r || last - x <= r) out[row + x] = 1
      }
    }
  } else {
    for (let x = 0; x < w; x++) {
      let last = -1e9
      const top = new Int32Array(h)
      for (let y = 0; y < h; y++) { if (src[y * w + x]) last = y; top[y] = last }
      last = 1e9
      for (let y = h - 1; y >= 0; y--) {
        if (src[y * w + x]) last = y
        if (y - top[y] <= r || last - y <= r) out[y * w + x] = 1
      }
    }
  }
  return out
}
export function dilate(m, w, h, r) {
  if (r <= 0) return m
  return maxFilter1D(maxFilter1D(m, w, h, r, true), w, h, r, false)
}
export function erode(m, w, h, r) {
  if (r <= 0) return m
  const inv = m.map((v) => v ^ 1)
  // piksel di luar gambar dianggap 0 (tidak dierosi dari tepi)
  return dilate(inv, w, h, r).map((v) => v ^ 1)
}
export const close = (m, w, h, r) => erode(dilate(m, w, h, r), w, h, r)

export function fillHoles(m, w, h) {
  const outside = new Uint8Array(w * h)
  const stack = []
  const push = (x, y) => {
    const i = idx(w, x, y)
    if (!m[i] && !outside[i]) { outside[i] = 1; stack.push(i) }
  }
  for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1) }
  for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y) }
  while (stack.length) {
    const i = stack.pop()
    const x = i % w, y = (i / w) | 0
    if (x > 0) push(x - 1, y)
    if (x < w - 1) push(x + 1, y)
    if (y > 0) push(x, y - 1)
    if (y < h - 1) push(x, y + 1)
  }
  return m.map((v, i) => (v || !outside[i] ? 1 : 0))
}

export function largestComponent(m, w, h) {
  const label = new Int32Array(w * h)
  let best = 0, bestId = 0, id = 0
  for (let s = 0; s < m.length; s++) {
    if (!m[s] || label[s]) continue
    id++
    let count = 0
    const stack = [s]
    label[s] = id
    while (stack.length) {
      const i = stack.pop()
      count++
      const x = i % w, y = (i / w) | 0
      for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue
        const j = ny * w + nx
        if (m[j] && !label[j]) { label[j] = id; stack.push(j) }
      }
    }
    if (count > best) { best = count; bestId = id }
  }
  return m.map((_, i) => (label[i] === bestId ? 1 : 0))
}

export function bbox(m, w, h) {
  let x0 = w, y0 = h, x1 = -1, y1 = -1
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (m[y * w + x]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y }
  return { x0, y0, x1, y1 }
}

/** Isi area (mask=1) dengan difusi (Laplace) dari piksel di sekitarnya. */
export function inpaint(rgb, w, h, mask, iterations = 500) {
  const out = new Float32Array(rgb.length)
  for (let i = 0; i < rgb.length; i++) out[i] = rgb[i]
  const { x0, y0, x1, y1 } = bbox(mask, w, h)
  const known = mask.map((v) => v ^ 1)
  // inisialisasi onion-peel
  let frontier = true
  const done = Uint8Array.from(known)
  const order = []
  while (frontier) {
    frontier = false
    const layer = []
    for (let y = Math.max(0, y0 - 1); y <= Math.min(h - 1, y1 + 1); y++)
      for (let x = Math.max(0, x0 - 1); x <= Math.min(w - 1, x1 + 1); x++) {
        const i = y * w + x
        if (done[i]) continue
        let n = 0, r = 0, g = 0, b = 0
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue
          const j = ny * w + nx
          if (done[j]) { n++; r += out[j * 3]; g += out[j * 3 + 1]; b += out[j * 3 + 2] }
        }
        if (n) layer.push([i, r / n, g / n, b / n])
      }
    for (const [i, r, g, b] of layer) { out[i * 3] = r; out[i * 3 + 1] = g; out[i * 3 + 2] = b; done[i] = 1; order.push(i) }
    if (layer.length) frontier = true
  }
  // iterasi Gauss-Seidel
  for (let it = 0; it < iterations; it++) {
    for (const i of order) {
      const x = i % w, y = (i / w) | 0
      for (let c = 0; c < 3; c++) {
        const l = x > 0 ? out[(i - 1) * 3 + c] : out[i * 3 + c]
        const r = x < w - 1 ? out[(i + 1) * 3 + c] : out[i * 3 + c]
        const u = y > 0 ? out[(i - w) * 3 + c] : out[i * 3 + c]
        const d = y < h - 1 ? out[(i + w) * 3 + c] : out[i * 3 + c]
        out[i * 3 + c] = (l + r + u + d) / 4
      }
    }
  }
  const res = new Uint8ClampedArray(rgb.length)
  for (let i = 0; i < res.length; i++) res[i] = Math.round(out[i])
  return res
}

/** Isi per baris dengan interpolasi linear antara piksel kiri-kanan (cocok untuk latar berlapis horizontal: lantai, jendela, ban berjalan). */
export function inpaintRows(rgb, w, h, mask, vblur = 3) {
  const out = new Float32Array(rgb.length)
  for (let i = 0; i < rgb.length; i++) out[i] = rgb[i]
  const avg = (x, y, dir) => {
    let r = 0, g = 0, b = 0, n = 0
    for (let k = 0; k < 3; k++) {
      const xx = x + dir * k
      if (xx < 0 || xx >= w) continue
      const i = y * w + xx
      if (mask[i]) continue
      r += rgb[i * 3]; g += rgb[i * 3 + 1]; b += rgb[i * 3 + 2]; n++
    }
    return n ? [r / n, g / n, b / n] : null
  }
  for (let y = 0; y < h; y++) {
    let x = 0
    while (x < w) {
      if (!mask[y * w + x]) { x++; continue }
      let xb = x
      while (xb + 1 < w && mask[y * w + xb + 1]) xb++
      const L = avg(x - 1, y, -1), R = avg(xb + 1, y, 1)
      for (let xx = x; xx <= xb; xx++) {
        const t = (xx - x + 1) / (xb - x + 2)
        const c = L && R ? [0, 1, 2].map((k) => L[k] * (1 - t) + R[k] * t) : (L || R || [128, 128, 128])
        for (let k = 0; k < 3; k++) out[(y * w + xx) * 3 + k] = c[k]
      }
      x = xb + 1
    }
  }
  // haluskan secara vertikal hanya di dalam area isian
  for (let pass = 0; pass < vblur; pass++) {
    const src = Float32Array.from(out)
    for (let y = 2; y < h - 2; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x
      if (!mask[i]) continue
      for (let k = 0; k < 3; k++) {
        out[i * 3 + k] = (src[(i - 2 * w) * 3 + k] + 2 * src[(i - w) * 3 + k] + 3 * src[i * 3 + k] + 2 * src[(i + w) * 3 + k] + src[(i + 2 * w) * 3 + k]) / 9
      }
    }
  }
  const res = new Uint8ClampedArray(rgb.length)
  for (let i = 0; i < res.length; i++) res[i] = Math.round(out[i])
  return res
}

/** blur kanal alpha (0/1 -> 0..255) dengan sharp */
export async function softAlpha(m, w, h, sigma) {
  const buf = Buffer.from(m.map((v) => v * 255))
  if (sigma <= 0) return new Uint8Array(buf)
  const { data, info } = await sharp(buf, { raw: { width: w, height: h, channels: 1 } }).blur(sigma).raw().toBuffer({ resolveWithObject: true })
  if (info.channels === 1) return new Uint8Array(data)
  const out = new Uint8Array(w * h)
  for (let i = 0; i < out.length; i++) out[i] = data[i * info.channels]
  return out
}

/** Haluskan tepi hasil isian: sebarkan hasil inpaint ke piksel asli di sekitar dengan feather. */
export async function composeFill(orig, filled, w, h, mask, feather = 2) {
  const a = await softAlpha(mask, w, h, feather)
  const out = new Uint8ClampedArray(orig.length)
  for (let i = 0; i < w * h; i++) {
    const t = mask[i] ? 1 : a[i] / 255
    for (let c = 0; c < 3; c++) out[i * 3 + c] = Math.round(orig[i * 3 + c] * (1 - t) + filled[i * 3 + c] * t)
  }
  return out
}

export async function cutSprite(rgb, w, h, mask, pad = 4, sigma = 0.8) {
  const { x0, y0, x1, y1 } = bbox(mask, w, h)
  const X0 = Math.max(0, x0 - pad), Y0 = Math.max(0, y0 - pad)
  const X1 = Math.min(w - 1, x1 + pad), Y1 = Math.min(h - 1, y1 + pad)
  const cw = X1 - X0 + 1, ch = Y1 - Y0 + 1
  const alpha = await softAlpha(mask, w, h, sigma)
  const buf = Buffer.alloc(cw * ch * 4)
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
    const si = (Y0 + y) * w + (X0 + x)
    const di = (y * cw + x) * 4
    buf[di] = rgb[si * 3]; buf[di + 1] = rgb[si * 3 + 1]; buf[di + 2] = rgb[si * 3 + 2]; buf[di + 3] = alpha[si]
  }
  return { buf, width: cw, height: ch, x: X0, y: Y0 }
}

export const rgbaToSharp = (rgb, w, h) => sharp(Buffer.from(rgb.buffer, rgb.byteOffset, rgb.length), { raw: { width: w, height: h, channels: 3 } })
