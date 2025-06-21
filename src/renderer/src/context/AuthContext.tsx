import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { AuthState, User } from '../types'

interface AuthContextType {
  auth: AuthState
  currentUser: User | null
  login: () => Promise<void>
  logout: () => void
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
    
      const isEncryptionAvailable = await window.api.safeStorage.isAvailable()
      let storedToken: string
      
      if (isEncryptionAvailable) {
        const oauthToken = 'temp-access-token'
        storedToken = await window.api.safeStorage.encrypt(oauthToken)
      } else {
        const oauthToken = 'temp-access-token'
        storedToken = oauthToken
      }


      setAuth({
        isAuthenticated: true,
        accessToken: storedToken, 
        isLoading: false,
        error: null
      })

    } catch (error) {
      setAuth(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'ログインに失敗しました'
      }))
    }
  }, [])


  const logout = useCallback(() => {
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