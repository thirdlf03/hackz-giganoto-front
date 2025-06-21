import { ElectronAPI } from '@electron-toolkit/preload'

interface API {
  authenticateWithGitHub: () => Promise<{
    accessToken: string
    user: any
  }>
  safeStorage: {
    encrypt: (text: string) => Promise<string>
    decrypt: (encryptedData: string) => Promise<string>
    isAvailable: () => Promise<boolean>
  }
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: API
  }
}
