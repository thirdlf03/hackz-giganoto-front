import React, { createContext, useContext, useState, useCallback, ReactNode, useRef } from 'react'
import { AppContextType, Server, User } from '../types'
import { mockServers, mockUsers } from '../data/mockData'
import { AuthProvider, useAuthContext } from './AuthContext'
import { VoiceProvider, useVoiceContext } from './VoiceContext'
import { MessagingProvider, useMessagingContext } from './MessagingContext'
import { ScreenShareProvider, useScreenShareContext } from './ScreenShareContext'
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
  deviceRef,
  sfuSocket
}) => {
  const authContext = useAuthContext()
  const voiceContext = useVoiceContext()
  const messagingContext = useMessagingContext()
  const screenShareContext = useScreenShareContext()

  const contextValue: AppContextType = {
    currentUser: authContext.currentUser,
    servers,
    currentServerId,
    currentChannelId,
    currentVoiceChannelId: voiceContext.currentVoiceChannelId,
    messages: messagingContext.messages,
    users,
    setCurrentServer,
    setCurrentChannel,
    sendMessage: messagingContext.sendMessage,
    editMessage: messagingContext.editMessage,
    deleteMessage: messagingContext.deleteMessage,
    joinVoiceChannel: voiceContext.joinVoiceChannel,
    leaveVoiceChannel: voiceContext.leaveVoiceChannel,
    isMuted: voiceContext.isMuted,
    toggleMute: voiceContext.toggleMute,
    muteVoiceChannel: voiceContext.muteVoiceChannel,
    unmuteVoiceChannel: voiceContext.unmuteVoiceChannel,
    isScreenSharing: screenShareContext.isScreenSharing,
    startScreenShare: screenShareContext.startScreenShare,
    stopScreenShare: screenShareContext.stopScreenShare,
    isWatchingScreen: screenShareContext.isWatchingScreen,
    screenVideoStream: screenShareContext.screenVideoStream,
    startWatchingScreen: screenShareContext.startWatchingScreen,
    stopWatchingScreen: screenShareContext.stopWatchingScreen,
    auth: authContext.auth,
    login: authContext.login,
    logout: authContext.logout,
    voiceChannelParticipants: voiceContext.voiceChannelParticipants,
    currentRoomId: voiceContext.currentRoomId
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
    <VoiceProvider 
      currentUser={authContext.currentUser} 
      currentServerId={currentServerId}
    >
      <MessagingProvider 
        currentChannelId={currentChannelId} 
        currentUser={authContext.currentUser}
      >
        <ScreenShareProvider 
          device={deviceRef} 
          sfuSocket={sfuSocket}
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
        </ScreenShareProvider>
      </MessagingProvider>
    </VoiceProvider>
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