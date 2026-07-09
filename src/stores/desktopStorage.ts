import type { StateStorage } from 'zustand/middleware'
import { desktopApi } from '../platform/runtime'

export interface DesktopStorageChange {
  key: string
}

/**
 * Custom Zustand StateStorage that delegates to the desktop app's config IPC.
 */
export const desktopStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    if (!desktopApi) return globalThis.localStorage?.getItem(name) ?? null
    const value = await desktopApi.configGet(name)
    return typeof value === 'string' ? value : null
  },
  setItem: async (name: string, value: string): Promise<void> => {
    if (desktopApi) await desktopApi.configSet(name, value)
    else globalThis.localStorage?.setItem(name, value)
  },
  removeItem: async (name: string): Promise<void> => {
    if (desktopApi) await desktopApi.configSet(name, null)
    else globalThis.localStorage?.removeItem(name)
  },
}

export const subscribeDesktopStorageChanges = (
  callback: (change: DesktopStorageChange) => void,
) => {
  return desktopApi?.onConfigChanged?.(callback) ?? (() => {})
}
