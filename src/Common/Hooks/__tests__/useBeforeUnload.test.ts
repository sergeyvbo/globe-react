import { renderHook } from '@testing-library/react'
import { useBeforeUnload, UseBeforeUnloadOptions } from '../useBeforeUnload'
import { gameProgressService, GameSession } from '../../GameProgress/GameProgressService'
import { GameType, User } from '../../types'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

// Mock the gameProgressService
vi.mock('../../GameProgress/GameProgressService')

const mockGameProgressService = gameProgressService as any

describe('useBeforeUnload', () => {
  const mockUser: User = {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    provider: 'email',
    createdAt: new Date()
  }

  const mockGameSession: GameSession = {
    gameType: 'countries' as GameType,
    correctAnswers: 0,
    wrongAnswers: 0,
    sessionStartTime: new Date('2023-01-01T10:00:00Z'),
    sessionEndTime: undefined
  }

  const defaultOptions: UseBeforeUnloadOptions = {
    shouldSave: true,
    gameSession: mockGameSession,
    isAuthenticated: true,
    user: mockUser,
    correctScore: 5,
    wrongScore: 2,
    gameType: 'countries' as GameType
  }

  let addEventListenerSpy: jest.SpyInstance
  let removeEventListenerSpy: jest.SpyInstance

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock window event listeners
    addEventListenerSpy = vi.spyOn(window, 'addEventListener')
    removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')
    
    // Setup default mock implementations
    mockGameProgressService.saveGameProgress = vi.fn().mockResolvedValue(undefined)
    mockGameProgressService.saveTempSession = vi.fn().mockImplementation(() => {})
  })

  afterEach(() => {
    addEventListenerSpy.mockRestore()
    removeEventListenerSpy.mockRestore()
  })

  describe('Event Listener Management', () => {
    it('should add beforeunload event listener on mount', () => {
      renderHook(() => useBeforeUnload(defaultOptions))

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'beforeunload',
        expect.any(Function)
      )
    })

    it('should remove beforeunload event listener on unmount', () => {
      const { unmount } = renderHook(() => useBeforeUnload(defaultOptions))

      unmount()

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'beforeunload',
        expect.any(Function)
      )
    })

    it('should update event listener when dependencies change', () => {
      const { rerender } = renderHook(
        (props) => useBeforeUnload(props),
        { initialProps: defaultOptions }
      )

      // Clear initial calls
      addEventListenerSpy.mockClear()
      removeEventListenerSpy.mockClear()

      // Update props
      const updatedOptions = {
        ...defaultOptions,
        correctScore: 10
      }
      rerender(updatedOptions)

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'beforeunload',
        expect.any(Function)
      )
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'beforeunload',
        expect.any(Function)
      )
    })
  })

  describe('Save Logic for Authenticated Users', () => {
    it('should save progress for authenticated users with scores', () => {
      renderHook(() => useBeforeUnload(defaultOptions))

      // Get the beforeunload handler
      const beforeUnloadHandler = addEventListenerSpy.mock.calls[0][1]
      
      // Trigger beforeunload
      beforeUnloadHandler()

      expect(mockGameProgressService.saveGameProgress).toHaveBeenCalledWith(
        mockUser.id,
        'countries',
        expect.objectContaining({
          gameType: 'countries',
          correctAnswers: 5,
          wrongAnswers: 2,
          sessionStartTime: mockGameSession.sessionStartTime,
          sessionEndTime: expect.any(Date)
        })
      )
    })

    it('should not call saveTempSession for authenticated users', () => {
      renderHook(() => useBeforeUnload(defaultOptions))

      const beforeUnloadHandler = addEventListenerSpy.mock.calls[0][1]
      beforeUnloadHandler()

      expect(mockGameProgressService.saveTempSession).not.toHaveBeenCalled()
    })

    it('should handle saveGameProgress errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockGameProgressService.saveGameProgress.mockRejectedValue(new Error('Save failed'))

      renderHook(() => useBeforeUnload(defaultOptions))

      const beforeUnloadHandler = addEventListenerSpy.mock.calls[0][1]
      beforeUnloadHandler()

      // Should not throw error
      expect(() => beforeUnloadHandler()).not.toThrow()
      
      consoleSpy.mockRestore()
    })
  })

  describe('Save Logic for Unauthenticated Users', () => {
    const unauthenticatedOptions: UseBeforeUnloadOptions = {
      ...defaultOptions,
      isAuthenticated: false,
      user: null
    }

    it('should save to temp session for unauthenticated users', () => {
      renderHook(() => useBeforeUnload(unauthenticatedOptions))

      const beforeUnloadHandler = addEventListenerSpy.mock.calls[0][1]
      beforeUnloadHandler()

      expect(mockGameProgressService.saveTempSession).toHaveBeenCalledWith(
        expect.objectContaining({
          gameType: 'countries',
          correctAnswers: 5,
          wrongAnswers: 2,
          sessionStartTime: mockGameSession.sessionStartTime,
          sessionEndTime: expect.any(Date)
        })
      )
    })

    it('should not call saveGameProgress for unauthenticated users', () => {
      renderHook(() => useBeforeUnload(unauthenticatedOptions))

      const beforeUnloadHandler = addEventListenerSpy.mock.calls[0][1]
      beforeUnloadHandler()

      expect(mockGameProgressService.saveGameProgress).not.toHaveBeenCalled()
    })
  })

  describe('Conditional Save Logic', () => {
    it('should not save when shouldSave is false', () => {
      const noSaveOptions: UseBeforeUnloadOptions = {
        ...defaultOptions,
        shouldSave: false
      }

      renderHook(() => useBeforeUnload(noSaveOptions))

      const beforeUnloadHandler = addEventListenerSpy.mock.calls[0][1]
      beforeUnloadHandler()

      expect(mockGameProgressService.saveGameProgress).not.toHaveBeenCalled()
      expect(mockGameProgressService.saveTempSession).not.toHaveBeenCalled()
    })

    it('should not save when both scores are zero', () => {
      const zeroScoreOptions: UseBeforeUnloadOptions = {
        ...defaultOptions,
        correctScore: 0,
        wrongScore: 0
      }

      renderHook(() => useBeforeUnload(zeroScoreOptions))

      const beforeUnloadHandler = addEventListenerSpy.mock.calls[0][1]
      beforeUnloadHandler()

      expect(mockGameProgressService.saveGameProgress).not.toHaveBeenCalled()
      expect(mockGameProgressService.saveTempSession).not.toHaveBeenCalled()
    })

    it('should save when only correctScore is greater than zero', () => {
      const correctOnlyOptions: UseBeforeUnloadOptions = {
        ...defaultOptions,
        correctScore: 3,
        wrongScore: 0
      }

      renderHook(() => useBeforeUnload(correctOnlyOptions))

      const beforeUnloadHandler = addEventListenerSpy.mock.calls[0][1]
      beforeUnloadHandler()

      expect(mockGameProgressService.saveGameProgress).toHaveBeenCalled()
    })

    it('should save when only wrongScore is greater than zero', () => {
      const wrongOnlyOptions: UseBeforeUnloadOptions = {
        ...defaultOptions,
        correctScore: 0,
        wrongScore: 3
      }

      renderHook(() => useBeforeUnload(wrongOnlyOptions))

      const beforeUnloadHandler = addEventListenerSpy.mock.calls[0][1]
      beforeUnloadHandler()

      expect(mockGameProgressService.saveGameProgress).toHaveBeenCalled()
    })
  })

  describe('Different Game Types', () => {
    it('should handle flags game type correctly', () => {
      const flagsOptions: UseBeforeUnloadOptions = {
        ...defaultOptions,
        gameType: 'flags' as GameType,
        gameSession: {
          ...mockGameSession,
          gameType: 'flags' as GameType
        }
      }

      renderHook(() => useBeforeUnload(flagsOptions))

      const beforeUnloadHandler = addEventListenerSpy.mock.calls[0][1]
      beforeUnloadHandler()

      expect(mockGameProgressService.saveGameProgress).toHaveBeenCalledWith(
        mockUser.id,
        'flags',
        expect.objectContaining({
          gameType: 'flags'
        })
      )
    })

    it('should handle states game type correctly', () => {
      const statesOptions: UseBeforeUnloadOptions = {
        ...defaultOptions,
        gameType: 'states' as GameType,
        gameSession: {
          ...mockGameSession,
          gameType: 'states' as GameType
        }
      }

      renderHook(() => useBeforeUnload(statesOptions))

      const beforeUnloadHandler = addEventListenerSpy.mock.calls[0][1]
      beforeUnloadHandler()

      expect(mockGameProgressService.saveGameProgress).toHaveBeenCalledWith(
        mockUser.id,
        'states',
        expect.objectContaining({
          gameType: 'states'
        })
      )
    })
  })

  describe('Session Data Integrity', () => {
    it('should preserve original session data and update scores', () => {
      const sessionWithData: GameSession = {
        gameType: 'countries' as GameType,
        correctAnswers: 10, // Original values
        wrongAnswers: 5,    // Original values
        sessionStartTime: new Date('2023-01-01T10:00:00Z'),
        sessionEndTime: undefined,
        sessionDuration: 300
      }

      const optionsWithSession: UseBeforeUnloadOptions = {
        ...defaultOptions,
        gameSession: sessionWithData,
        correctScore: 15, // Current values
        wrongScore: 8     // Current values
      }

      renderHook(() => useBeforeUnload(optionsWithSession))

      const beforeUnloadHandler = addEventListenerSpy.mock.calls[0][1]
      beforeUnloadHandler()

      expect(mockGameProgressService.saveGameProgress).toHaveBeenCalledWith(
        mockUser.id,
        'countries',
        expect.objectContaining({
          gameType: 'countries',
          correctAnswers: 15, // Should use current scores
          wrongAnswers: 8,    // Should use current scores
          sessionStartTime: sessionWithData.sessionStartTime, // Should preserve original
          sessionDuration: 300, // Should preserve original
          sessionEndTime: expect.any(Date) // Should set new end time
        })
      )
    })

    it('should set sessionEndTime to current date', () => {
      const beforeTest = new Date()
      
      renderHook(() => useBeforeUnload(defaultOptions))

      const beforeUnloadHandler = addEventListenerSpy.mock.calls[0][1]
      beforeUnloadHandler()

      const afterTest = new Date()
      const savedSession = mockGameProgressService.saveGameProgress.mock.calls[0][2]
      
      expect(savedSession.sessionEndTime).toBeInstanceOf(Date)
      expect(savedSession.sessionEndTime!.getTime()).toBeGreaterThanOrEqual(beforeTest.getTime())
      expect(savedSession.sessionEndTime!.getTime()).toBeLessThanOrEqual(afterTest.getTime())
    })
  })

  describe('Error Handling', () => {
    it('should handle saveTempSession errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockGameProgressService.saveTempSession.mockImplementation(() => {
        throw new Error('Temp save failed')
      })

      const unauthenticatedOptions: UseBeforeUnloadOptions = {
        ...defaultOptions,
        isAuthenticated: false,
        user: null
      }

      renderHook(() => useBeforeUnload(unauthenticatedOptions))

      const beforeUnloadHandler = addEventListenerSpy.mock.calls[0][1]
      
      // Should not throw error
      expect(() => beforeUnloadHandler()).not.toThrow()
      
      consoleSpy.mockRestore()
    })

    it('should log appropriate error messages', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const networkError = new Error('Network error')
      mockGameProgressService.saveGameProgress.mockRejectedValue(networkError)

      renderHook(() => useBeforeUnload(defaultOptions))

      const beforeUnloadHandler = addEventListenerSpy.mock.calls[0][1]
      beforeUnloadHandler()

      // Wait for async operation to complete
      await new Promise(resolve => setTimeout(resolve, 10))
      
      expect(consoleSpy).toHaveBeenCalledWith(networkError)
      
      consoleSpy.mockRestore()
    })
  })

  describe('Ref Updates', () => {
    it('should use latest values from ref to avoid stale closures', () => {
      const { rerender } = renderHook(
        (props) => useBeforeUnload(props),
        { initialProps: defaultOptions }
      )

      // Update scores
      const updatedOptions = {
        ...defaultOptions,
        correctScore: 20,
        wrongScore: 10
      }
      rerender(updatedOptions)

      // Get the latest beforeunload handler
      const beforeUnloadHandler = addEventListenerSpy.mock.calls[
        addEventListenerSpy.mock.calls.length - 1
      ][1]
      
      beforeUnloadHandler()

      expect(mockGameProgressService.saveGameProgress).toHaveBeenCalledWith(
        mockUser.id,
        'countries',
        expect.objectContaining({
          correctAnswers: 20, // Should use updated values
          wrongAnswers: 10    // Should use updated values
        })
      )
    })
  })
})