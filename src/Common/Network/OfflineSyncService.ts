import { offlineDetector, NetworkStatus } from './OfflineDetector'
import { gameProgressService } from '../GameProgress/GameProgressService'
import { gameStatsApiService } from '../GameProgress/GameStatsApiService'
import { useAuth } from '../Auth/AuthContext'

export interface PendingAction {
  id: string
  type: 'game_session' | 'profile_update' | 'user_action'
  data: Record<string, unknown>
  timestamp: string
  retryCount: number
  maxRetries: number
}

export interface SyncStatus {
  isOnline: boolean
  isSyncing: boolean
  pendingActionsCount: number
  lastSyncAt?: Date
  lastSyncError?: string
}

export type SyncStatusListener = (status: SyncStatus) => void

class OfflineSyncService {
  private static instance: OfflineSyncService
  private readonly PENDING_ACTIONS_KEY = 'offline_pending_actions'
  private readonly SYNC_STATUS_KEY = 'offline_sync_status'
  private readonly MAX_RETRY_ATTEMPTS = 3
  private readonly SYNC_RETRY_DELAY = 2000 // 2 seconds
  
  private listeners: Set<SyncStatusListener> = new Set()
  private isSyncing = false
  private syncTimeout?: NodeJS.Timeout
  private networkStatusUnsubscribe?: () => void

  private constructor() {
    this.initializeNetworkListener()
  }

  static getInstance(): OfflineSyncService {
    if (!OfflineSyncService.instance) {
      OfflineSyncService.instance = new OfflineSyncService()
    }
    return OfflineSyncService.instance
  }

  private initializeNetworkListener(): void {
    // Listen for network status changes
    this.networkStatusUnsubscribe = offlineDetector.subscribe((status: NetworkStatus) => {
      if (status.isOnline && !this.isSyncing) {
        // Connection restored, trigger sync after a short delay
        this.scheduleSyncWithDelay(1000)
      }
      
      // Notify listeners of status change
      this.notifyStatusChange()
    })
  }

  private scheduleSyncWithDelay(delay: number): void {
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout)
    }
    
    this.syncTimeout = setTimeout(() => {
      this.syncPendingActions()
    }, delay)
  }

  // Add action to pending queue when offline
  async addPendingAction(type: PendingAction['type'], data: Record<string, unknown>): Promise<void> {
    const action: PendingAction = {
      id: this.generateActionId(),
      type,
      data,
      timestamp: new Date().toISOString(),
      retryCount: 0,
      maxRetries: this.MAX_RETRY_ATTEMPTS
    }

    const pendingActions = this.getPendingActions()
    pendingActions.push(action)
    
    this.savePendingActions(pendingActions)
    this.notifyStatusChange()
  }

  // Get all pending actions
  private getPendingActions(): PendingAction[] {
    try {
      const stored = localStorage.getItem(this.PENDING_ACTIONS_KEY)
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.error('Failed to get pending actions:', error)
      return []
    }
  }

  // Save pending actions to storage
  private savePendingActions(actions: PendingAction[]): void {
    try {
      localStorage.setItem(this.PENDING_ACTIONS_KEY, JSON.stringify(actions))
    } catch (error) {
      console.error('Failed to save pending actions:', error)
    }
  }

  // Sync all pending actions when online
  async syncPendingActions(): Promise<void> {
    if (!offlineDetector.isOnline() || this.isSyncing) {
      return
    }

    this.isSyncing = true
    this.notifyStatusChange()

    try {
      const pendingActions = this.getPendingActions()
      
      if (pendingActions.length === 0) {
        return
      }

      const failedActions: PendingAction[] = []
      let syncedCount = 0

      for (const action of pendingActions) {
        try {
          await this.syncSingleAction(action)
          syncedCount++
        } catch (error) {
          console.warn(`Failed to sync action: ${action.type} (${action.id})`, error)
          
          // Increment retry count
          action.retryCount++
          
          // Keep action if it hasn't exceeded max retries
          if (action.retryCount < action.maxRetries) {
            failedActions.push(action)
          } else {
            console.error(`Action exceeded max retries, discarding: ${action.type} (${action.id})`)
          }
        }
      }

      // Update pending actions with only failed ones
      this.savePendingActions(failedActions)
      
      // Update sync status
      this.updateSyncStatus({
        lastSyncAt: new Date(),
        lastSyncError: failedActions.length > 0 ? `${failedActions.length} actions failed to sync` : undefined
      })



      // If there are still failed actions, schedule a retry
      if (failedActions.length > 0) {
        this.scheduleSyncWithDelay(this.SYNC_RETRY_DELAY * Math.pow(2, failedActions[0].retryCount))
      }

    } catch (error) {
      console.error('Sync process failed:', error)
      this.updateSyncStatus({
        lastSyncError: error instanceof Error ? error.message : 'Unknown sync error'
      })
    } finally {
      this.isSyncing = false
      this.notifyStatusChange()
    }
  }

  // Sync a single action based on its type
  private async syncSingleAction(action: PendingAction): Promise<void> {
    switch (action.type) {
      case 'game_session':
        await this.syncGameSession(action.data)
        break
      
      case 'profile_update':
        await this.syncProfileUpdate(action.data)
        break
      
      case 'user_action':
        await this.syncUserAction(action.data)
        break
      
      default:
        throw new Error(`Unknown action type: ${action.type}`)
    }
  }

  // Sync game session data
  private async syncGameSession(data: Record<string, unknown>): Promise<void> {
    if (!gameStatsApiService.isAuthenticated()) {
      throw new Error('User not authenticated for game session sync')
    }

    await gameStatsApiService.saveGameSession(data)
  }

  // Sync profile update
  private async syncProfileUpdate(data: Record<string, unknown>): Promise<void> {
    // This would integrate with AuthService for profile updates
    // For now, we'll just log it as it's not implemented in the current system
  }

  // Sync generic user action
  private async syncUserAction(data: Record<string, unknown>): Promise<void> {
    // Handle other types of user actions
  }

  // Get current sync status
  getSyncStatus(): SyncStatus {
    const pendingActions = this.getPendingActions()
    const storedStatus = this.getStoredSyncStatus()
    
    return {
      isOnline: offlineDetector.isOnline(),
      isSyncing: this.isSyncing,
      pendingActionsCount: pendingActions.length,
      lastSyncAt: storedStatus.lastSyncAt,
      lastSyncError: storedStatus.lastSyncError
    }
  }

  // Subscribe to sync status changes
  subscribe(listener: SyncStatusListener): () => void {
    this.listeners.add(listener)
    
    // Immediately call listener with current status
    listener(this.getSyncStatus())
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener)
    }
  }

  // Notify all listeners of status change
  private notifyStatusChange(): void {
    const status = this.getSyncStatus()
    this.listeners.forEach(listener => {
      try {
        listener(status)
      } catch (error) {
        console.error('Error in sync status listener:', error)
      }
    })
  }

  // Update stored sync status
  private updateSyncStatus(updates: Partial<{ lastSyncAt: Date; lastSyncError?: string }>): void {
    try {
      const current = this.getStoredSyncStatus()
      const updated = {
        ...current,
        ...updates,
        lastSyncAt: updates.lastSyncAt?.toISOString() || current.lastSyncAt
      }
      
      localStorage.setItem(this.SYNC_STATUS_KEY, JSON.stringify(updated))
    } catch (error) {
      console.error('Failed to update sync status:', error)
    }
  }

  // Get stored sync status
  private getStoredSyncStatus(): { lastSyncAt?: string; lastSyncError?: string } {
    try {
      const stored = localStorage.getItem(this.SYNC_STATUS_KEY)
      return stored ? JSON.parse(stored) : {}
    } catch (error) {
      console.error('Failed to get stored sync status:', error)
      return {}
    }
  }

  // Force sync manually
  async forceSyncNow(): Promise<void> {
    if (!offlineDetector.isOnline()) {
      throw new Error('Cannot sync while offline')
    }

    await this.syncPendingActions()
  }

  // Clear all pending actions (for testing or user request)
  clearPendingActions(): void {
    localStorage.removeItem(this.PENDING_ACTIONS_KEY)
    this.notifyStatusChange()
  }

  // Check if there are pending actions
  hasPendingActions(): boolean {
    return this.getPendingActions().length > 0
  }

  // Generate unique action ID
  private generateActionId(): string {
    return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // Cleanup method
  destroy(): void {
    if (this.networkStatusUnsubscribe) {
      this.networkStatusUnsubscribe()
    }
    
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout)
    }
    
    this.listeners.clear()
  }
}

export const offlineSyncService = OfflineSyncService.getInstance()
export default offlineSyncService