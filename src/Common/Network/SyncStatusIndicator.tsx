import React from 'react'
import { useOfflineSync } from './useOfflineSync'

interface SyncStatusIndicatorProps {
  className?: string
  showWhenNoActions?: boolean
}

export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({ 
  className = '', 
  showWhenNoActions = false 
}) => {
  const { syncStatus, forceSyncNow } = useOfflineSync()

  // Don't show if no pending actions and showWhenNoActions is false
  if (syncStatus.pendingActionsCount === 0 && !showWhenNoActions) {
    return null
  }

  const handleSyncClick = async () => {
    if (syncStatus.isOnline && !syncStatus.isSyncing && forceSyncNow) {
      try {
        await forceSyncNow()
      } catch (error) {
        console.error('Manual sync failed:', error)
      }
    }
  }

  const getSyncStatusText = () => {
    if (syncStatus.isSyncing) {
      return '🔄 Syncing...'
    }
    
    if (!syncStatus.isOnline) {
      return `📱 ${syncStatus.pendingActionsCount} pending (offline)`
    }
    
    if (syncStatus.pendingActionsCount > 0) {
      return `⏳ ${syncStatus.pendingActionsCount} pending`
    }
    
    if (syncStatus.lastSyncError) {
      return '⚠️ Sync error'
    }
    
    return '✅ All synced'
  }

  const getStatusColor = () => {
    if (syncStatus.isSyncing) return '#2196f3' // Blue
    if (!syncStatus.isOnline) return '#ff9800' // Orange
    if (syncStatus.pendingActionsCount > 0) return '#ff9800' // Orange
    if (syncStatus.lastSyncError) return '#f44336' // Red
    return '#4caf50' // Green
  }

  const canSync = syncStatus.isOnline && !syncStatus.isSyncing && syncStatus.pendingActionsCount > 0

  return (
    <div 
      className={`sync-status-indicator ${className}`}
      style={{
        position: 'fixed',
        bottom: '10px',
        right: '10px',
        padding: '8px 12px',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: 'bold',
        zIndex: 999,
        backgroundColor: getStatusColor(),
        color: 'white',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        transition: 'all 0.3s ease',
        cursor: canSync ? 'pointer' : 'default',
        opacity: canSync ? 1 : 0.8
      }}
      onClick={handleSyncClick}
      title={
        syncStatus.lastSyncError 
          ? `Last error: ${syncStatus.lastSyncError}` 
          : syncStatus.lastSyncAt 
            ? `Last sync: ${syncStatus.lastSyncAt.toLocaleTimeString()}`
            : 'Sync status'
      }
    >
      {getSyncStatusText()}
    </div>
  )
}

export default SyncStatusIndicator