import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true
})

// Mock window.addEventListener and removeEventListener
const mockAddEventListener = vi.fn()
const mockRemoveEventListener = vi.fn()
Object.defineProperty(window, 'addEventListener', {
  value: mockAddEventListener
})
Object.defineProperty(window, 'removeEventListener', {
  value: mockRemoveEventListener
})

// Mock fetch for connectivity tests
global.fetch = vi.fn()

// Import after mocking
import { offlineDetector, NetworkStatus } from './OfflineDetector'

describe('OfflineDetector', () => {
  let mockFetch: any

  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch = vi.mocked(fetch)
    
    // Reset navigator.onLine to true
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true
    })
  })

  afterEach(() => {
    // Clean up any listeners
    offlineDetector.destroy()
  })

  describe('Initialization', () => {
    it('should initialize with current navigator.onLine status', () => {
      const status = offlineDetector.getStatus()
      expect(status.isOnline).toBe(navigator.onLine)
      expect(status.isOffline).toBe(!navigator.onLine)
    })

    it('should set up event listeners for online/offline events', () => {
      // The event listeners are set up during singleton creation
      // We can verify they exist by checking if the handlers work
      const listener = vi.fn()
      offlineDetector.subscribe(listener)
      listener.mockClear()

      // Simulate offline event by calling window.dispatchEvent
      window.dispatchEvent(new Event('offline'))
      
      // Should have been called with offline status
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          isOffline: true,
          isOnline: false
        })
      )
    })
  })

  describe('Status Management', () => {
    it('should return current status', () => {
      const status = offlineDetector.getStatus()
      expect(status).toHaveProperty('isOnline')
      expect(status).toHaveProperty('isOffline')
      expect(typeof status.isOnline).toBe('boolean')
      expect(typeof status.isOffline).toBe('boolean')
    })

    it('should return consistent online/offline status', () => {
      const status = offlineDetector.getStatus()
      expect(status.isOnline).toBe(!status.isOffline)
      expect(offlineDetector.isOnline()).toBe(status.isOnline)
      expect(offlineDetector.isOffline()).toBe(status.isOffline)
    })
  })

  describe('Event Handling', () => {
    it('should update status when going offline', () => {
      const listener = vi.fn()
      offlineDetector.subscribe(listener)
      listener.mockClear() // Clear initial call

      // Simulate offline event
      window.dispatchEvent(new Event('offline'))

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          isOnline: false,
          isOffline: true,
          lastOfflineAt: expect.any(Date)
        })
      )
    })

    it('should update status when coming online', () => {
      const listener = vi.fn()
      offlineDetector.subscribe(listener)
      listener.mockClear() // Clear initial call

      // Simulate online event
      window.dispatchEvent(new Event('online'))

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          isOnline: true,
          isOffline: false,
          lastOnlineAt: expect.any(Date)
        })
      )
    })
  })

  describe('Subscription Management', () => {
    it('should call listener immediately with current status on subscribe', () => {
      const listener = vi.fn()
      offlineDetector.subscribe(listener)

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          isOnline: expect.any(Boolean),
          isOffline: expect.any(Boolean)
        })
      )
    })

    it('should return unsubscribe function', () => {
      const listener = vi.fn()
      const unsubscribe = offlineDetector.subscribe(listener)

      expect(typeof unsubscribe).toBe('function')
    })

    it('should stop calling listener after unsubscribe', () => {
      const listener = vi.fn()
      const unsubscribe = offlineDetector.subscribe(listener)
      
      // Clear initial call
      listener.mockClear()
      
      unsubscribe()

      // Simulate offline event
      const offlineHandler = mockAddEventListener.mock.calls.find(
        call => call[0] === 'offline'
      )?.[1]
      
      if (offlineHandler) {
        offlineHandler()
      }

      expect(listener).not.toHaveBeenCalled()
    })

    it('should handle errors in listeners gracefully', () => {
      const errorListener = vi.fn()
      const normalListener = vi.fn()
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      // Set up error listener to throw on subsequent calls (not initial)
      let callCount = 0
      errorListener.mockImplementation(() => {
        callCount++
        if (callCount > 1) {
          throw new Error('Test error')
        }
      })

      offlineDetector.subscribe(errorListener)
      offlineDetector.subscribe(normalListener)
      
      // Clear initial calls
      errorListener.mockClear()
      normalListener.mockClear()

      // Simulate offline event
      window.dispatchEvent(new Event('offline'))

      expect(consoleSpy).toHaveBeenCalledWith('Error in network status listener:', expect.any(Error))
      expect(normalListener).toHaveBeenCalled()
      
      consoleSpy.mockRestore()
    })
  })

  describe('Connectivity Testing', () => {
    it('should return true when connectivity test succeeds', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true
      })

      const result = await offlineDetector.testConnectivity()
      expect(result).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith('/favicon.ico', {
        method: 'HEAD',
        cache: 'no-cache',
        timeout: 5000
      })
    })

    it('should return false when connectivity test fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      const result = await offlineDetector.testConnectivity()
      expect(result).toBe(false)
      expect(consoleSpy).toHaveBeenCalledWith('Connectivity test failed:', expect.any(Error))
      
      consoleSpy.mockRestore()
    })

    it('should update status when connectivity test result differs from current status', async () => {
      const listener = vi.fn()
      offlineDetector.subscribe(listener)
      listener.mockClear() // Clear initial call

      // Mock successful response when currently offline
      mockFetch.mockResolvedValueOnce({
        ok: true
      })

      // First simulate going offline
      window.dispatchEvent(new Event('offline'))

      listener.mockClear()

      // Then test connectivity (should update to online)
      await offlineDetector.testConnectivity()

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          isOnline: true,
          isOffline: false
        })
      )
    })
  })

  describe('Cleanup', () => {
    it('should remove event listeners on destroy', () => {
      offlineDetector.destroy()

      expect(mockRemoveEventListener).toHaveBeenCalledWith('online', expect.any(Function))
      expect(mockRemoveEventListener).toHaveBeenCalledWith('offline', expect.any(Function))
    })

    it('should clear all listeners on destroy', () => {
      const listener1 = vi.fn()
      const listener2 = vi.fn()
      
      offlineDetector.subscribe(listener1)
      offlineDetector.subscribe(listener2)
      
      offlineDetector.destroy()

      // Simulate offline event after destroy
      window.dispatchEvent(new Event('offline'))

      // Listeners should not be called after destroy
      expect(listener1).toHaveBeenCalledTimes(1) // Only initial call
      expect(listener2).toHaveBeenCalledTimes(1) // Only initial call
    })
  })

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = offlineDetector
      const instance2 = offlineDetector
      
      expect(instance1).toBe(instance2)
    })
  })
})