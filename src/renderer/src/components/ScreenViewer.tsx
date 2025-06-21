import React, { useRef, useEffect } from 'react'

interface ScreenViewerProps {
    isVisible: boolean
    videoStream: MediaStream | null
    onClose: () => void
}

export const ScreenViewer: React.FC<ScreenViewerProps> = ({ isVisible, videoStream, onClose }) => {
    const videoRef = useRef<HTMLVideoElement>(null)

    useEffect(() => {
        if (videoRef.current && videoStream) {
            console.log('Setting video stream:', videoStream)
            console.log('Video tracks:', videoStream.getVideoTracks())
            videoRef.current.srcObject = videoStream
            videoRef.current.play().catch(console.error)
        } else {
            console.log('No video ref or stream:', { videoRef: !!videoRef.current, videoStream: !!videoStream })
        }
    }, [videoStream])

    if (!isVisible) {
        return null
    }

    return (
        <div className="screen-viewer-overlay">
            <div className="screen-viewer-container">
                <div className="screen-viewer-header">
                    <h3>画面共有</h3>
                    <button 
                        className="close-button"
                        onClick={onClose}
                        title="画面視聴を停止"
                    >
                        ×
                    </button>
                </div>
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    controls
                    className="screen-viewer-video"
                />
            </div>
        </div>
    )
}