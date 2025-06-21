import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react'
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

  useEffect(() => {
    const restoreAuth = async () => {
      try {
        const isEncryptionAvailable = await window.api.safeStorage.isAvailable()
        let token = null
        
        if (isEncryptionAvailable) {
          const encryptedToken = localStorage.getItem('encryptedAccessToken')
          if (encryptedToken) {
            token = await window.api.safeStorage.decrypt(encryptedToken)
          }
        } else {
          token = localStorage.getItem('accessToken')
        }
        
        if (token) {
          setAuth(prev => ({
            ...prev,
            isAuthenticated: true,
            accessToken: token
          }))
        }
      } catch (error) {
        console.error('トークン復元エラー:', error)
      }
    }
    
    restoreAuth()
  }, [])

  const login = useCallback(async () => {
    try {
      setAuth(prev => ({ ...prev, isLoading: true, error: null }))

      const response = await axios.get("http://localhost:9000/auth/github")
      const { auth_url, status } = response.data


      const handleAuthCallback = async (_: any, callbackData: { access_token: string, token_type: string, expires_in: number, user_id: string }) => {
        try {
          console.log('認証コールバック受信:', callbackData)

          const isEncryptionAvailable = await window.api.safeStorage.isAvailable()
          let storedToken: string
          
          if (isEncryptionAvailable) {
            storedToken = await window.api.safeStorage.encrypt(callbackData.access_token)
            localStorage.setItem('encryptedAccessToken', storedToken)
          } else {

            storedToken = callbackData.access_token
            localStorage.setItem('accessToken', storedToken)
          }

          // ユーザー情報を設定

          setAuth({
            isAuthenticated: true,
            accessToken: storedToken,
            isLoading: false,
            error: null
          })

          window.api.removeAuthListeners()
          
        } catch (error) {
          
          setAuth(prev => ({
            ...prev,
            isLoading: false,
            error: error instanceof Error ? error.message : 'トークンの取得に失敗しました'
          }))
          window.api.removeAuthListeners()
        }
      }



      // // イベントリスナーを設定
      window.api.onAuthCallback(handleAuthCallback)

      // // 認証ウィンドウを開く
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