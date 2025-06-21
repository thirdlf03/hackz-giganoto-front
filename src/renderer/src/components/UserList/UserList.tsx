import React from 'react'
import { User } from '../../types'

interface UserListProps {
  users: User[]
}

const UserList: React.FC<UserListProps> = ({ users }) => {
  const getUserInitials = (username: string): string => {
    return username
      .split(' ')
      .map((word) => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const onlineUsers = users.filter((user) => user.status === 'online')
  const awayUsers = users.filter((user) => user.status === 'away')
  const busyUsers = users.filter((user) => user.status === 'busy')
  const offlineUsers = users.filter((user) => user.status === 'offline')

  const renderUserGroup = (users: User[], statusText: string) => {
    if (users.length === 0) return null

    return (
      <>
        <div className="user-list-header">
          {statusText} — {users.length}
        </div>
        {users.map((user) => (
          <div key={user.id} className="user-list-item">
            <div className={`user-list-avatar ${user.status}`}>
              {user.avatar ? (
                <img src={user.avatar} alt={user.username} />
              ) : (
                <span>{getUserInitials(user.username)}</span>
              )}
            </div>
            <div className="user-list-name">
              {user.username}
              {user.isBot && ' (BOT)'}
            </div>
          </div>
        ))}
      </>
    )
  }

  return (
    <div className="user-list">
      {renderUserGroup(onlineUsers, 'オンライン')}
      {renderUserGroup(awayUsers, '離席中')}
      {renderUserGroup(busyUsers, '取り込み中')}
      {renderUserGroup(offlineUsers, 'オフライン')}
    </div>
  )
}

export default UserList
