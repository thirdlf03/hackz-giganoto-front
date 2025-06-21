import React from 'react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Message as MessageType } from '../../types'

interface MessageProps {
  message: MessageType
}

const Message: React.FC<MessageProps> = ({ message }) => {
  const getUserInitials = (username: string): string => {
    return username
      .split(' ')
      .map((word) => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const formatTime = (date: Date): string => {
    return format(date, 'HH:mm', { locale: ja })
  }

  const formatFullTime = (date: Date): string => {
    return format(date, 'yyyy年MM月dd日 HH:mm', { locale: ja })
  }

  return (
    <div className="message">
      <div className="message-avatar">
        {message.author.avatar ? (
          <img src={message.author.avatar} alt={message.author.username} />
        ) : (
          <span>{getUserInitials(message.author.username)}</span>
        )}
      </div>
      <div className="message-content">
        <div className="message-header">
          <span className={`message-author ${message.author.isBot ? 'bot' : ''}`}>
            {message.author.username}
          </span>
          {message.author.isBot && <span className="bot-tag">BOT</span>}
          <span className="message-timestamp" title={formatFullTime(message.timestamp)}>
            {formatTime(message.timestamp)}
          </span>
          {message.edited && message.editedTimestamp && (
            <span
              className="message-edited"
              title={`編集済み ${formatFullTime(message.editedTimestamp)}`}
            >
              (編集済み)
            </span>
          )}
        </div>
        <div className="message-text">{message.content}</div>
      </div>
    </div>
  )
}

export default Message
