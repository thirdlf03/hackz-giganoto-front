import React from 'react'
import { MdLogout } from 'react-icons/md'
import { User } from '../../types'
import { VoiceStatus } from '../Voice/VoiceStatus'
import { useAppContext } from '../../context/AppContext'

interface UserInfoProps {
  user: User | null
}

const UserInfo: React.FC<UserInfoProps> = ({ user }) => {
  const { logout } = useAppContext()

  if (!user) {
    return (
      <div className="user-info">
        <div className="user-avatar">?</div>
        <div className="user-details">
          <div className="user-name">ゲスト</div>
          <div className="user-status">オフライン</div>
          <VoiceStatus />
        </div>
      </div>
    )
  }

  const getUserInitials = (username: string): string => {
    return username
      .split(' ')
      .map((word) => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getStatusText = (status: User['status']): string => {
    switch (status) {
      case 'online':
        return 'オンライン'
      case 'away':
        return '離席中'
      case 'busy':
        return '取り込み中'
      case 'offline':
        return 'オフライン'
      default:
        return 'オフライン'
    }
  }

  return (
    <div className="user-info">
      <div className="user-avatar">
        <VoiceStatus />
        {user.avatar ? (
          <img src={user.avatar} alt={user.username} />
        ) : (
          <span>{getUserInitials(user.username)}</span>
        )}
      </div>
      <div className="user-details">
        <div className="user-name">
          {user.username}
          {user.githubUsername && (
            <span style={{ fontSize: '12px', color: 'var(--discord-text-muted)' }}>
              @{user.githubUsername}
            </span>
          )}
        </div>
        <div className="user-status">{getStatusText(user.status)}</div>
      </div>
      <button className="logout-btn" onClick={logout} title="ログアウト">
        <MdLogout />
      </button>
    </div>
  )
}

export default UserInfo
