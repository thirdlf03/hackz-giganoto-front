import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { AppContextType, Server, Message, User, AuthState, GitHubUser } from '../types'
import { mockServers, mockMessages, mockUsers } from '../data/mockData'

const AppContext = createContext<AppContextType | undefined>(undefined)

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider')
  }
  return context
}

interface AppProviderProps {
  children: ReactNode
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [auth, setAuth] = useState<AuthState>({
    isAuthenticated: false,
    accessToken: null,
    githubUser: null,
    isLoading: false,
    error: null
  })

  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [servers] = useState<Server[]>(mockServers)
  const [currentServerId, setCurrentServerId] = useState<string | null>(null)
  const [currentChannelId, setCurrentChannelId] = useState<string | null>(null)
  const [currentVoiceChannelId, setCurrentVoiceChannelId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>(mockMessages)
  const [users] = useState<User[]>(mockUsers)
  const [isMuted, setIsMuted] = useState<boolean>(false)

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev)
  }, [])

  const setCurrentServer = useCallback(
    (serverId: string) => {
      setCurrentServerId(serverId)
      const server = servers.find((s) => s.id === serverId)
      if (server && server.channels.length > 0) {
        setCurrentChannelId(server.channels[0].id)
      } else {
        setCurrentChannelId(null)
      }
    },
    [servers]
  )

  const setCurrentChannel = useCallback((channelId: string) => {
    setCurrentChannelId(channelId)
  }, [])

  const sendMessage = useCallback(
    (content: string) => {
      if (!currentChannelId || !currentUser) return

      const newMessage: Message = {
        id: uuidv4(),
        content,
        author: currentUser,
        timestamp: new Date(),
        channelId: currentChannelId
      }

      setMessages((prev) => [...prev, newMessage])
    },
    [currentChannelId, currentUser]
  )

  const editMessage = useCallback((messageId: string, content: string) => {
    setMessages((prev) =>
      prev.map((message) =>
        message.id === messageId
          ? {
              ...message,
              content,
              edited: true,
              editedTimestamp: new Date()
            }
          : message
      )
    )
  }, [])

  const deleteMessage = useCallback((messageId: string) => {
    setMessages((prev) => prev.filter((message) => message.id !== messageId))
  }, [])

  // ログイン機能
  const login = useCallback(async () => {
    setAuth((prev) => ({ ...prev, isLoading: true, error: null }))

    try {
      const result = await window.api.authenticateWithGitHub()

      if (result.success && result.accessToken && result.githubUser) {
        const githubUser: GitHubUser = result.githubUser

        // GitHubユーザー情報からアプリのユーザーを作成
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
          githubUser,
          isLoading: false,
          error: null
        })

        setCurrentUser(appUser)

        // 認証後にデフォルトのサーバーとチャンネルを設定
        if (mockServers.length > 0) {
          setCurrentServerId(mockServers[0].id)
          if (mockServers[0].channels.length > 0) {
            setCurrentChannelId(mockServers[0].channels[0].id)
          }
        }
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

  // ログアウト機能
  const logout = useCallback(() => {
    setAuth({
      isAuthenticated: false,
      accessToken: null,
      githubUser: null,
      isLoading: false,
      error: null
    })
    setCurrentUser(null)
    setCurrentServerId(null)
    setCurrentChannelId(null)
  }, [])

  const contextValue: AppContextType = {
    currentUser,
    servers,
    currentServerId,
    currentChannelId,
    messages,
    users,
    setCurrentServer,
    setCurrentChannel,
    sendMessage,
    editMessage,
    deleteMessage,
    isMuted,
    toggleMute,
    auth,
    login,
    logout
  }

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>
}
