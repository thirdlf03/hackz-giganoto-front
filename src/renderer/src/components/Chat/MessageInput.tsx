import React, { useState, KeyboardEvent } from 'react'
import { Channel } from '../../types'

interface MessageInputProps {
  channel: Channel | null
  onSendMessage: (content: string) => void
}

const MessageInput: React.FC<MessageInputProps> = ({ channel, onSendMessage }) => {
  const [message, setMessage] = useState('')

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (message.trim()) {
        onSendMessage(message.trim())
        setMessage('')
      }
    }
  }

  if (!channel) {
    return null
  }

  const placeholder =
    channel.type === 'text' ? `#${channel.name} にメッセージを送信` : `${channel.name} で話す`

  return (
    <div className="message-input-container">
      <textarea
        className="message-input"
        placeholder={placeholder}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyPress={handleKeyPress}
        rows={1}
        style={{
          resize: 'none',
          minHeight: '44px',
          maxHeight: '200px',
          overflow: 'auto'
        }}
      />
    </div>
  )
}

export default MessageInput
