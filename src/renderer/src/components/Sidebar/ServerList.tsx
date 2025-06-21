import React from 'react'
import { Server } from '../../types'

interface ServerListProps {
  servers: Server[]
  currentServerId: string | null
  onServerSelect: (serverId: string) => void
}

const ServerList: React.FC<ServerListProps> = ({ servers, currentServerId, onServerSelect }) => {
  const getServerInitials = (name: string): string => {
    return name
      .split(' ')
      .map((word) => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="server-list">
      {servers.map((server) => (
        <div
          key={server.id}
          className={`server-item ${currentServerId === server.id ? 'active' : ''}`}
          onClick={() => onServerSelect(server.id)}
          title={server.name}
        >
          {server.icon ? (
            <img src={server.icon} alt={server.name} />
          ) : (
            <span>{getServerInitials(server.name)}</span>
          )}
        </div>
      ))}
    </div>
  )
}

export default ServerList
