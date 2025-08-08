import { renderHook } from '@testing-library/react'
import { useGameProgress, UseGameProgressOptions } from '../useGameProgress'
import { gameProgressService } from '../../GameProgress/GameProgressService'
import { useOfflineDetector } from '../../Network/useOfflineDetector'
import { useSaveErrorHandler } from '../../ErrorHandling/useSaveErrorHandler'
import { GameType, User } from '../../types'
import { vi, describe, it, expect, beforeEach } from 'vitest'

// Mock dependencies
vi.mock('../../GameProgress/GameProgressService')
vi.mock('../../Network/useOfflineDetector')
vi.mock('../../ErrorHandling/useSaveErrorHandler')

const mockGameProgressService = gameProgressService as any
const mockUseOfflineDetector = useOfflineDetector as any
const mockUseSaveErrorHandler = useSaveErrorHandler as any

describe('useGameProgress - Simple Tests', () => {
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

    // Mock useSaveErrorHandler
    mockUseSaveErrorHandler.mockReturnValue({
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
    })
  })

  it('should initialize with correct default values', () => {
    const { result } = renderHook(() => useGameProgress(baseOptions))

    expect(result.current.isSaving).toBe(false)
    expect(result.current.saveError).toBe(null)
    expect(typeof result.current.autoSaveProgress).toBe('function')
  })

  it('should not save when scores are zero', () => {
    renderHook(() => useGameProgress(baseOptions))

    expect(mockGameProgressService.saveGameProgress).not.toHaveBeenCalled()
    expect(mockGameProgressService.saveTempSession).not.toHaveBeenCalled()
  })

  it('should provide autoSaveProgress function', async () => {
    const { result } = renderHook(() => useGameProgress(baseOptions))

    // Should not throw and should be callable
    await expect(result.current.autoSaveProgress()).resolves.toBeUndefined()
  })

  it('should work with different game types', () => {
    const flagsOptions: UseGameProgressOptions = {
      ...baseOptions,
      gameType: 'flags',
      gameSession: {
        ...baseOptions.gameSession,
        gameType: 'flags'
      }
    }

    const { result } = renderHook(() => useGameProgress(flagsOptions))

    expect(result.current.isSaving).toBe(false)
    expect(result.current.saveError).toBe(null)
    expect(typeof result.current.autoSaveProgress).toBe('function')
  })

  it('should handle authenticated users', () => {
    const authOptions: UseGameProgressOptions = {
      ...baseOptions,
      isAuthenticated: true,
      user: mockUser
    }

    const { result } = renderHook(() => useGameProgress(authOptions))

    expect(result.current.isSaving).toBe(false)
    expect(result.current.saveError).toBe(null)
    expect(typeof result.current.autoSaveProgress).toBe('function')
  })
})