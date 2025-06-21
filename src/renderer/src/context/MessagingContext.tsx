import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { Message, User } from '../types'
import { mockMessages } from '../data/mockData'

interface MessagingContextType {
  messages: Message[]
  sendMessage: (content: string) => void
  editMessage: (messageId: string, content: string) => void
  deleteMessage: (messageId: string) => void
}

const MessagingContext = createContext<MessagingContextType | undefined>(undefined)

export const useMessagingContext = (): MessagingContextType => {
  const context = useContext(MessagingContext)
  if (!context) {
    throw new Error('useMessagingContext must be used within a MessagingProvider')
  }
  return context
}

interface MessagingProviderProps {
  children: ReactNode
  currentChannelId: string | null
  currentUser: User | null
}

export const MessagingProvider: React.FC<MessagingProviderProps> = ({ 
  children, 
  currentChannelId, 
  currentUser 
}) => {
  const [messages, setMessages] = useState<Message[]>(mockMessages)

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

  const contextValue: MessagingContextType = {
    messages,
    sendMessage,
    editMessage,
    deleteMessage
  }

  return (
    <MessagingContext.Provider value={contextValue}>
      {children}
    </MessagingContext.Provider>
  )
}