import { useEffect, useSyncExternalStore } from 'react'
import { sceneLabel } from '../data/scenes'

/**
 * Penanda scene aktif untuk alat bantu debug (hanya mode dev; di build final tidak melakukan apa-apa).
 * Tiap scene memanggil `useSceneTag('05')`. Scene baru yang tampil menggantikan yang lama (yang lama masih
 * terpasang sebentar selama cross-fade), jadi penanda aktif = yang terakhir masuk.
 */
const stack: string[] = []
const listeners = new Set<() => void>()
let current = ''

const subscribe = (fn: () => void) => {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}
const update = () => {
  current = stack[stack.length - 1] ?? ''
  listeners.forEach((f) => f())
}

export function useSceneTag(no: string) {
  useEffect(() => {
    if (!import.meta.env.DEV) return
    stack.push(no)
    update()
    console.info(`[${sceneLabel(no)}] tampil`)
    return () => {
      const i = stack.indexOf(no)
      if (i >= 0) stack.splice(i, 1)
      update()
    }
  }, [no])
}

export function useCurrentSceneTag() {
  return useSyncExternalStore(subscribe, () => current)
}
