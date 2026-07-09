import { desktopApi } from "../platform/runtime";

// Approved desktop capability bridge for the repository layer.

export const dataClient = {
  get: async <T>(path: string): Promise<T | null> => {
    if (!desktopApi) return null
    return desktopApi.dataGet(path) as Promise<T | null>
  },
  put: async (path: string, data: unknown): Promise<void> => {
    if (!desktopApi) return
    await desktopApi.dataPut(path, data)
  },
  delete: async (path: string): Promise<void> => {
    if (!desktopApi) return
    await desktopApi.dataDelete(path)
  },
  list: async (path: string): Promise<string[]> => {
    if (!desktopApi) return []
    return desktopApi.dataList(path)
  },
  getBinary: async (path: string): Promise<ArrayBuffer | null> => {
    if (!desktopApi) return null
    return desktopApi.dataGetMediaFile(path)
  },
  putBinary: async (path: string, data: ArrayBuffer): Promise<void> => {
    if (!desktopApi) return
    await desktopApi.dataPutMediaFile(path, data)
  },
  getDirectory: async (): Promise<string | null> => {
    if (!desktopApi) return null
    return desktopApi.dataGetDirectory()
  },
  isMigrated: async (): Promise<boolean> => {
    if (!desktopApi) return false
    return desktopApi.dataIsMigrated()
  },
  approvePath: async (filePath: string): Promise<void> => {
    if (!desktopApi?.approvePath) return
    await desktopApi.approvePath(filePath)
  },
}
