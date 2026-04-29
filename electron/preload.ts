import { contextBridge, ipcRenderer } from 'electron'

type SettingsWindowTab = 'general' | 'ai'

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  openFolder: () => ipcRenderer.invoke('dialog:openFolder'),
  openSettingsWindow: (tab?: SettingsWindowTab, section?: string) =>
    ipcRenderer.invoke('window:openSettings', tab, section),
  closeSettingsWindow: () => ipcRenderer.invoke('window:closeSettings'),
  showInFileManager: (targetPath: string) =>
    ipcRenderer.invoke('shell:showInFileManager', targetPath),
  listMediaFiles: (folderPath: string) =>
    ipcRenderer.invoke('fs:listMediaFiles', folderPath),
  listMediaTree: (folderPath: string) =>
    ipcRenderer.invoke('fs:listMediaTree', folderPath),
  configGet: (key: string) => ipcRenderer.invoke('config:get', key),
  configSet: (key: string, value: unknown) =>
    ipcRenderer.invoke('config:set', key, value),
  configGetAll: () => ipcRenderer.invoke('config:getAll'),
  fetch: (url: string, options?: RequestInit) => ipcRenderer.invoke('net:fetch', url, options),
})
