import React from 'react'
import { useOfflineDetector } from './useOfflineDetector'

interface OfflineIndicatorProps {
  className?: string
  showWhenOnline?: boolean
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ 
  className = '', 
  showWhenOnline = false 
}) => {
  const { isOnline, isOffline } = useOfflineDetector()

  if (isOnline && !showWhenOnline) {
    return null
  }

  return (
    <div 
      className={`offline-indicator ${isOffline ? 'offline' : 'online'} ${className}`}
      style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
        padding: '8px 16px',
        borderRadius: '4px',
        fontSize: '14px',
        fontWeight: 'bold',
        zIndex: 1000,
        backgroundColor: isOffline ? '#f44336' : '#4caf50',
        color: 'white',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        transition: 'all 0.3s ease'
      }}
    >
      {isOffline ? '🔴 Offline Mode' : '🟢 Online'}
    </div>
  )
}

export default OfflineIndicator