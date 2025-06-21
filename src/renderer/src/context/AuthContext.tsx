import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { AuthState, User } from '../types'
import axios from 'axios'

interface AuthContextType {
  auth: AuthState
  currentUser: User | null
  login: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuthContext = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [auth, setAuth] = useState<AuthState>({
    isAuthenticated: false,
    accessToken: null,
    isLoading: false,
    error: null
  })

  const [currentUser, setCurrentUser] = useState<User | null>(null)

    const login = useCallback(async () => {
    try {
      setAuth(prev => ({ ...prev, isLoading: true, error: null }))

      const response = await axios.get("http://localhost:9000/auth/github")
      const { auth_url, status } = response.data
      console.log(auth_url)
      console.log(status)

      // 認証コールバックのリスナーを設定
      const handleAuthCallback = async (_: any, callbackData: { code: string, state: string }) => {
        try {
          console.log('認証コールバック受信:', callbackData)
          
          // バックエンドにcodeを送信してアクセストークンを取得
          const tokenResponse = await axios.post("http://localhost:9000/auth/github/callback", {
            code: callbackData.code,
            state: callbackData.state
          })
          
          const { access_token: oauthToken, user } = tokenResponse.data

          // safeStorageを使用してアクセストークンを暗号化して保存
          const isEncryptionAvailable = await window.api.safeStorage.isAvailable()
          let storedToken: string
          
          if (isEncryptionAvailable) {
            storedToken = await window.api.safeStorage.encrypt(oauthToken)
            localStorage.setItem('encryptedAccessToken', storedToken)
          } else {
            // 暗号化が利用できない場合（開発環境など）
            storedToken = oauthToken
            localStorage.setItem('accessToken', storedToken)
          }

          // ユーザー情報を設定
          if (user) {
            setCurrentUser(user)
          }

          setAuth({
            isAuthenticated: true,
            accessToken: storedToken,
            isLoading: false,
            error: null
          })

          // リスナーをクリーンアップ
          window.api.removeAuthListeners()
          
        } catch (error) {
          console.error('トークン取得エラー:', error)
          setAuth(prev => ({
            ...prev,
            isLoading: false,
            error: error instanceof Error ? error.message : 'トークンの取得に失敗しました'
          }))
          window.api.removeAuthListeners()
        }
      }

      const handleAuthWindowClosed = () => {
        setAuth(prev => ({
          ...prev,
          isLoading: false,
          error: '認証がキャンセルされました'
        }))
        window.api.removeAuthListeners()
      }

      // イベントリスナーを設定
      window.api.onAuthCallback(handleAuthCallback)
      window.api.onAuthWindowClosed(handleAuthWindowClosed)

      // 認証ウィンドウを開く
      await window.api.openAuthWindow(auth_url)

    } catch (error) {
      console.error('Login error:', error)
      console.log(error)
      setAuth(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'ログインに失敗しました'
      }))
    }
  }, [])


  const logout = useCallback(async () => {
    // ローカルストレージをクリア
    localStorage.removeItem('encryptedAccessToken')
    localStorage.removeItem('accessToken')
    
    setAuth({
      isAuthenticated: false,
      accessToken: null,
      isLoading: false,
      error: null
    })
    setCurrentUser(null)
  }, [])

  const contextValue: AuthContextType = {
    auth,
    currentUser,
    login,
    logout
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}