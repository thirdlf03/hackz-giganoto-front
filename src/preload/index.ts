import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  // GitHub OAuth認証
  authenticateWithGitHub: () => ipcRenderer.invoke('github-oauth'),
  
  // safeStorage関連API
  safeStorage: {
    encrypt: (text: string) => ipcRenderer.invoke('safe-storage-encrypt', text),
    decrypt: (encryptedData: string) => ipcRenderer.invoke('safe-storage-decrypt', encryptedData),
    isAvailable: () => ipcRenderer.invoke('safe-storage-available')
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
