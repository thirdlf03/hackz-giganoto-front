import React, { useEffect, useRef } from 'react'
import { MdTag, MdVolumeUp } from 'react-icons/md'
import { Channel, Message as MessageType } from '../../types'
import Message from './Message'
import MessageInput from './MessageInput'

interface ChatAreaProps {
  channel: Channel | null
  messages: MessageType[]
  onSendMessage: (content: string) => void
}

const ChatArea: React.FC<ChatAreaProps> = ({ channel, messages, onSendMessage }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = (): void => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  if (!channel) {
    return (
      <div className="chat-area">
        <div className="chat-header">
          <span className="channel-name">チャンネルを選択してください</span>
        </div>
        <div
          className="chat-messages"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            color: 'var(--discord-text-muted)'
          }}
        >
          左のサイドバーからサーバーとチャンネルを選択してください
        </div>
      </div>
    )
  }

  const channelMessages = messages.filter((message) => message.channelId === channel.id)

  return (
    <div className="chat-area">
      <div className="chat-header">
        {channel.type === 'text' ? (
          <MdTag className="channel-icon" />
        ) : (
          <MdVolumeUp className="channel-icon" />
        )}
        <span className="channel-name">{channel.name}</span>
      </div>

      <div className="chat-messages">
        {channelMessages.length === 0 ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              fontSize: '16px',
              color: 'var(--discord-text-muted)',
              textAlign: 'center'
            }}
          >
            #{channel.name} の最初のメッセージを送信しましょう！
          </div>
        ) : (
          <>
            {channelMessages.map((message) => (
              <Message key={message.id} message={message} />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {channel.type === 'text' && <MessageInput channel={channel} onSendMessage={onSendMessage} />}
    </div>
  )
}

export default ChatArea
