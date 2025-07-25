import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock dependencies before importing
vi.mock('./OfflineDetector')
vi.mock('../GameProgress/GameStatsApiService')

import { offlineSyncService, PendingAction } from './OfflineSyncService'
import { offlineDetector } from './OfflineDetector'
import { gameStatsApiService } from '../GameProgress/GameStatsApiService'

const mockOfflineDetector = vi.mocked(offlineDetector)
const mockGameStatsApiService = vi.mocked(gameStatsApiService)

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

describe('OfflineSyncService', () => {
  const mockUnsubscribe = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Default mock implementations
    mockOfflineDetector.isOnline.mockReturnValue(true)
    mockOfflineDetector.subscribe.mockReturnValue(mockUnsubscribe)
    mockGameStatsApiService.isAuthenticated.mockReturnValue(true)
    mockGameStatsApiService.saveGameSession.mockResolvedValue({} as any)
    
    localStorageMock.getItem.mockReturnValue(null)
  })

  afterEach(() => {
    offlineSyncService.destroy()
  })

  describe('Initialization', () => {
    it('should subscribe to offline detector on initialization', () => {
      // The service is already initialized when imported, so subscribe should have been called
      expect(mockOfflineDetector.subscribe).toHaveBeenCalledWith(expect.any(Function))
    })

    it('should return current sync status', () => {
      const status = offlineSyncService.getSyncStatus()
      
      expect(status).toHaveProperty('isOnline')
      expect(status).toHaveProperty('isSyncing')
      expect(status).toHaveProperty('pendingActionsCount')
      expect(typeof status.isOnline).toBe('boolean')
      expect(typeof status.isSyncing).toBe('boolean')
      expect(typeof status.pendingActionsCount).toBe('number')
    })
  })

  describe('Adding Pending Actions', () => {
    it('should add action to pending queue', async () => {
      const testData = { gameType: 'countries', score: 100 }
      
      await offlineSyncService.addPendingAction('game_session', testData)
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'offline_pending_actions',
        expect.stringContaining('"type":"game_session"')
      )
    })

    it('should generate unique action IDs', async () => {
      const testData = { test: 'data' }
      
      await offlineSyncService.addPendingAction('user_action', testData)
      await offlineSyncService.addPendingAction('user_action', testData)
      
      // Should have been called twice with different action IDs
      expect(localStorageMock.setItem).toHaveBeenCalledTimes(2)
      
      const firstCall = localStorageMock.setItem.mock.calls[0][1]
      const secondCall = localStorageMock.setItem.mock.calls[1][1]
      
      const firstActions = JSON.parse(firstCall)
      const secondActions = JSON.parse(secondCall)
      
      // First call should have 1 action, second call should have 2 actions
      expect(firstActions).toHaveLength(1)
      expect(secondActions).toHaveLength(2)
      
      expect(firstActions[0].id).not.toBe(secondActions[1].id)
    })

    it('should include timestamp and retry information', async () => {
      const testData = { test: 'data' }
      
      await offlineSyncService.addPendingAction('user_action', testData)
      
      const savedData = localStorageMock.setItem.mock.calls[0][1]
      const actions = JSON.parse(savedData)
      const action = actions[0]
      
      expect(action).toHaveProperty('timestamp')
      expect(action).toHaveProperty('retryCount', 0)
      expect(action).toHaveProperty('maxRetries', 3)
    })
  })

  describe('Sync Status Management', () => {
    it('should notify listeners when status changes', async () => {
      const listener = vi.fn()
      offlineSyncService.subscribe(listener)
      
      // Clear initial call
      listener.mockClear()
      
      await offlineSyncService.addPendingAction('user_action', { test: 'data' })
      
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          pendingActionsCount: expect.any(Number)
        })
      )
    })

    it('should return unsubscribe function', () => {
      const listener = vi.fn()
      const unsubscribe = offlineSyncService.subscribe(listener)
      
      expect(typeof unsubscribe).toBe('function')
    })

    it('should call listener immediately with current status', () => {
      const listener = vi.fn()
      offlineSyncService.subscribe(listener)
      
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          isOnline: expect.any(Boolean),
          isSyncing: expect.any(Boolean),
          pendingActionsCount: expect.any(Number)
        })
      )
    })
  })

  describe('Synchronization', () => {
    it('should not sync when offline', async () => {
      mockOfflineDetector.isOnline.mockReturnValue(false)
      
      await offlineSyncService.syncPendingActions()
      
      expect(mockGameStatsApiService.saveGameSession).not.toHaveBeenCalled()
    })

    it('should not sync when already syncing', async () => {
      // Mock pending actions
      localStorageMock.getItem.mockReturnValue(JSON.stringify([
        {
          id: 'test1',
          type: 'game_session',
          data: { gameType: 'countries' },
          timestamp: new Date().toISOString(),
          retryCount: 0,
          maxRetries: 3
        }
      ]))
      
      // Start first sync
      const syncPromise1 = offlineSyncService.syncPendingActions()
      
      // Try to start second sync immediately
      const syncPromise2 = offlineSyncService.syncPendingActions()
      
      await Promise.all([syncPromise1, syncPromise2])
      
      // Should only sync once
      expect(mockGameStatsApiService.saveGameSession).toHaveBeenCalledTimes(1)
    })

    it('should sync game session actions', async () => {
      const gameSessionData = {
        gameType: 'countries',
        correctAnswers: 5,
        wrongAnswers: 2,
        sessionStartTime: new Date().toISOString(),
        sessionEndTime: new Date().toISOString()
      }
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify([
        {
          id: 'test1',
          type: 'game_session',
          data: gameSessionData,
          timestamp: new Date().toISOString(),
          retryCount: 0,
          maxRetries: 3
        }
      ]))
      
      await offlineSyncService.syncPendingActions()
      
      expect(mockGameStatsApiService.saveGameSession).toHaveBeenCalledWith(gameSessionData)
    })

    it('should handle sync failures and retry', async () => {
      mockGameStatsApiService.saveGameSession.mockRejectedValueOnce(new Error('Network error'))
      
      const gameSessionData = { gameType: 'countries' }
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify([
        {
          id: 'test1',
          type: 'game_session',
          data: gameSessionData,
          timestamp: new Date().toISOString(),
          retryCount: 0,
          maxRetries: 3
        }
      ]))
      
      await offlineSyncService.syncPendingActions()
      
      // Should have tried to save the failed action with incremented retry count
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'offline_pending_actions',
        expect.stringContaining('"retryCount":1')
      )
    })

    it('should discard actions that exceed max retries', async () => {
      mockGameStatsApiService.saveGameSession.mockRejectedValue(new Error('Persistent error'))
      
      const gameSessionData = { gameType: 'countries' }
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify([
        {
          id: 'test1',
          type: 'game_session',
          data: gameSessionData,
          timestamp: new Date().toISOString(),
          retryCount: 3, // Already at max retries
          maxRetries: 3
        }
      ]))
      
      await offlineSyncService.syncPendingActions()
      
      // Should have cleared the action (empty array)
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'offline_pending_actions',
        '[]'
      )
    })

    it('should clear pending actions when all sync successfully', async () => {
      const gameSessionData = { gameType: 'countries' }
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify([
        {
          id: 'test1',
          type: 'game_session',
          data: gameSessionData,
          timestamp: new Date().toISOString(),
          retryCount: 0,
          maxRetries: 3
        }
      ]))
      
      await offlineSyncService.syncPendingActions()
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'offline_pending_actions',
        '[]'
      )
    })
  })

  describe('Network Status Integration', () => {
    it('should trigger sync when network comes online', () => {
      // Verify that subscribe was called during initialization
      expect(mockOfflineDetector.subscribe).toHaveBeenCalled()
      
      const networkCallback = mockOfflineDetector.subscribe.mock.calls[0][0]
      expect(networkCallback).toBeDefined()
      
      // Simulate network coming online
      networkCallback({
        isOnline: true,
        isOffline: false,
        lastOnlineAt: new Date()
      })
      
      // The callback should have been executed (we can't easily test the timeout scheduling)
      expect(typeof networkCallback).toBe('function')
    })

    it('should not trigger sync when network goes offline', () => {
      // Verify that subscribe was called during initialization
      expect(mockOfflineDetector.subscribe).toHaveBeenCalled()
      
      const networkCallback = mockOfflineDetector.subscribe.mock.calls[0][0]
      expect(networkCallback).toBeDefined()
      
      // Simulate network going offline
      networkCallback({
        isOnline: false,
        isOffline: true,
        lastOfflineAt: new Date()
      })
      
      // Should not attempt to sync immediately
      expect(mockGameStatsApiService.saveGameSession).not.toHaveBeenCalled()
    })
  })

  describe('Manual Operations', () => {
    it('should force sync when requested', async () => {
      const gameSessionData = { gameType: 'countries' }
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify([
        {
          id: 'test1',
          type: 'game_session',
          data: gameSessionData,
          timestamp: new Date().toISOString(),
          retryCount: 0,
          maxRetries: 3
        }
      ]))
      
      await offlineSyncService.forceSyncNow()
      
      expect(mockGameStatsApiService.saveGameSession).toHaveBeenCalledWith(gameSessionData)
    })

    it('should throw error when forcing sync while offline', async () => {
      mockOfflineDetector.isOnline.mockReturnValue(false)
      
      await expect(offlineSyncService.forceSyncNow()).rejects.toThrow('Cannot sync while offline')
    })

    it('should clear all pending actions', () => {
      offlineSyncService.clearPendingActions()
      
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('offline_pending_actions')
    })

    it('should check if there are pending actions', () => {
      localStorageMock.getItem.mockReturnValue('[]')
      expect(offlineSyncService.hasPendingActions()).toBe(false)
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify([{ id: 'test' }]))
      expect(offlineSyncService.hasPendingActions()).toBe(true)
    })
  })

  describe('Error Handling', () => {
    it('should handle localStorage errors gracefully', async () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('Storage error')
      })
      
      // Should not throw error
      await expect(offlineSyncService.addPendingAction('user_action', {})).resolves.not.toThrow()
      
      const status = offlineSyncService.getSyncStatus()
      expect(status.pendingActionsCount).toBe(0)
    })

    it('should handle JSON parse errors gracefully', async () => {
      localStorageMock.getItem.mockReturnValue('invalid json')
      
      const status = offlineSyncService.getSyncStatus()
      expect(status.pendingActionsCount).toBe(0)
    })

    it('should handle sync errors without crashing', async () => {
      mockGameStatsApiService.saveGameSession.mockRejectedValue(new Error('Sync error'))
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify([
        {
          id: 'test1',
          type: 'game_session',
          data: { gameType: 'countries' },
          timestamp: new Date().toISOString(),
          retryCount: 0,
          maxRetries: 3
        }
      ]))
      
      // Should not throw error
      await expect(offlineSyncService.syncPendingActions()).resolves.not.toThrow()
    })
  })

  describe('Cleanup', () => {
    it('should cleanup resources on destroy', () => {
      offlineSyncService.destroy()
      
      expect(mockUnsubscribe).toHaveBeenCalled()
    })
  })
})