import React from 'react'
import { MdMic, MdMicOff, MdScreenShare, MdStopScreenShare, MdVisibility, MdVisibilityOff, MdCallEnd } from 'react-icons/md'
import { useAppContext } from '../../context/AppContext'

export const VoiceStatus: React.FC = () => {
    const { isMuted, toggleMute } = useAppContext()

    const { isScreenSharing, stopScreenShare, startScreenShare, isWatchingScreen, startWatchingScreen, stopWatchingScreen, currentVoiceChannelId, leaveVoiceChannel } = useAppContext()

    return (
        <div className="voice-controls">
            <div className="voice-status" onClick={toggleMute} title={isMuted ? 'ミュート解除' : 'ミュート'}>
                {isMuted ? <MdMicOff /> : <MdMic />}
            </div>
            <div 
                className="voice-status" 
                onClick={isScreenSharing ? stopScreenShare : startScreenShare}
                title={isScreenSharing ? '画面共有停止' : '画面共有'}
            >
                {isScreenSharing ? <MdStopScreenShare /> : <MdScreenShare />}
            </div>
            <div 
                className="voice-status" 
                onClick={isWatchingScreen ? stopWatchingScreen : startWatchingScreen}
                title={isWatchingScreen ? '画面視聴停止' : '画面視聴'}
            >
                {isWatchingScreen ? <MdVisibilityOff /> : <MdVisibility />}
            </div>
            {currentVoiceChannelId && (
                <div 
                    className="voice-status" 
                    onClick={leaveVoiceChannel}
                    title="通話から抜ける"
                >
                    <MdCallEnd />
                </div>
            )}
        </div>
    )
}