import { ElectronAPI } from '@electron-toolkit/preload'

interface API {
  auth: {
    githubLogin: () => Promise<{
      accessToken: string
      user: any
    }>
  }
  http: {
    get: (url: string) => Promise<any>
    post: (url: string, data?: any) => Promise<any>
  }
  safeStorage: {
    encrypt: (text: string) => Promise<string>
    decrypt: (encryptedData: string) => Promise<string>
    isAvailable: () => Promise<boolean>
  }
  openAuthWindow: (url: string) => Promise<void>
  onAuthCallback: (callback: (event: any, data: { code: string, state: string }) => void) => void
  onAuthWindowClosed: (callback: () => void) => void
  removeAuthListeners: () => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: API
  }
}
