import React from 'react'
import { MdTag, MdVolumeUp } from 'react-icons/md'
import { FaGithub } from 'react-icons/fa'
import { Server } from '../../types'

interface ChannelListProps {
  server: Server | null
  currentChannelId: string | null
  onChannelSelect: (channelId: string) => void
  voiceChannelSelect: (channelId: string) => void
}

const ChannelList: React.FC<ChannelListProps> = ({ server, currentChannelId, onChannelSelect, voiceChannelSelect }) => {
  if (!server) {
    return (
      <div className="channel-list">
        <div className="server-header">サーバーを選択してください</div>
      </div>
    )
  }

  const textChannels = server.channels.filter((channel) => channel.type === 'text')
  const voiceChannels = server.channels.filter((channel) => channel.type === 'voice')

  return (
    <div className="channel-list">
      <div className="server-header">{server.name}</div>

      {textChannels.length > 0 && (
        <>
          <div className="channel-category">テキストチャンネル</div>
          {textChannels.map((channel) => (
            <div
              key={channel.id}
              className={`channel-item ${currentChannelId === channel.id ? 'active' : ''}`}
              onClick={() => onChannelSelect(channel.id)}
            >
              <MdTag className="channel-icon" />
              <span className="channel-name">{channel.name}</span>
              {channel.unreadCount && channel.unreadCount > 0 && (
                <span className="unread-badge">{channel.unreadCount}</span>
              )}
            </div>
          ))}
        </>
      )}

      {voiceChannels.length > 0 && (
        <>
          <div className="channel-category">ボイスチャンネル</div>
          {voiceChannels.map((channel) => (
            <div
              key={channel.id}
              className={`channel-item ${currentChannelId === channel.id ? 'active' : ''}`}
              onClick={() => voiceChannelSelect(channel.id)}
            >
              <MdVolumeUp className="channel-icon" />
              <span className="channel-name">{channel.name}</span>
            </div>
          ))}
        </>
      )}

      <div className="channel-category">GitHub関係チャンネル</div>
      <div className="channel-item">
        <FaGithub className="channel-icon" />
        <span className="channel-name">GitHub</span>
      </div>

    </div>
  )
}

export default ChannelList
