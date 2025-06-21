import { app, shell, BrowserWindow, ipcMain, session, desktopCapturer } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import * as http from 'http'
import axios from 'axios'




let authWindow: BrowserWindow | null = null

let localServer: http.Server | null = null





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

  // safeStorageのIPCハンドラー
  ipcMain.handle('safe-storage-encrypt', async (_, text: string) => {
    try {
      const { safeStorage } = await import('electron')
      if (safeStorage.isEncryptionAvailable()) {
        const encryptedBuffer = safeStorage.encryptString(text)
        return encryptedBuffer.toString('base64')
      } else {
        // 暗号化が利用できない場合は元のテキストをそのまま返す（本番環境では適切な処理が必要）
        return text
      }
    } catch (error) {
      console.error('Encryption error:', error)
      throw error
    }
  })

  ipcMain.handle('safe-storage-decrypt', async (_, encryptedData: string) => {
    try {
      const { safeStorage } = await import('electron')
      if (safeStorage.isEncryptionAvailable()) {
        const buffer = Buffer.from(encryptedData, 'base64')
        return safeStorage.decryptString(buffer)
      } else {
        // 暗号化が利用できない場合は元のデータをそのまま返す
        return encryptedData
      }
    } catch (error) {
      console.error('Decryption error:', error)
      throw error
    }
  })

  ipcMain.handle('safe-storage-available', async () => {
    try {
      const { safeStorage } = await import('electron')
      return safeStorage.isEncryptionAvailable()
    } catch (error) {
      console.error('Safe storage check error:', error)
      return false
    }
  })

  ipcMain.handle('open-auth-window', async (event, url: string) => {
    try {
      const parentWindow = BrowserWindow.fromWebContents(event.sender)
      
      const authWindow = new BrowserWindow({
        width: 500,
        height: 600,
        parent: parentWindow || undefined,
        modal: true,
        show: true,
        autoHideMenuBar: true,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          webSecurity: true
        }
      })

      authWindow.webContents.on('will-redirect', async (event, navigationUrl) => {
        console.log('リダイレクト発生予定:', navigationUrl)

        authWindow.close()

        const response = await axios.get(navigationUrl);
        const { access_token, token_type, expires_in, user_id } = response.data;
        console.log(access_token, token_type, expires_in, user_id)

        parentWindow?.webContents.send('auth-callback', {
          access_token,
          token_type,
          expires_in,
          user_id,
        })
      })

      authWindow.webContents.on('did-navigate', async (event, navigationUrl) => {
        console.log('ナビゲーション完了:', navigationUrl)
        if (/auth\/github\/callback/.test(navigationUrl)) {
          authWindow.close()

          const response = await axios.get(navigationUrl);
          const { access_token, token_type, expires_in, user_id } = response.data;
          console.log(access_token, token_type, expires_in, user_id)

          parentWindow?.webContents.send('auth-callback', {
            access_token,
            token_type,
            expires_in,
            user_id,
          })
        }
      })

      authWindow.loadURL(url)
      
      authWindow.on('closed', () => {
        parentWindow?.webContents.send('auth-window-closed', {
          windowId: authWindow.id
        })
      })

      return authWindow.id
    } catch (error) {
      console.error('Error opening auth window:', error)
      throw error
    }
  })

  session.defaultSession.setDisplayMediaRequestHandler((_, callback) => {
    desktopCapturer.getSources({ types: ['screen'] }).then((sources) => {
      // Grant access to the first screen found.
      callback({ video: sources[0], audio: 'loopback' })
    })
    // If true, use the system picker if available.
    // Note: this is currently experimental. If the system picker
    // is available, it will be used and the media request handler
    // will not be invoked.
  }, { useSystemPicker: true })

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

  // ローカルサーバーを停止
  if (localServer) {
    localServer.close()
    localServer = null
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
