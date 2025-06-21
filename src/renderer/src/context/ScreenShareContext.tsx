import React, { createContext, useContext, useState, useCallback, ReactNode, useRef } from 'react'
import { io } from 'socket.io-client'
import * as mediasoupClient from 'mediasoup-client'

interface ScreenShareContextType {
  isScreenSharing: boolean
  isWatchingScreen: boolean
  screenVideoStream: MediaStream | null
  startScreenShare: () => Promise<void>
  stopScreenShare: () => void
  startWatchingScreen: () => Promise<void>
  stopWatchingScreen: () => void
}

const ScreenShareContext = createContext<ScreenShareContextType | undefined>(undefined)

export const useScreenShareContext = (): ScreenShareContextType => {
  const context = useContext(ScreenShareContext)
  if (!context) {
    throw new Error('useScreenShareContext must be used within a ScreenShareProvider')
  }
  return context
}

interface ScreenShareProviderProps {
  children: ReactNode
  device: React.MutableRefObject<mediasoupClient.Device | null>
  sfuSocket: React.MutableRefObject<ReturnType<typeof io> | null>
}

export const ScreenShareProvider: React.FC<ScreenShareProviderProps> = ({ 
  children, 
  device, 
  sfuSocket 
}) => {
  const [isScreenSharing, setIsScreenSharing] = useState<boolean>(false)
  const [isWatchingScreen, setIsWatchingScreen] = useState<boolean>(false)
  const [screenVideoStream, setScreenVideoStream] = useState<MediaStream | null>(null)

  const screenTrackRef = useRef<MediaStreamTrack | null>(null)
  const screenTransportRef = useRef<any>(null)
  const screenConsumerRef = useRef<any>(null)

  const startScreenShare = useCallback(async (): Promise<void> => {
    if (!device.current || !device.current.loaded || !sfuSocket.current) {
      console.error("Device not loaded or socket not connected")
      return
    }
    
    if (screenTransportRef.current) {
      console.warn("Already screen sharing!")
      return
    }

    if (!device.current.canProduce('video')) {
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

        const transport = device.current!.createSendTransport(transportInfo)
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
    if (!device.current || !device.current.loaded || !sfuSocket.current) {
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
      const recvTransport = device.current!.createRecvTransport(transportInfo)

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
        rtpCapabilities: device.current!.rtpCapabilities
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

  const contextValue: ScreenShareContextType = {
    isScreenSharing,
    isWatchingScreen,
    screenVideoStream,
    startScreenShare,
    stopScreenShare,
    startWatchingScreen,
    stopWatchingScreen
  }

  return (
    <ScreenShareContext.Provider value={contextValue}>
      {children}
    </ScreenShareContext.Provider>
  )
}