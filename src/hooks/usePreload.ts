import { useEffect, useState } from 'react'

/** Memuat semua gambar di muka; mengembalikan progres 0..1 dan flag selesai. Gambar gagal dimuat tidak menahan loading. */
export function usePreload(urls: string[]) {
  const [loaded, setLoaded] = useState(0)
  useEffect(() => {
    let alive = true
    let count = 0
    urls.forEach((u) => {
      const img = new Image()
      const finish = () => {
        count++
        if (alive) setLoaded(count)
      }
      img.onload = () => {
        img.decode?.().catch(() => {}) // pra-decode tanpa menahan loading
        finish()
      }
      img.onerror = finish
      img.src = u
    })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return { progress: urls.length ? loaded / urls.length : 1, done: loaded >= urls.length }
}
