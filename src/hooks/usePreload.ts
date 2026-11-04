import { useEffect, useState } from 'react'

/** jumlah gambar yang diunduh bersamaan; dibatasi supaya memori ponsel tidak melonjak */
const CONCURRENCY = 4

/**
 * Memuat semua gambar di muka (masuk ke cache browser); mengembalikan progres 0..1 dan flag selesai.
 * Gambar gagal dimuat tidak menahan loading.
 *
 * Gambar sengaja TIDAK di-decode di sini: men-decode puluhan gambar sekaligus (total ratusan MB piksel) membuat Safari iPhone
 * mematikan tab ("A problem repeatedly occurred"). Setiap gambar di-decode oleh browser saat scene yang memakainya tampil, dan
 * elemen Image dilepas begitu selesai diunduh.
 */
export function usePreload(urls: string[]) {
  const [loaded, setLoaded] = useState(0)
  useEffect(() => {
    let alive = true
    let count = 0
    let next = 0
    const loadNext = () => {
      if (!alive || next >= urls.length) return
      const img = new Image()
      const finish = () => {
        img.onload = img.onerror = null
        img.src = '' // lepaskan referensi bitmap
        count++
        if (alive) setLoaded(count)
        loadNext()
      }
      img.onload = finish
      img.onerror = finish
      img.src = urls[next++]
    }
    for (let i = 0; i < CONCURRENCY; i++) loadNext()
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return { progress: urls.length ? loaded / urls.length : 1, done: loaded >= urls.length }
}
