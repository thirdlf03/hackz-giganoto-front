import { ElectronAPI } from '@electron-toolkit/preload'

interface API {
  authenticateWithGitHub: () => Promise<{
    success: boolean
    accessToken?: string
    githubUser?: any
    error?: string
  }>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: API
  }
}
