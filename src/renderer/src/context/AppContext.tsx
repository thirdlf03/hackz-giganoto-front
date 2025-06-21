import React, { createContext, useContext, useState, useCallback, ReactNode, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { AppContextType, Server, Message, User, AuthState } from '../types'
import { mockServers, mockMessages, mockUsers } from '../data/mockData'
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

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [auth, setAuth] = useState<AuthState>({
    isAuthenticated: false,
    accessToken: null,
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
  

  const deviceRef = useRef<mediasoupClient.Device | null>(null)
  const sendTransportRef = useRef<ReturnType<mediasoupClient.Device['createSendTransport']> | null>(null)
  const recvTransportRef = useRef<any>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioTrackRef = useRef<MediaStreamTrack | null>(null)
  const [isVoiceConnected, setIsVoiceConnected] = useState<boolean>(false)
  const [isProducing, setIsProducing] = useState<boolean>(false)
  const [isListening, setIsListening] = useState<boolean>(false)
  const [audioProducerId, setAudioProducerId] = useState<string | null>(null)
  const [isScreenSharing, setIsScreenSharing] = useState<boolean>(false)
  const screenTrackRef = useRef<MediaStreamTrack | null>(null)
  const screenTransportRef = useRef<any>(null)
  const [isWatchingScreen, setIsWatchingScreen] = useState<boolean>(false)
  const [screenVideoStream, setScreenVideoStream] = useState<MediaStream | null>(null)
  const screenConsumerRef = useRef<any>(null)
  const sfuSocket = useRef<ReturnType<typeof io> | null>(null)
  const [voiceChannelParticipants, setVoiceChannelParticipants] = useState<Record<string, User[]>>({})
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null)

  const toggleMute = useCallback(() => {
    if (audioTrackRef.current) {
      audioTrackRef.current.enabled = !isMuted
    }
    setIsMuted((prev) => !prev)
    
    // サーバーにミュート状態を通知
    if (sfuSocket.current) {
      sfuSocket.current.emit('updateMuteState', { isMuted: !isMuted })
    }
  }, [isMuted])

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

  const startProducingAudio = useCallback(async () => {
    if (!deviceRef.current || !deviceRef.current.loaded || !sfuSocket.current) {
      console.error("Device not loaded or socket not connected")
      return
    }
    
    if (sendTransportRef.current) {
      console.warn("Already producing!")
      return
    }

    if (!deviceRef.current.canProduce('audio')) {
      console.error("This device cannot produce audio!")
      return
    }

    sfuSocket.current.emit("createWebRtcTransport", { producing: true }, async (transportInfo: any) => {
      if (transportInfo.error) {
        console.error("Error creating transport:", transportInfo.error)
        return
      }

      const transport = deviceRef.current!.createSendTransport(transportInfo)
      sendTransportRef.current = transport

      transport.on('connect', ({ dtlsParameters }: any, callback: any, errback: any) => {
        sfuSocket.current!.emit("connectWebRtcTransport", {
          transportId: transport.id,
          dtlsParameters
        }, (response: any) => {
          if (!response || response.error) {
            errback(new Error(response?.error || "Unknown error"))
          } else {
            callback()
          }
        })
      })

      transport.on('produce', async ({ kind, rtpParameters, appData }: any, callback: any, errback: any) => {
        sfuSocket.current!.emit("produce", {
          transportId: transport.id,
          kind,
          rtpParameters,
          appData
        }, ({ id, error }: any) => {
          if (error) {
            errback(new Error(error))
          } else {
            callback({ id })
          }
        })
      })

    

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          } 
        })
        
        const audioTracks = stream.getAudioTracks()
        if (audioTracks.length === 0) {
          throw new Error("No audio track found")
        }
        
        const track = audioTracks[0]
        audioTrackRef.current = track
        
        track.enabled = !isMuted
        
        await transport.produce({ 
          track,
          codecOptions: {
            opusStereo: false,
            opusDtx: true,
            opusFec: true,
            opusPtime: 20
          }
        })
        setIsProducing(true)
        console.log('Audio producer id:', audioProducerId)
      } catch (error) {
        console.error("Error producing audio:", error)
        transport.close()
        sendTransportRef.current = null
      }
    })
  }, [])

  const startListeningAudio = useCallback(async () => {
    if (!deviceRef.current || !deviceRef.current.loaded || !sfuSocket.current) {
      console.error("Device not loaded or socket not connected")
      return
    }
    
    if (recvTransportRef.current) {
      console.warn("Already listening!")
      return
    }

    sfuSocket.current.emit("createWebRtcTransport", { producing: false }, async (transportInfo: any) => {
      if (transportInfo.error) {
        console.error("Error creating recv transport:", transportInfo.error)
        return
      }
      
      const recvTransport = deviceRef.current!.createRecvTransport(transportInfo)
      recvTransportRef.current = recvTransport

      recvTransport.on('connect', ({ dtlsParameters }: any, callback: any, errback: any) => {
        if (!sfuSocket.current) {
          errback(new Error("Socket connection lost"))
          return
        }
        
        sfuSocket.current.emit("connectWebRtcTransport", {
          transportId: recvTransport.id,
          dtlsParameters
        }, (response: any) => {
          if (!response || response.error) {
            errback(new Error(response?.error || "Unknown error"))
          } else {
            callback()
          }
        })
      })

      if (!sfuSocket.current) {
        console.error("Socket connection lost before consume")
        return
      }

      sfuSocket.current.emit("consume", {
        transportId: recvTransport.id,
        kind: 'audio',
        rtpCapabilities: deviceRef.current!.rtpCapabilities
      }, async (consumeInfo: any) => {
        if (consumeInfo.error) {
          console.error("Error consuming:", consumeInfo.error)
          return
        }
        
        const consumer = await recvTransport.consume({
          id: consumeInfo.id,
          producerId: consumeInfo.producerId,
          kind: consumeInfo.kind,     
          rtpParameters: consumeInfo.rtpParameters
        })
        
        const stream = new MediaStream([consumer.track])
        if (audioRef.current) {
          audioRef.current.srcObject = stream
          audioRef.current.play()
        }
        setIsListening(true)
      })
    })
  }, [])

  const joinVoiceChannel = useCallback(
    async (channelId: string) => {
      console.log(`Joining voice channel: ${channelId}`)

      try {
        if (!sfuSocket.current) {
          sfuSocket.current = io('http://localhost:3000')
          
          // 参加者更新の受信
          sfuSocket.current.on('room-participants-updated', ({ roomId, count, participants }) => {
            console.log(`Room ${roomId} participants updated:`, count, participants)
            setVoiceChannelParticipants((prev) => ({
              ...prev,
              [roomId]: participants.map((p: any) => ({
                id: p.socketId,
                username: p.name, // nameからusernameに統一
                avatar: p.avatar,
                status: p.isMuted ? 'muted' : p.isSpeaking ? 'speaking' : 'online'
              }))
            }))
          })
        }

                // 現在選択されているサーバーのIDを使用（固定値）
        const serverId = currentServerId || 'guild-12345' // デフォルトは固定のギルドID
        
        console.log(`Joining voice channel: serverId=${serverId}, channelId=${channelId}`)
        console.log('Current server ID:', currentServerId)
        
        // 新しいjoinVoiceChannelイベントを使用
        sfuSocket.current.emit('joinVoiceChannel', {
          serverId,
          channelId,
          userInfo: {
            name: currentUser?.username || 'Unknown User',
            avatar: currentUser?.avatar || null
          }
        }, async (response: any) => {
          if (response.error) {
            console.error('Failed to join voice channel:', response.error)
            return
          }

          console.log('Successfully joined voice channel:', response.roomId)
          setCurrentRoomId(response.roomId)

          // 既存の参加者情報がある場合は即座に反映
          if (response.existingParticipants && response.existingParticipants.length > 0) {
            setVoiceChannelParticipants((prev) => ({
              ...prev,
              [response.roomId]: response.existingParticipants.map((p: any) => ({
                id: p.socketId,
                username: p.name,
                avatar: p.avatar,
                status: p.isMuted ? 'muted' : p.isSpeaking ? 'speaking' : 'online'
              }))
            }))
            console.log(`Loaded ${response.existingParticipants.length} existing participants`)
          }

          if (!deviceRef.current) {
            const device = await mediasoupClient.Device.factory()
            deviceRef.current = device
            await device.load({ routerRtpCapabilities: response.rtpCapabilities })
            console.log('Device loaded with router RTP capabilities')
          }

          setIsVoiceConnected(true)
          setCurrentVoiceChannelId(channelId)

          await startProducingAudio()
          await startListeningAudio()
        })

      } catch (error) {
        console.error('Error joining voice channel:', error)
      }
    },
    [currentUser, currentServerId]
  )

  const muteVoiceChannel = useCallback(() => {
    if (audioTrackRef.current) {
      audioTrackRef.current.enabled = false
    }
    setIsMuted(true)
  }, [])

  const unmuteVoiceChannel = useCallback(() => {
    if (audioTrackRef.current) {
      audioTrackRef.current.enabled = true
    }
    setIsMuted(false)
  }, [])

  const startScreenShare = useCallback(async (): Promise<void> => {
    if (!deviceRef.current || !deviceRef.current.loaded || !sfuSocket.current) {
      console.error("Device not loaded or socket not connected")
      return
    }
    
    if (screenTransportRef.current) {
      console.warn("Already screen sharing!")
      return
    }

    if (!deviceRef.current.canProduce('video')) {
      console.error("This device cannot produce video!")
      return
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ 
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 }
        },
        audio: false
      })
      
      const videoTracks = stream.getVideoTracks()
      if (videoTracks.length === 0) {
        throw new Error("No video track found")
      }
      
      const track = videoTracks[0]
      screenTrackRef.current = track


      track.onended = () => {
        stopScreenShare()
      }

      sfuSocket.current.emit("createWebRtcTransport", { producing: true }, async (transportInfo: any) => {
        if (transportInfo.error) {
          console.error("Error creating screen share transport:", transportInfo.error)
          return
        }

        const transport = deviceRef.current!.createSendTransport(transportInfo)
        screenTransportRef.current = transport

        transport.on('connect', ({ dtlsParameters }: any, callback: any, errback: any) => {
          sfuSocket.current!.emit("connectWebRtcTransport", {
            transportId: transport.id,
            dtlsParameters
          }, (response: any) => {
            if (!response || response.error) {
              errback(new Error(response?.error || "Unknown error"))
            } else {
              callback()
            }
          })
        })

        transport.on('produce', async ({ kind, rtpParameters, appData }: any, callback: any, errback: any) => {
          sfuSocket.current!.emit("produce", {
            transportId: transport.id,
            kind,
            rtpParameters,
            appData: { ...appData, screenShare: true }
          }, ({ id, error }: any) => {
            if (error) {
              errback(new Error(error))
            } else {
              callback({ id })
            }
          })
        })

        await transport.produce({ track })
        setIsScreenSharing(true)
        console.log('Screen sharing started')
      })
    } catch (error) {
      console.error("Error starting screen share:", error)
      if (screenTransportRef.current) {
        try {
          screenTransportRef.current.close()
        } catch (closeError) {
          console.error("Error closing screen transport:", closeError)
        }
        screenTransportRef.current = null
      }
      screenTrackRef.current = null
    }
  }, [])

  const stopScreenShare = useCallback(() => {
    console.log('Stopping screen share')

    if (screenTrackRef.current) {
      screenTrackRef.current.stop()
      screenTrackRef.current = null
    }

    if (screenTransportRef.current) {
      screenTransportRef.current.close()
      screenTransportRef.current = null
    }

    setIsScreenSharing(false)
  }, [])

  const startWatchingScreen = useCallback(async () => {
    if (!deviceRef.current || !deviceRef.current.loaded || !sfuSocket.current) {
      console.error("Device not loaded or socket not connected")
      return
    }
    
    if (isWatchingScreen) {
      console.warn("Already watching screen!")
      return
    }

    sfuSocket.current.emit("createWebRtcTransport", { producing: false }, async (transportInfo: any) => {
      if (transportInfo.error) {
        console.error("Error creating screen recv transport:", transportInfo.error)
        return
      }
      
      console.log("Created recv transport for screen watching:", transportInfo)
      const recvTransport = deviceRef.current!.createRecvTransport(transportInfo)

      recvTransport.on('connect', ({ dtlsParameters }: any, callback: any, errback: any) => {
        if (!sfuSocket.current) {
          errback(new Error("Socket connection lost"))
          return
        }
        
        sfuSocket.current.emit("connectWebRtcTransport", {
          transportId: recvTransport.id,
          dtlsParameters
        }, (response: any) => {
          if (!response || response.error) {
            errback(new Error(response?.error || "Unknown error"))
          } else {
            console.log("Screen recv transport connected successfully")
            callback()
          }
        })
      })

      console.log('Screen transport:', recvTransport)
      console.log("sfuSocket.current:", sfuSocket.current)

      if (!sfuSocket.current) {
        console.error("Socket connection lost before consume")
        return
      }

      sfuSocket.current.emit("consume", {
        transportId: recvTransport.id,
        kind: 'video',
        rtpCapabilities: deviceRef.current!.rtpCapabilities
      }, async (consumeInfo: any) => {
        console.log("Consume response for screen share:", consumeInfo)
        
        if (consumeInfo.error) {
          console.error("Error consuming screen share:", consumeInfo.error)
          return
        }
        
        if (!consumeInfo.id || !consumeInfo.producerId || !consumeInfo.rtpParameters) {
          console.error("Invalid consume info:", consumeInfo)
          return
        }
        
        try {
          const consumer = await recvTransport.consume({
            id: consumeInfo.id,
            producerId: consumeInfo.producerId,
            kind: consumeInfo.kind,
            rtpParameters: consumeInfo.rtpParameters
          })
          
          console.log("Created screen consumer:", consumer)
          console.log("Consumer track:", consumer.track)
          console.log("Consumer track state:", consumer.track?.readyState)
          console.log("Consumer track enabled:", consumer.track?.enabled)
          
          if (!consumer.track) {
            console.error("Consumer track is null or undefined")
            return
          }
          
          screenConsumerRef.current = consumer
          const stream = new MediaStream([consumer.track])
          
          console.log("Created MediaStream for screen:", stream)
          console.log("MediaStream tracks:", stream.getTracks())
          console.log("MediaStream video tracks:", stream.getVideoTracks())
          
          setScreenVideoStream(stream)
          setIsWatchingScreen(true)
          console.log('Started watching screen share')
          
          consumer.on('transportclose', () => {
            console.log('Screen consumer transport closed')
            setIsWatchingScreen(false)
            screenConsumerRef.current = null
          })
        } catch (error) {
          console.error("Error creating consumer:", error)
          recvTransport.close()
        }
      })
    })
  }, [isWatchingScreen])

  const stopWatchingScreen = useCallback(() => {
    console.log('Stopping screen watching')
    
    if (screenConsumerRef.current) {
      screenConsumerRef.current.close()
      screenConsumerRef.current = null
    }
    
    setScreenVideoStream(null)
    
    setIsWatchingScreen(false)
  }, [])

  const leaveVoiceChannel = useCallback(() => {
    console.log('Leaving voice channel')

    if (sendTransportRef.current) {
      sendTransportRef.current.close()
      sendTransportRef.current = null
      setIsProducing(false)
    }
    
    if (recvTransportRef.current) {
      recvTransportRef.current.close()
      recvTransportRef.current = null
      setIsListening(false)
    }

    // 新しいサーバーAPIを使用してボイスチャンネルを退出
    if (sfuSocket.current) {
      sfuSocket.current.emit('leaveVoiceChannel', (response: any) => {
        if (response.success) {
          console.log('Successfully left voice channel')
        } else {
          console.error('Error leaving voice channel:', response.error)
        }
      })
      
      sfuSocket.current.disconnect()
      sfuSocket.current = null
    }
    
    if (audioRef.current) {
      audioRef.current.srcObject = null
    }
    
    // 音声トラックの参照をクリア
    audioTrackRef.current = null
    
    // 画面共有も停止
    if (isScreenSharing) {
      stopScreenShare()
    }
    
    // 画面視聴も停止
    if (isWatchingScreen) {
      stopWatchingScreen()
    }

    setIsVoiceConnected(false)
    setCurrentVoiceChannelId(null)
    setCurrentRoomId(null)
    
    // ローカル状態もクリア
    setVoiceChannelParticipants({})
  }, [isScreenSharing, isWatchingScreen])

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
      setCurrentChannelId(null)
      setCurrentVoiceChannelId(null)
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
        const githubUser: any = result.githubUser

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
          isLoading: false,
          error: null
        })

        setCurrentUser(appUser)

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
      isLoading: false,
      error: null
    })
    setCurrentUser(null)
    setCurrentServerId(null)
    setCurrentChannelId(null)
    setCurrentVoiceChannelId(null)
  }, [])

  const contextValue: AppContextType = {
    currentUser,
    servers,
    currentServerId,
    currentChannelId,
    currentVoiceChannelId,
    messages,
    users,
    setCurrentServer,
    setCurrentChannel,
    sendMessage,
    editMessage,
    deleteMessage,
    joinVoiceChannel,
    leaveVoiceChannel,
    isMuted,
    toggleMute,
    muteVoiceChannel,
    unmuteVoiceChannel,
    isScreenSharing,
    startScreenShare,
    stopScreenShare,
    isWatchingScreen,
    screenVideoStream,
    startWatchingScreen,
    stopWatchingScreen,
    auth,
    login,
    logout,
    voiceChannelParticipants,
    currentRoomId
  }

  return (
    <AppContext.Provider value={contextValue}>
      {children}
      <audio ref={audioRef} autoPlay style={{ display: 'none' }} />
    </AppContext.Provider>
  )
}
