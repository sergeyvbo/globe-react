import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useOfflineSync } from './useOfflineSync'
import { offlineSyncService } from './OfflineSyncService'

// Mock the OfflineSyncService
vi.mock('./OfflineSyncService', () => ({
  offlineSyncService: {
    getSyncStatus: vi.fn(),
    subscribe: vi.fn(),
    forceSyncNow: vi.fn(),
    clearPendingActions: vi.fn()
  }
}))

const mockOfflineSyncService = vi.mocked(offlineSyncService)

describe('useOfflineSync', () => {
  const mockUnsubscribe = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Default mock implementations
    mockOfflineSyncService.getSyncStatus.mockReturnValue({
      isOnline: true,
      isSyncing: false,
      pendingActionsCount: 0,
      lastSyncAt: new Date(),
      lastSyncError: undefined
    })
    
    mockOfflineSyncService.subscribe.mockReturnValue(mockUnsubscribe)
    mockOfflineSyncService.forceSyncNow.mockResolvedValue()
  })

  describe('Initialization', () => {
    it('should return initial sync status', () => {
      const { result } = renderHook(() => useOfflineSync())

      expect(result.current.syncStatus).toEqual({
        isOnline: true,
        isSyncing: false,
        pendingActionsCount: 0,
        lastSyncAt: expect.any(Date),
        lastSyncError: undefined
      })
    })

    it('should subscribe to sync service on mount', () => {
      renderHook(() => useOfflineSync())

      expect(mockOfflineSyncService.subscribe).toHaveBeenCalledWith(expect.any(Function))
    })

    it('should get initial status from sync service', () => {
      renderHook(() => useOfflineSync())

      expect(mockOfflineSyncService.getSyncStatus).toHaveBeenCalled()
    })
  })

  describe('Status Updates', () => {
    it('should update state when sync status changes', () => {
      const { result } = renderHook(() => useOfflineSync())

      // Get the callback function passed to subscribe
      const statusCallback = mockOfflineSyncService.subscribe.mock.calls[0][0]

      // Simulate status change
      act(() => {
        statusCallback({
          isOnline: false,
          isSyncing: false,
          pendingActionsCount: 3,
          lastSyncAt: new Date(),
          lastSyncError: 'Network error'
        })
      })

      expect(result.current.syncStatus).toEqual({
        isOnline: false,
        isSyncing: false,
        pendingActionsCount: 3,
        lastSyncAt: expect.any(Date),
        lastSyncError: 'Network error'
      })
    })

    it('should update hasPendingActions based on pendingActionsCount', () => {
      const { result } = renderHook(() => useOfflineSync())

      // Initially no pending actions
      expect(result.current.hasPendingActions).toBe(false)

      const statusCallback = mockOfflineSyncService.subscribe.mock.calls[0][0]

      // Simulate status change with pending actions
      act(() => {
        statusCallback({
          isOnline: true,
          isSyncing: false,
          pendingActionsCount: 2,
          lastSyncAt: new Date()
        })
      })

      expect(result.current.hasPendingActions).toBe(true)
    })
  })

  describe('Force Sync', () => {
    it('should call offlineSyncService.forceSyncNow', async () => {
      const { result } = renderHook(() => useOfflineSync())

      await act(async () => {
        await result.current.forceSyncNow()
      })

      expect(mockOfflineSyncService.forceSyncNow).toHaveBeenCalled()
    })

    it('should handle force sync errors', async () => {
      const error = new Error('Sync failed')
      mockOfflineSyncService.forceSyncNow.mockRejectedValue(error)

      const { result } = renderHook(() => useOfflineSync())

      await act(async () => {
        await expect(result.current.forceSyncNow()).rejects.toThrow('Sync failed')
      })
    })
  })

  describe('Clear Pending Actions', () => {
    it('should call offlineSyncService.clearPendingActions', () => {
      const { result } = renderHook(() => useOfflineSync())

      act(() => {
        result.current.clearPendingActions()
      })

      expect(mockOfflineSyncService.clearPendingActions).toHaveBeenCalled()
    })
  })

  describe('Cleanup', () => {
    it('should unsubscribe on unmount', () => {
      const { unmount } = renderHook(() => useOfflineSync())

      unmount()

      expect(mockUnsubscribe).toHaveBeenCalled()
    })

    it('should not call unsubscribe multiple times', () => {
      const { unmount } = renderHook(() => useOfflineSync())

      unmount()
      unmount() // Second unmount should not cause issues

      expect(mockUnsubscribe).toHaveBeenCalledTimes(1)
    })
  })

  describe('Multiple Hook Instances', () => {
    it('should work with multiple hook instances', () => {
      const { result: result1 } = renderHook(() => useOfflineSync())
      const { result: result2 } = renderHook(() => useOfflineSync())

      expect(result1.current.syncStatus.isOnline).toBe(result2.current.syncStatus.isOnline)
      expect(result1.current.syncStatus.pendingActionsCount).toBe(result2.current.syncStatus.pendingActionsCount)
    })

    it('should update all instances when status changes', () => {
      const { result: result1 } = renderHook(() => useOfflineSync())
      const { result: result2 } = renderHook(() => useOfflineSync())

      // Both hooks should have subscribed
      expect(mockOfflineSyncService.subscribe).toHaveBeenCalledTimes(2)

      // Get both callback functions
      const callback1 = mockOfflineSyncService.subscribe.mock.calls[0][0]
      const callback2 = mockOfflineSyncService.subscribe.mock.calls[1][0]

      const newStatus = {
        isOnline: false,
        isSyncing: true,
        pendingActionsCount: 5,
        lastSyncAt: new Date()
      }

      act(() => {
        callback1(newStatus)
        callback2(newStatus)
      })

      expect(result1.current.syncStatus.isSyncing).toBe(true)
      expect(result2.current.syncStatus.isSyncing).toBe(true)
      expect(result1.current.syncStatus.pendingActionsCount).toBe(5)
      expect(result2.current.syncStatus.pendingActionsCount).toBe(5)
    })
  })

  describe('Edge Cases', () => {
    it('should handle undefined status gracefully', () => {
      mockOfflineSyncService.getSyncStatus.mockReturnValue({
        isOnline: false,
        isSyncing: false,
        pendingActionsCount: 0
      } as any)

      const { result } = renderHook(() => useOfflineSync())

      // Should not crash and provide reasonable values
      expect(result.current.syncStatus.isOnline).toBeDefined()
      expect(result.current.syncStatus.isSyncing).toBeDefined()
      expect(result.current.syncStatus.pendingActionsCount).toBeDefined()
    })

    it('should handle status updates with partial data', () => {
      const { result } = renderHook(() => useOfflineSync())

      const statusCallback = mockOfflineSyncService.subscribe.mock.calls[0][0]

      act(() => {
        statusCallback({
          isOnline: true,
          isSyncing: false,
          pendingActionsCount: 1
          // Missing lastSyncAt and lastSyncError
        } as any)
      })

      expect(result.current.syncStatus.isOnline).toBe(true)
      expect(result.current.syncStatus.pendingActionsCount).toBe(1)
      expect(result.current.hasPendingActions).toBe(true)
    })
  })
})