import React, { createContext, useContext, useState, useCallback, ReactNode, useRef } from 'react'
import { AppContextType, Server, User } from '../types'
import { mockServers, mockUsers } from '../data/mockData'
import { AuthProvider, useAuthContext } from './AuthContext'
import { MediaProvider, useMediaContext } from './MediaContext'
import { MessagingProvider, useMessagingContext } from './MessagingContext'
import { io } from 'socket.io-client'
import * as mediasoupClient from 'mediasoup-client'

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

interface AppProviderInnerProps {
  children: ReactNode
  servers: Server[]
  currentServerId: string | null
  currentChannelId: string | null
  users: User[]
  setCurrentServer: (serverId: string) => void
  setCurrentChannel: (channelId: string) => void
  deviceRef: React.MutableRefObject<mediasoupClient.Device | null>
  sfuSocket: React.MutableRefObject<ReturnType<typeof io> | null>
}

const AppProviderInner: React.FC<AppProviderInnerProps> = ({
  children,
  servers,
  currentServerId,
  currentChannelId,
  users,
  setCurrentServer,
  setCurrentChannel,
}) => {
  const authContext = useAuthContext()
  const mediaContext = useMediaContext()
  const messagingContext = useMessagingContext()

  const contextValue: AppContextType = {
    currentUser: authContext.currentUser,
    servers,
    currentServerId,
    currentChannelId,
    currentVoiceChannelId: mediaContext.currentVoiceChannelId,
    messages: messagingContext.messages,
    users,
    setCurrentServer,
    setCurrentChannel,
    sendMessage: messagingContext.sendMessage,
    editMessage: messagingContext.editMessage,
    deleteMessage: messagingContext.deleteMessage,
    joinVoiceChannel: mediaContext.joinVoiceChannel,
    leaveVoiceChannel: mediaContext.leaveVoiceChannel,
    isMuted: mediaContext.isMuted,
    toggleMute: mediaContext.toggleMute,
    muteVoiceChannel: mediaContext.muteVoiceChannel,
    unmuteVoiceChannel: mediaContext.unmuteVoiceChannel,
    isScreenSharing: mediaContext.isScreenSharing,
    startScreenShare: mediaContext.startScreenShare,
    stopScreenShare: mediaContext.stopScreenShare,
    isWatchingScreen: mediaContext.isWatchingScreen,
    screenVideoStream: mediaContext.screenVideoStream,
    startWatchingScreen: mediaContext.startWatchingScreen,
    stopWatchingScreen: mediaContext.stopWatchingScreen,
    auth: authContext.auth,
    login: authContext.login,
    logout: authContext.logout,
    voiceChannelParticipants: mediaContext.voiceChannelParticipants,
    currentRoomId: mediaContext.currentRoomId
  }

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  )
}

const InnerProviders: React.FC<{ children: ReactNode }> = ({ children }) => {
  const authContext = useAuthContext()
  const [servers] = useState<Server[]>(mockServers)
  const [currentServerId, setCurrentServerId] = useState<string | null>(null)
  const [currentChannelId, setCurrentChannelId] = useState<string | null>(null)
  const [users] = useState<User[]>(mockUsers)
  
  const deviceRef = useRef<mediasoupClient.Device | null>(null)
  const sfuSocket = useRef<ReturnType<typeof io> | null>(null)

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

  return (
    <MediaProvider 
      currentUser={authContext.currentUser} 
      currentServerId={currentServerId}
    >
      <MessagingProvider 
        currentChannelId={currentChannelId} 
        currentUser={authContext.currentUser}
      >
        <AppProviderInner
          servers={servers}
          currentServerId={currentServerId}
          currentChannelId={currentChannelId}
          users={users}
          setCurrentServer={setCurrentServer}
          setCurrentChannel={setCurrentChannel}
          deviceRef={deviceRef}
          sfuSocket={sfuSocket}
        >
          {children}
        </AppProviderInner>
      </MessagingProvider>
    </MediaProvider>
  )
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  return (
    <AuthProvider>
      <InnerProviders>
        {children}
      </InnerProviders>
    </AuthProvider>
  )
}