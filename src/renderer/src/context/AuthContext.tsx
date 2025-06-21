import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { v4 as uuidv4 } from 'uuid'
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
    setAuth((prev) => ({ ...prev, isLoading: true, error: null }))

    try {
      const result = await window.api.authenticateWithGitHub()

      if (result.success && result.accessToken && result.githubUser) {
        const githubUser: any = result.githubUser

        const appUser: User = {
          id: uuidv4(),
          username: githubUser.name || githubUser.login,
          avatar: githubUser.avatar_url,
          status: 'online',
          githubId: githubUser.id,
          githubUsername: githubUser.login
        }

        setAuth({
          isAuthenticated: true,
          accessToken: result.accessToken,
          isLoading: false,
          error: null
        })

        setCurrentUser(appUser)
      } else {
        setAuth((prev) => ({
          ...prev,
          isLoading: false,
          error: result.error || 'Authentication failed'
        }))
      }
    } catch (error) {
      setAuth((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }))
    }
  }, [])

  const logout = useCallback(() => {
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