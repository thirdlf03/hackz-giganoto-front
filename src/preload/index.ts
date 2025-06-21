import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  // 認証関連API
  auth: {
    githubLogin: () => ipcRenderer.invoke('github-login')
  },
  
  // HTTP リクエスト関連API
  http: {
    get: (url: string) => ipcRenderer.invoke('http-get', url),
    post: (url: string, data?: any) => ipcRenderer.invoke('http-post', url, data)
  },
  
  // safeStorage関連API
  safeStorage: {
    encrypt: (text: string) => ipcRenderer.invoke('safe-storage-encrypt', text),
    decrypt: (encryptedData: string) => ipcRenderer.invoke('safe-storage-decrypt', encryptedData),
    isAvailable: () => ipcRenderer.invoke('safe-storage-available')
  },
  
  // 認証ウィンドウ関連API
  openAuthWindow: (url: string) => ipcRenderer.invoke('open-auth-window', url),
  onAuthCallback: (callback: (event: any, data: { code: string, state: string }) => void) => 
    ipcRenderer.on('auth-callback', callback),
  onAuthWindowClosed: (callback: () => void) => 
    ipcRenderer.on('auth-window-closed', callback),
  removeAuthListeners: () => {
    ipcRenderer.removeAllListeners('auth-callback')
    ipcRenderer.removeAllListeners('auth-window-closed')
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
