import { renderHook, act, waitFor } from '@testing-library/react'
import { useGameProgress, UseGameProgressOptions } from '../useGameProgress'
import { gameProgressService } from '../../GameProgress/GameProgressService'
import { useOfflineDetector } from '../../Network/useOfflineDetector'
import { useSaveErrorHandler } from '../../ErrorHandling/useSaveErrorHandler'
import { GameType, User } from '../../types'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

// Mock dependencies
vi.mock('../../GameProgress/GameProgressService')
vi.mock('../../Network/useOfflineDetector')
vi.mock('../../ErrorHandling/useSaveErrorHandler')

const mockGameProgressService = gameProgressService as any
const mockUseOfflineDetector = useOfflineDetector as any
const mockUseSaveErrorHandler = useSaveErrorHandler as any

describe('useGameProgress', () => {
  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    provider: 'email',
    createdAt: new Date()
  }

  const baseOptions: UseGameProgressOptions = {
    gameType: 'countries' as GameType,
    correctScore: 0,
    wrongScore: 0,
    isAuthenticated: false,
    user: null,
    gameSession: {
      gameType: 'countries',
      correctAnswers: 0,
      wrongAnswers: 0,
      sessionStartTime: new Date()
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.clearAllTimers()
    vi.useFakeTimers()

    // Default mock implementations
    mockUseOfflineDetector.mockReturnValue({
      isOnline: true,
      isOffline: false,
      networkStatus: { isOnline: true, isOffline: false },
      testConnectivity: vi.fn()
    })

    mockGameProgressService.saveGameProgress = vi.fn().mockResolvedValue(undefined)
    mockGameProgressService.saveTempSession = vi.fn().mockImplementation(() => {})
    mockGameProgressService.hasPendingOfflineSessions = vi.fn().mockReturnValue(false)
    mockGameProgressService.syncOfflineSessionsManually = vi.fn().mockResolvedValue(undefined)

    // Mock useSaveErrorHandler with proper functions
    const mockErrorHandler = {
      error: null,
      isRetrying: false,
      retryCount: 0,
      handleError: vi.fn(),
      retry: vi.fn(),
      clearError: vi.fn(),
      canRetry: false,
      setRetryOperation: vi.fn(),
      isOffline: false,
      getUserMessage: null,
      getDisplayConfig: null
    }
    mockUseSaveErrorHandler.mockReturnValue(mockErrorHandler)
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  describe('Initial State', () => {
    it('should initialize with correct default values', () => {
      const { result } = renderHook(() => useGameProgress(baseOptions))

      expect(result.current.isSaving).toBe(false)
      expect(result.current.saveError).toBe(null)
      expect(typeof result.current.autoSaveProgress).toBe('function')
    })
  })

  describe('Auto-save for Authenticated Users', () => {
    it('should save progress for authenticated users when scores change', async () => {
      const options: UseGameProgressOptions = {
        ...baseOptions,
        isAuthenticated: true,
        user: mockUser,
        correctScore: 1,
        wrongScore: 0
      }

      renderHook(() => useGameProgress(options))

      // Wait for useEffect to run
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(mockGameProgressService.saveGameProgress).toHaveBeenCalledWith(
        'user-123',
        'countries',
        expect.objectContaining({
          gameType: 'countries',
          correctAnswers: 1,
          wrongAnswers: 0,
          sessionEndTime: expect.any(Date)
        })
      )
    })

    it('should handle save errors for authenticated users', async () => {
      const saveError = new Error('Network error')
      mockGameProgressService.saveGameProgress.mockRejectedValue(saveError)

      // Mock error handler to simulate error handling
      const mockHandleError = vi.fn()
      const mockErrorHandler = {
        error: null,
        isRetrying: false,
        retryCount: 0,
        handleError: mockHandleError,
        retry: vi.fn(),
        clearError: vi.fn(),
        canRetry: false,
        setRetryOperation: vi.fn(),
        isOffline: false,
        getUserMessage: 'Unable to save to server. Please check your connection and try again.',
        getDisplayConfig: null
      }
      mockUseSaveErrorHandler.mockReturnValue(mockErrorHandler)

      const options: UseGameProgressOptions = {
        ...baseOptions,
        isAuthenticated: true,
        user: mockUser,
        correctScore: 1,
        wrongScore: 0
      }

      const { result } = renderHook(() => useGameProgress(options))

      // Wait for useEffect to run and error to be handled
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(mockHandleError).toHaveBeenCalledWith(saveError, {
        action: 'save',
        gameType: 'countries',
        userId: 'user-123'
      })

      expect(result.current.saveError).toBe('Unable to save to server. Please check your connection and try again.')
    })
  })

  describe('Auto-save for Unauthenticated Users', () => {
    it('should save temporary session for unauthenticated users', async () => {
      const options: UseGameProgressOptions = {
        ...baseOptions,
        correctScore: 2,
        wrongScore: 1
      }

      renderHook(() => useGameProgress(options))

      // Wait for useEffect to run
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(mockGameProgressService.saveTempSession).toHaveBeenCalledWith(
        expect.objectContaining({
          gameType: 'countries',
          correctAnswers: 2,
          wrongAnswers: 1,
          sessionEndTime: expect.any(Date)
        })
      )
    })

    it('should not save when scores are zero', () => {
      renderHook(() => useGameProgress(baseOptions))

      expect(mockGameProgressService.saveGameProgress).not.toHaveBeenCalled()
      expect(mockGameProgressService.saveTempSession).not.toHaveBeenCalled()
    })
  })

  describe('Periodic Auto-save', () => {
    it('should auto-save every 30 seconds during active gameplay', async () => {
      const options: UseGameProgressOptions = {
        ...baseOptions,
        isAuthenticated: true,
        user: mockUser,
        correctScore: 1,
        wrongScore: 0
      }

      renderHook(() => useGameProgress(options))

      // Clear the initial save call
      mockGameProgressService.saveGameProgress.mockClear()

      // Fast-forward 30 seconds
      act(() => {
        vi.advanceTimersByTime(30000)
      })

      // Wait for the timer callback to execute
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(mockGameProgressService.saveGameProgress).toHaveBeenCalledTimes(1)

      // Fast-forward another 30 seconds
      act(() => {
        vi.advanceTimersByTime(30000)
      })

      // Wait for the timer callback to execute
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(mockGameProgressService.saveGameProgress).toHaveBeenCalledTimes(2)
    })

    it('should not set up periodic save when scores are zero', () => {
      const options: UseGameProgressOptions = {
        ...baseOptions,
        correctScore: 0,
        wrongScore: 0
      }

      renderHook(() => useGameProgress(options))

      // Fast-forward 30 seconds
      act(() => {
        vi.advanceTimersByTime(30000)
      })

      expect(mockGameProgressService.saveGameProgress).not.toHaveBeenCalled()
    })

    it('should clear interval when component unmounts', () => {
      const options: UseGameProgressOptions = {
        ...baseOptions,
        correctScore: 1,
        wrongScore: 0
      }

      const { unmount } = renderHook(() => useGameProgress(options))

      // Spy on clearInterval
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval')

      unmount()

      expect(clearIntervalSpy).toHaveBeenCalled()
    })
  })

  describe('Score Changes', () => {
    it('should trigger save when correct score increases', async () => {
      const { result, rerender } = renderHook(
        (props: UseGameProgressOptions) => useGameProgress(props),
        { initialProps: baseOptions }
      )

      // Clear any initial calls
      mockGameProgressService.saveGameProgress.mockClear()
      mockGameProgressService.saveTempSession.mockClear()

      // Update with non-zero score
      rerender({
        ...baseOptions,
        correctScore: 1
      })

      // Wait for useEffect to run
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(mockGameProgressService.saveTempSession).toHaveBeenCalledWith(
        expect.objectContaining({
          correctAnswers: 1,
          wrongAnswers: 0
        })
      )
    })

    it('should trigger save when wrong score increases', async () => {
      const { result, rerender } = renderHook(
        (props: UseGameProgressOptions) => useGameProgress(props),
        { initialProps: baseOptions }
      )

      // Clear any initial calls
      mockGameProgressService.saveGameProgress.mockClear()
      mockGameProgressService.saveTempSession.mockClear()

      // Update with non-zero score
      rerender({
        ...baseOptions,
        wrongScore: 1
      })

      // Wait for useEffect to run
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(mockGameProgressService.saveTempSession).toHaveBeenCalledWith(
        expect.objectContaining({
          correctAnswers: 0,
          wrongAnswers: 1
        })
      )
    })
  })

  describe('Online/Offline State Handling', () => {
    it('should sync offline sessions when coming back online', async () => {
      // Start offline
      mockUseOfflineDetector.mockReturnValue({
        isOnline: false,
        isOffline: true,
        networkStatus: { isOnline: false, isOffline: true },
        testConnectivity: vi.fn()
      })

      mockGameProgressService.hasPendingOfflineSessions.mockReturnValue(true)

      const { rerender } = renderHook(() => useGameProgress(baseOptions))

      // Come back online
      mockUseOfflineDetector.mockReturnValue({
        isOnline: true,
        isOffline: false,
        networkStatus: { isOnline: true, isOffline: false },
        testConnectivity: vi.fn()
      })

      rerender()

      // Wait for sync to be triggered
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(mockGameProgressService.syncOfflineSessionsManually).toHaveBeenCalled()
    })

    it('should not sync when no pending offline sessions', () => {
      mockGameProgressService.hasPendingOfflineSessions.mockReturnValue(false)

      renderHook(() => useGameProgress(baseOptions))

      expect(mockGameProgressService.syncOfflineSessionsManually).not.toHaveBeenCalled()
    })

    it('should handle sync errors gracefully', async () => {
      mockGameProgressService.hasPendingOfflineSessions.mockReturnValue(true)
      mockGameProgressService.syncOfflineSessionsManually.mockRejectedValue(
        new Error('Sync failed')
      )

      // Start offline then come online
      mockUseOfflineDetector.mockReturnValue({
        isOnline: false,
        isOffline: true,
        networkStatus: { isOnline: false, isOffline: true },
        testConnectivity: vi.fn()
      })

      const { rerender } = renderHook(() => useGameProgress(baseOptions))

      mockUseOfflineDetector.mockReturnValue({
        isOnline: true,
        isOffline: false,
        networkStatus: { isOnline: true, isOffline: false },
        testConnectivity: vi.fn()
      })

      rerender()

      // Wait for sync attempt
      await new Promise(resolve => setTimeout(resolve, 100))

      // Should not throw error, just log it
      expect(mockGameProgressService.syncOfflineSessionsManually).toHaveBeenCalled()
    })
  })

  describe('Manual Auto-save', () => {
    it('should allow manual triggering of auto-save', async () => {
      const options: UseGameProgressOptions = {
        ...baseOptions,
        isAuthenticated: true,
        user: mockUser,
        correctScore: 1,
        wrongScore: 0
      }

      const { result } = renderHook(() => useGameProgress(options))

      // Clear initial auto-save call
      mockGameProgressService.saveGameProgress.mockClear()

      await act(async () => {
        await result.current.autoSaveProgress()
      })

      expect(mockGameProgressService.saveGameProgress).toHaveBeenCalledTimes(1)
    })

    it('should not save manually when scores are zero', async () => {
      const { result } = renderHook(() => useGameProgress(baseOptions))

      await act(async () => {
        await result.current.autoSaveProgress()
      })

      expect(mockGameProgressService.saveGameProgress).not.toHaveBeenCalled()
    })
  })

  describe('Different Game Types', () => {
    it('should work with flags game type', async () => {
      const options: UseGameProgressOptions = {
        ...baseOptions,
        gameType: 'flags',
        gameSession: {
          ...baseOptions.gameSession,
          gameType: 'flags'
        },
        isAuthenticated: true,
        user: mockUser,
        correctScore: 1,
        wrongScore: 0
      }

      renderHook(() => useGameProgress(options))

      // Wait for useEffect to run
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(mockGameProgressService.saveGameProgress).toHaveBeenCalledWith(
        'user-123',
        'flags',
        expect.objectContaining({
          gameType: 'flags',
          correctAnswers: 1,
          wrongAnswers: 0
        })
      )
    })

    it('should work with states game type', async () => {
      const options: UseGameProgressOptions = {
        ...baseOptions,
        gameType: 'states',
        gameSession: {
          ...baseOptions.gameSession,
          gameType: 'states'
        },
        isAuthenticated: true,
        user: mockUser,
        correctScore: 1,
        wrongScore: 0
      }

      renderHook(() => useGameProgress(options))

      // Wait for useEffect to run
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(mockGameProgressService.saveGameProgress).toHaveBeenCalledWith(
        'user-123',
        'states',
        expect.objectContaining({
          gameType: 'states',
          correctAnswers: 1,
          wrongAnswers: 0
        })
      )
    })
  })

  describe('Loading States', () => {
    it('should set isSaving to true during save operation', async () => {
      let resolvePromise: () => void
      const savePromise = new Promise<void>((resolve) => {
        resolvePromise = resolve
      })
      
      mockGameProgressService.saveGameProgress.mockReturnValue(savePromise)

      const options: UseGameProgressOptions = {
        ...baseOptions,
        isAuthenticated: true,
        user: mockUser,
        correctScore: 1,
        wrongScore: 0
      }

      const { result } = renderHook(() => useGameProgress(options))

      // Should be saving initially
      await new Promise(resolve => setTimeout(resolve, 50))
      expect(result.current.isSaving).toBe(true)

      // Resolve the promise
      resolvePromise!()
      await savePromise

      // Should not be saving after completion
      await new Promise(resolve => setTimeout(resolve, 50))
      expect(result.current.isSaving).toBe(false)
    })
  })
})