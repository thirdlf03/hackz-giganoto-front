import React from 'react'
import { MdMic, MdMicOff } from 'react-icons/md'
import { useAppContext } from '../../context/AppContext'

export const VoiceStatus: React.FC = () => {
    const { isMuted, toggleMute } = useAppContext()

    return (
        <div className="voice-status" onClick={toggleMute} title={isMuted ? 'ミュート解除' : 'ミュート'}>
            {isMuted ? <MdMicOff /> : <MdMic />}
        </div>
    )
}