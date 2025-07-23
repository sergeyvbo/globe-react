import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useOfflineDetector } from './useOfflineDetector'
import { offlineDetector } from './OfflineDetector'

// Mock the OfflineDetector
vi.mock('./OfflineDetector', () => ({
  offlineDetector: {
    getStatus: vi.fn(),
    subscribe: vi.fn(),
    testConnectivity: vi.fn()
  }
}))

const mockOfflineDetector = vi.mocked(offlineDetector)

describe('useOfflineDetector', () => {
  const mockUnsubscribe = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Default mock implementations
    mockOfflineDetector.getStatus.mockReturnValue({
      isOnline: true,
      isOffline: false,
      lastOnlineAt: new Date()
    })
    
    mockOfflineDetector.subscribe.mockReturnValue(mockUnsubscribe)
    mockOfflineDetector.testConnectivity.mockResolvedValue(true)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Initialization', () => {
    it('should return initial network status', () => {
      const { result } = renderHook(() => useOfflineDetector())

      expect(result.current.isOnline).toBe(true)
      expect(result.current.isOffline).toBe(false)
      expect(result.current.networkStatus).toEqual({
        isOnline: true,
        isOffline: false,
        lastOnlineAt: expect.any(Date)
      })
    })

    it('should subscribe to offline detector on mount', () => {
      renderHook(() => useOfflineDetector())

      expect(mockOfflineDetector.subscribe).toHaveBeenCalledWith(expect.any(Function))
    })

    it('should get initial status from offline detector', () => {
      renderHook(() => useOfflineDetector())

      expect(mockOfflineDetector.getStatus).toHaveBeenCalled()
    })
  })

  describe('Status Updates', () => {
    it('should update state when network status changes', () => {
      const { result } = renderHook(() => useOfflineDetector())

      // Get the callback function passed to subscribe
      const statusCallback = mockOfflineDetector.subscribe.mock.calls[0][0]

      // Simulate status change to offline
      act(() => {
        statusCallback({
          isOnline: false,
          isOffline: true,
          lastOfflineAt: new Date()
        })
      })

      expect(result.current.isOnline).toBe(false)
      expect(result.current.isOffline).toBe(true)
    })

    it('should update networkStatus object when status changes', () => {
      const { result } = renderHook(() => useOfflineDetector())

      const newStatus = {
        isOnline: false,
        isOffline: true,
        lastOfflineAt: new Date(),
        lastOnlineAt: new Date(Date.now() - 60000) // 1 minute ago
      }

      // Get the callback function passed to subscribe
      const statusCallback = mockOfflineDetector.subscribe.mock.calls[0][0]

      act(() => {
        statusCallback(newStatus)
      })

      expect(result.current.networkStatus).toEqual(newStatus)
    })
  })

  describe('Cleanup', () => {
    it('should unsubscribe on unmount', () => {
      const { unmount } = renderHook(() => useOfflineDetector())

      unmount()

      expect(mockUnsubscribe).toHaveBeenCalled()
    })

    it('should not call unsubscribe multiple times', () => {
      const { unmount } = renderHook(() => useOfflineDetector())

      unmount()
      unmount() // Second unmount should not cause issues

      expect(mockUnsubscribe).toHaveBeenCalledTimes(1)
    })
  })

  describe('testConnectivity function', () => {
    it('should provide testConnectivity function', () => {
      const { result } = renderHook(() => useOfflineDetector())

      expect(typeof result.current.testConnectivity).toBe('function')
    })

    it('should call offlineDetector.testConnectivity when invoked', async () => {
      const { result } = renderHook(() => useOfflineDetector())

      await result.current.testConnectivity()

      expect(mockOfflineDetector.testConnectivity).toHaveBeenCalled()
    })

    it('should return result from offlineDetector.testConnectivity', async () => {
      mockOfflineDetector.testConnectivity.mockResolvedValue(false)
      
      const { result } = renderHook(() => useOfflineDetector())

      const connectivityResult = await result.current.testConnectivity()

      expect(connectivityResult).toBe(false)
    })

    it('should handle testConnectivity errors', async () => {
      const error = new Error('Connectivity test failed')
      mockOfflineDetector.testConnectivity.mockRejectedValue(error)
      
      const { result } = renderHook(() => useOfflineDetector())

      await expect(result.current.testConnectivity()).rejects.toThrow('Connectivity test failed')
    })
  })

  describe('Multiple Hook Instances', () => {
    it('should work with multiple hook instances', () => {
      const { result: result1 } = renderHook(() => useOfflineDetector())
      const { result: result2 } = renderHook(() => useOfflineDetector())

      expect(result1.current.isOnline).toBe(result2.current.isOnline)
      expect(result1.current.isOffline).toBe(result2.current.isOffline)
    })

    it('should update all instances when status changes', () => {
      const { result: result1 } = renderHook(() => useOfflineDetector())
      const { result: result2 } = renderHook(() => useOfflineDetector())

      // Both hooks should have subscribed
      expect(mockOfflineDetector.subscribe).toHaveBeenCalledTimes(2)

      // Get both callback functions
      const callback1 = mockOfflineDetector.subscribe.mock.calls[0][0]
      const callback2 = mockOfflineDetector.subscribe.mock.calls[1][0]

      const newStatus = {
        isOnline: false,
        isOffline: true,
        lastOfflineAt: new Date()
      }

      act(() => {
        callback1(newStatus)
        callback2(newStatus)
      })

      expect(result1.current.isOffline).toBe(true)
      expect(result2.current.isOffline).toBe(true)
    })
  })

  describe('Edge Cases', () => {
    it('should handle undefined status gracefully', () => {
      mockOfflineDetector.getStatus.mockReturnValue({
        isOnline: false,
        isOffline: true
      } as any)

      const { result } = renderHook(() => useOfflineDetector())

      // Should not crash and provide reasonable defaults
      expect(result.current.isOnline).toBeDefined()
      expect(result.current.isOffline).toBeDefined()
    })

    it('should handle status updates with partial data', () => {
      const { result } = renderHook(() => useOfflineDetector())

      const statusCallback = mockOfflineDetector.subscribe.mock.calls[0][0]

      act(() => {
        statusCallback({
          isOnline: false,
          isOffline: true
          // Missing timestamp fields
        } as any)
      })

      expect(result.current.isOnline).toBe(false)
      expect(result.current.isOffline).toBe(true)
    })
  })
})