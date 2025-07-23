import { useState, useEffect } from 'react'
import { offlineSyncService, SyncStatus } from './OfflineSyncService'

export interface UseOfflineSyncResult {
  syncStatus: SyncStatus
  forceSyncNow: () => Promise<void>
  clearPendingActions: () => void
  hasPendingActions: boolean
}

export const useOfflineSync = (): UseOfflineSyncResult => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(() => 
    offlineSyncService.getSyncStatus()
  )

  useEffect(() => {
    const unsubscribe = offlineSyncService.subscribe((status) => {
      setSyncStatus(status)
    })

    return unsubscribe
  }, [])

  const forceSyncNow = async (): Promise<void> => {
    try {
      await offlineSyncService.forceSyncNow()
    } catch (error) {
      console.error('Failed to force sync:', error)
      throw error
    }
  }

  const clearPendingActions = (): void => {
    offlineSyncService.clearPendingActions()
  }

  return {
    syncStatus,
    forceSyncNow,
    clearPendingActions,
    hasPendingActions: syncStatus.pendingActionsCount > 0
  }
}

export default useOfflineSync