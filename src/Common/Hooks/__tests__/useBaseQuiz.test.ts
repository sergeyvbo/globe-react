import { renderHook, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { useBaseQuiz } from '../useBaseQuiz'
import { GameType, User } from '../../types'
import { useGameProgress } from '../useGameProgress'
import { useBeforeUnload } from '../useBeforeUnload'

// Mock the dependencies
vi.mock('../useGameProgress')
vi.mock('../useBeforeUnload')

const mockUseGameProgress = vi.mocked(useGameProgress)
const mockUseBeforeUnload = vi.mocked(useBeforeUnload)

describe('useBaseQuiz', () => {
  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    provider: 'email',
    createdAt: new Date()
  }

  const mockGameProgress = {
    isSaving: false,
    saveError: null,
    autoSaveProgress: vi.fn().mockResolvedValue(undefined)
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseGameProgress.mockReturnValue(mockGameProgress)
    mockUseBeforeUnload.mockReturnValue(undefined)
  })

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => 
        useBaseQuiz({
          gameType: 'countries',
          isAuthenticated: true,
          user: mockUser
        })
      )

      expect(result.current.correctScore).toBe(0)
      expect(result.current.wrongScore).toBe(0)
      expect(result.current.disabled).toBe(false)
      expect(result.current.gameSession.gameType).toBe('countries')
      expect(result.current.gameSession.correctAnswers).toBe(0)
      expect(result.current.gameSession.wrongAnswers).toBe(0)
      expect(result.current.gameSession.sessionStartTime).toBeInstanceOf(Date)
    })

    it('should initialize with different game types', () => {
      const gameTypes: GameType[] = ['countries', 'flags', 'states']
      
      gameTypes.forEach(gameType => {
        const { result } = renderHook(() => 
          useBaseQuiz({
            gameType,
            isAuthenticated: true,
            user: mockUser
          })
        )

        expect(result.current.gameSession.gameType).toBe(gameType)
      })
    })

    it('should work with unauthenticated users', () => {
      const { result } = renderHook(() => 
        useBaseQuiz({
          gameType: 'flags',
          isAuthenticated: false,
          user: null
        })
      )

      expect(result.current.correctScore).toBe(0)
      expect(result.current.wrongScore).toBe(0)
      expect(result.current.gameSession.gameType).toBe('flags')
    })
  })

  describe('useGameProgress integration', () => {
    it('should call useGameProgress with correct options', () => {
      renderHook(() => 
        useBaseQuiz({
          gameType: 'states',
          isAuthenticated: true,
          user: mockUser
        })
      )

      expect(mockUseGameProgress).toHaveBeenCalledWith({
        gameType: 'states',
        correctScore: 0,
        wrongScore: 0,
        isAuthenticated: true,
        user: mockUser,
        gameSession: expect.objectContaining({
          gameType: 'states',
          correctAnswers: 0,
          wrongAnswers: 0,
          sessionStartTime: expect.any(Date)
        })
      })
    })

    it('should update useGameProgress when scores change', async () => {
      const { result } = renderHook(() => 
        useBaseQuiz({
          gameType: 'countries',
          isAuthenticated: true,
          user: mockUser
        })
      )

      await act(async () => {
        await result.current.actions.onCorrectAnswer()
      })

      // Check that useGameProgress was called with updated scores
      expect(mockUseGameProgress).toHaveBeenLastCalledWith({
        gameType: 'countries',
        correctScore: 1,
        wrongScore: 0,
        isAuthenticated: true,
        user: mockUser,
        gameSession: expect.objectContaining({
          correctAnswers: 1,
          wrongAnswers: 0
        })
      })
    })
  })

  describe('useBeforeUnload integration', () => {
    it('should call useBeforeUnload with correct options initially', () => {
      renderHook(() => 
        useBaseQuiz({
          gameType: 'flags',
          isAuthenticated: false,
          user: null
        })
      )

      expect(mockUseBeforeUnload).toHaveBeenCalledWith({
        shouldSave: false, // No scores yet
        gameSession: expect.objectContaining({
          gameType: 'flags',
          correctAnswers: 0,
          wrongAnswers: 0
        }),
        isAuthenticated: false,
        user: null,
        correctScore: 0,
        wrongScore: 0,
        gameType: 'flags'
      })
    })

    it('should update useBeforeUnload when there are scores', async () => {
      const { result } = renderHook(() => 
        useBaseQuiz({
          gameType: 'countries',
          isAuthenticated: true,
          user: mockUser
        })
      )

      await act(async () => {
        await result.current.actions.onCorrectAnswer()
      })

      expect(mockUseBeforeUnload).toHaveBeenLastCalledWith({
        shouldSave: true, // Now has scores
        gameSession: expect.objectContaining({
          correctAnswers: 1,
          wrongAnswers: 0
        }),
        isAuthenticated: true,
        user: mockUser,
        correctScore: 1,
        wrongScore: 0,
        gameType: 'countries'
      })
    })
  })

  describe('quiz actions', () => {
    describe('onCorrectAnswer', () => {
      it('should increment correct score and set disabled', async () => {
        const { result } = renderHook(() => 
          useBaseQuiz({
            gameType: 'countries',
            isAuthenticated: true,
            user: mockUser
          })
        )

        await act(async () => {
          await result.current.actions.onCorrectAnswer()
        })

        expect(result.current.correctScore).toBe(1)
        expect(result.current.disabled).toBe(true)
        expect(mockGameProgress.autoSaveProgress).toHaveBeenCalled()
      })

      it('should handle multiple correct answers', async () => {
        const { result } = renderHook(() => 
          useBaseQuiz({
            gameType: 'flags',
            isAuthenticated: true,
            user: mockUser
          })
        )

        await act(async () => {
          await result.current.actions.onCorrectAnswer()
          await result.current.actions.onCorrectAnswer()
          await result.current.actions.onCorrectAnswer()
        })

        expect(result.current.correctScore).toBe(3)
        expect(mockGameProgress.autoSaveProgress).toHaveBeenCalledTimes(3)
      })

      it('should handle autoSaveProgress errors gracefully', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
        mockGameProgress.autoSaveProgress.mockRejectedValueOnce(new Error('Save failed'))

        const { result } = renderHook(() => 
          useBaseQuiz({
            gameType: 'states',
            isAuthenticated: true,
            user: mockUser
          })
        )

        await act(async () => {
          await result.current.actions.onCorrectAnswer()
        })

        expect(result.current.correctScore).toBe(1)
        expect(consoleSpy).toHaveBeenCalledWith(
          'Failed to save progress after correct answer:', 
          expect.any(Error)
        )

        consoleSpy.mockRestore()
      })
    })

    describe('onWrongAnswer', () => {
      it('should increment wrong score and set disabled', async () => {
        const { result } = renderHook(() => 
          useBaseQuiz({
            gameType: 'countries',
            isAuthenticated: true,
            user: mockUser
          })
        )

        await act(async () => {
          await result.current.actions.onWrongAnswer()
        })

        expect(result.current.wrongScore).toBe(1)
        expect(result.current.disabled).toBe(true)
        expect(mockGameProgress.autoSaveProgress).toHaveBeenCalled()
      })

      it('should handle multiple wrong answers', async () => {
        const { result } = renderHook(() => 
          useBaseQuiz({
            gameType: 'flags',
            isAuthenticated: true,
            user: mockUser
          })
        )

        await act(async () => {
          await result.current.actions.onWrongAnswer()
          await result.current.actions.onWrongAnswer()
        })

        expect(result.current.wrongScore).toBe(2)
        expect(mockGameProgress.autoSaveProgress).toHaveBeenCalledTimes(2)
      })

      it('should handle autoSaveProgress errors gracefully', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
        mockGameProgress.autoSaveProgress.mockRejectedValueOnce(new Error('Save failed'))

        const { result } = renderHook(() => 
          useBaseQuiz({
            gameType: 'states',
            isAuthenticated: true,
            user: mockUser
          })
        )

        await act(async () => {
          await result.current.actions.onWrongAnswer()
        })

        expect(result.current.wrongScore).toBe(1)
        expect(consoleSpy).toHaveBeenCalledWith(
          'Failed to save progress after wrong answer:', 
          expect.any(Error)
        )

        consoleSpy.mockRestore()
      })
    })

    describe('resetGame', () => {
      it('should reset disabled state', async () => {
        const { result } = renderHook(() => 
          useBaseQuiz({
            gameType: 'countries',
            isAuthenticated: true,
            user: mockUser
          })
        )

        // First set disabled to true
        await act(async () => {
          await result.current.actions.onCorrectAnswer()
        })
        expect(result.current.disabled).toBe(true)

        // Then reset
        act(() => {
          result.current.actions.resetGame()
        })

        expect(result.current.disabled).toBe(false)
      })

      it('should not affect scores', async () => {
        const { result } = renderHook(() => 
          useBaseQuiz({
            gameType: 'flags',
            isAuthenticated: true,
            user: mockUser
          })
        )

        await act(async () => {
          await result.current.actions.onCorrectAnswer()
          await result.current.actions.onWrongAnswer()
        })

        act(() => {
          result.current.actions.resetGame()
        })

        expect(result.current.correctScore).toBe(1)
        expect(result.current.wrongScore).toBe(1)
        expect(result.current.disabled).toBe(false)
      })
    })

    describe('setDisabled', () => {
      it('should set disabled state to true', () => {
        const { result } = renderHook(() => 
          useBaseQuiz({
            gameType: 'states',
            isAuthenticated: true,
            user: mockUser
          })
        )

        act(() => {
          result.current.actions.setDisabled(true)
        })

        expect(result.current.disabled).toBe(true)
      })

      it('should set disabled state to false', async () => {
        const { result } = renderHook(() => 
          useBaseQuiz({
            gameType: 'countries',
            isAuthenticated: true,
            user: mockUser
          })
        )

        // First set disabled to true
        await act(async () => {
          await result.current.actions.onCorrectAnswer()
        })
        expect(result.current.disabled).toBe(true)

        // Then set to false
        act(() => {
          result.current.actions.setDisabled(false)
        })

        expect(result.current.disabled).toBe(false)
      })
    })

    describe('resetScores', () => {
      it('should reset all scores and game session', async () => {
        const { result } = renderHook(() => 
          useBaseQuiz({
            gameType: 'flags',
            isAuthenticated: true,
            user: mockUser
          })
        )

        // First add some scores
        await act(async () => {
          await result.current.actions.onCorrectAnswer()
          await result.current.actions.onWrongAnswer()
          await result.current.actions.onCorrectAnswer()
        })

        expect(result.current.correctScore).toBe(2)
        expect(result.current.wrongScore).toBe(1)

        // Then reset
        act(() => {
          result.current.actions.resetScores()
        })

        expect(result.current.correctScore).toBe(0)
        expect(result.current.wrongScore).toBe(0)
        expect(result.current.gameSession.correctAnswers).toBe(0)
        expect(result.current.gameSession.wrongAnswers).toBe(0)
        expect(result.current.gameSession.sessionStartTime).toBeInstanceOf(Date)
      })

      it('should not affect disabled state', async () => {
        const { result } = renderHook(() => 
          useBaseQuiz({
            gameType: 'countries',
            isAuthenticated: true,
            user: mockUser
          })
        )

        await act(async () => {
          await result.current.actions.onCorrectAnswer()
        })
        expect(result.current.disabled).toBe(true)

        act(() => {
          result.current.actions.resetScores()
        })

        expect(result.current.disabled).toBe(true) // Should remain disabled
      })
    })
  })

  describe('game session updates', () => {
    it('should update game session when scores change', async () => {
      const { result } = renderHook(() => 
        useBaseQuiz({
          gameType: 'states',
          isAuthenticated: true,
          user: mockUser
        })
      )

      await act(async () => {
        await result.current.actions.onCorrectAnswer()
        await result.current.actions.onWrongAnswer()
      })

      expect(result.current.gameSession.correctAnswers).toBe(1)
      expect(result.current.gameSession.wrongAnswers).toBe(1)
      expect(result.current.gameSession.gameType).toBe('states')
    })

    it('should maintain session start time', async () => {
      const { result } = renderHook(() => 
        useBaseQuiz({
          gameType: 'flags',
          isAuthenticated: true,
          user: mockUser
        })
      )

      const initialStartTime = result.current.gameSession.sessionStartTime

      await act(async () => {
        await result.current.actions.onCorrectAnswer()
      })

      expect(result.current.gameSession.sessionStartTime).toBe(initialStartTime)
    })
  })

  describe('gameProgress return value', () => {
    it('should return gameProgress object with correct structure', () => {
      const { result } = renderHook(() => 
        useBaseQuiz({
          gameType: 'countries',
          isAuthenticated: true,
          user: mockUser
        })
      )

      expect(result.current.gameProgress).toEqual({
        isSaving: false,
        saveError: null,
        autoSaveProgress: expect.any(Function)
      })
    })

    it('should reflect gameProgress state changes', () => {
      const updatedGameProgress = {
        isSaving: true,
        saveError: 'Network error',
        autoSaveProgress: vi.fn()
      }
      
      mockUseGameProgress.mockReturnValue(updatedGameProgress)

      const { result } = renderHook(() => 
        useBaseQuiz({
          gameType: 'flags',
          isAuthenticated: true,
          user: mockUser
        })
      )

      expect(result.current.gameProgress).toEqual(updatedGameProgress)
    })
  })
})