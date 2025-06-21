import React from 'react'
import { MdMic, MdMicOff, MdPerson } from 'react-icons/md'
import { User } from '../../types'
import './VoiceMembers.css'

interface VoiceMembersProps {
  participants: User[]
  currentRoomId: string | null
}

export const VoiceMembers: React.FC<VoiceMembersProps> = ({ participants, currentRoomId }) => {
  if (!currentRoomId || participants.length === 0) {
    return null
  }

  return (
    <div className="voice-members">
      <div className="voice-members-header">
        <MdPerson />
        <span>参加者 ({participants.length})</span>
      </div>
      <div className="voice-members-list">
        {participants.map((participant) => (
          <div
            key={participant.id}
            className={`voice-member ${
              participant.status === 'speaking' ? 'speaking' : ''
            } ${participant.status === 'muted' ? 'muted' : ''}`}
          >
            <div className="member-avatar">
              {participant.avatar ? (
                <img src={participant.avatar} alt={participant.username} />
              ) : (
                <div className="default-avatar">
                  <MdPerson />
                </div>
              )}
                             <div className="member-status">
                 {participant.status === 'muted' ? (
                   <MdMicOff className="muted-icon" />
                 ) : participant.status === 'speaking' ? (
                   <MdMic className="speaking-icon" />
                 ) : (
                   <MdMic className="idle-icon" />
                 )}
               </div>
            </div>
            <span className="member-name">{participant.username}</span>
          </div>
        ))}
      </div>
    </div>
  )
} 