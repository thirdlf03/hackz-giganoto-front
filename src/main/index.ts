import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import * as http from 'http'
import * as url from 'url'

// GitHub OAuth設定
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || 'demo_client_id'
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || 'demo_client_secret'
const CUSTOM_PROTOCOL = 'discord-app'
const isDev = process.env.NODE_ENV === 'development' || is.dev
const REDIRECT_URI = isDev
  ? 'http://localhost:5174/oauth/callback'
  : `${CUSTOM_PROTOCOL}://oauth/callback`

// OAuth認証状態管理
let authWindow: BrowserWindow | null = null
let authResolve: ((value: string) => void) | null = null
let authReject: ((reason?: any) => void) | null = null
let localServer: http.Server | null = null

// カスタムプロトコルハンドラーの設定（本番用）
function setupCustomProtocolHandler() {
  // 本番環境でのみカスタムプロトコルを設定
  if (!isDev) {
    // カスタムプロトコルをデフォルトとして設定
    if (!app.isDefaultProtocolClient(CUSTOM_PROTOCOL)) {
      app.setAsDefaultProtocolClient(CUSTOM_PROTOCOL)
    }

    // プロトコルURLの処理
    app.on('open-url', (event, url) => {
      event.preventDefault()
      handleProtocolUrl(url)
    })

    // Windows/Linuxでのセカンドインスタンス処理
    app.on('second-instance', (_, commandLine) => {
      // コマンドライン引数からプロトコルURLを探す
      const protocolUrl = commandLine.find(arg => arg.startsWith(`${CUSTOM_PROTOCOL}://`))
      if (protocolUrl) {
        handleProtocolUrl(protocolUrl)
      }
    })
  }
}

// プロトコルURLの処理
function handleProtocolUrl(url: string) {
  console.log('Received protocol URL:', url)

  const urlObj = new URL(url)
  if (urlObj.pathname === '/oauth/callback') {
    const code = urlObj.searchParams.get('code')
    const error = urlObj.searchParams.get('error')

    if (error) {
      console.error('OAuth error:', error)
      if (authReject) {
        authReject(new Error(error))
        authReject = null
        authResolve = null
      }
    } else if (code) {
      console.log('Received authorization code via protocol')
      if (authResolve) {
        authResolve(code)
        authResolve = null
        authReject = null
      }
    } else {
      console.error('No code or error in callback URL')
      if (authReject) {
        authReject(new Error('No authorization code received'))
        authReject = null
        authResolve = null
      }
    }

    // 認証ウィンドウを閉じる
    if (authWindow) {
      authWindow.close()
      authWindow = null
    }
  }
}

// 開発用ローカルサーバーの起動
function startLocalServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!isDev || localServer) {
      resolve()
      return
    }

    localServer = http.createServer((req, res) => {
      const parsedUrl = url.parse(req.url!, true)

      if (parsedUrl.pathname === '/oauth/callback') {
        const code = parsedUrl.query.code as string
        const error = parsedUrl.query.error as string

        if (error) {
          console.error('OAuth error:', error)
          if (authReject) {
            authReject(new Error(error))
            authReject = null
            authResolve = null
          }
        } else if (code) {
          console.log('Received authorization code via localhost')
          if (authResolve) {
            authResolve(code)
            authResolve = null
            authReject = null
          }
        }

        // 認証ウィンドウを閉じる
        if (authWindow) {
          authWindow.close()
          authWindow = null
        }

        // レスポンスを返す
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
        res.end(`
          <html>
            <body>
              <h1>認証完了</h1>
              <p>このウィンドウを閉じてアプリに戻ってください。</p>
              <script>window.close();</script>
            </body>
          </html>
        `)
      } else {
        res.writeHead(404)
        res.end('Not Found')
      }
    })

    localServer.listen(5174, '127.0.0.1', () => {
      console.log('Local OAuth server started on http://localhost:5174')
      resolve()
    })

    localServer.on('error', (err) => {
      console.error('Local server error:', err)
      reject(err)
    })
  })
}

// OAuth認証ウィンドウの作成
async function createAuthWindow(): Promise<string> {
  return new Promise(async (resolve, reject) => {
    // 既存の認証プロセスがある場合はエラー
    if (authResolve || authReject) {
      reject(new Error('Authentication already in progress'))
      return
    }

    authResolve = resolve
    authReject = reject

    try {
      // 開発環境でローカルサーバーを起動
      if (isDev) {
        await startLocalServer()
      }

      // 認証ウィンドウを作成
      authWindow = new BrowserWindow({
        width: 500,
        height: 600,
        show: true,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true
        }
      })

      // GitHub OAuth URL
      const authUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=user:email`
      console.log('Opening auth URL:', authUrl)
      authWindow.loadURL(authUrl)

      authWindow.on('closed', () => {
        authWindow = null
        if (authReject) {
          authReject(new Error('Authentication window was closed'))
          authReject = null
          authResolve = null
        }
      })
    } catch (error) {
      console.error('Error creating auth window:', error)
      authReject = null
      authResolve = null
      reject(error)
    }
  })
}

// アクセストークンの取得
async function getAccessToken(code: string): Promise<string> {
  try {
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code: code,
        redirect_uri: REDIRECT_URI
      })
    })

    const data = await response.json()

    if (data.error) {
      throw new Error(data.error_description || data.error)
    }

    return data.access_token
  } catch (error) {
    throw new Error(`Failed to get access token: ${error}`)
  }
}

// GitHubユーザー情報の取得
async function getGitHubUser(accessToken: string): Promise<any> {
  try {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `token ${accessToken}`,
        Accept: 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    throw new Error(`Failed to get user info: ${error}`)
  }
}

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // カスタムプロトコルハンドラーを設定

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  // GitHub OAuth認証
  ipcMain.handle('github-oauth', async () => {
    try {
      console.log('Starting GitHub OAuth flow...')

      // 認証ウィンドウを開いて認証コードを取得
      console.log('Creating auth window...')
      const code = await createAuthWindow()
      console.log('Received authorization code:', code.substring(0, 10) + '...')

      // 認証コードでアクセストークンを取得
      console.log('Getting access token...')
      const accessToken = await getAccessToken(code)
      console.log('Received access token:', accessToken.substring(0, 10) + '...')

      // アクセストークンでユーザー情報を取得
      console.log('Getting user info...')
      const githubUser = await getGitHubUser(accessToken)
      console.log('Received user info:', githubUser.login)

      return {
        success: true,
        accessToken,
        githubUser
      }
    } catch (error) {
      console.error('OAuth error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// アプリケーション終了時のクリーンアップ
app.on('before-quit', () => {
  // 認証状態をクリーンアップ
  if (authWindow) {
    authWindow.close()
    authWindow = null
  }
  authResolve = null
  authReject = null

  // ローカルサーバーを停止
  if (localServer) {
    localServer.close()
    localServer = null
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
