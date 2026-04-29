interface ElectronMediaFile {
  name: string
  path: string
}

type SettingsWindowTab = 'general' | 'ai'

export interface FolderTreeNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FolderTreeNode[]
}

interface ElectronAPI {
  isElectron: boolean
  platform: string
  openFile: () => Promise<string | null>
  openFolder: () => Promise<string | null>
  openSettingsWindow: (tab?: SettingsWindowTab, section?: string) => Promise<void>
  closeSettingsWindow: () => Promise<void>
  showInFileManager: (targetPath: string) => Promise<boolean>
  listMediaFiles: (folderPath: string) => Promise<ElectronMediaFile[]>
  listMediaTree: (folderPath: string) => Promise<FolderTreeNode[]>
  configGet: (key: string) => Promise<unknown>
  configSet: (key: string, value: unknown) => Promise<void>
  configGetAll: () => Promise<unknown>
  fetch: (url: string, options?: RequestInit) => Promise<{ ok: boolean, status: number, statusText: string, data: string, headers: Record<string, string> }>
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}

export {}
