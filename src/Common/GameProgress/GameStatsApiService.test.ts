import { describe, it, expect, beforeEach, vi } from 'vitest'
import { gameStatsApiService, GameStatsApiError } from './GameStatsApiService'
import { AuthErrorType, RFC9457Error } from '../types'

// Mock fetch globally
global.fetch = vi.fn()

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
})

describe('GameStatsApiService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLocalStorage.getItem.mockClear()
  })

  describe('saveGameSession', () => {
    it('should save game session successfully', async () => {
      // Mock valid token
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'auth_access_token') return 'valid-token'
        if (key === 'auth_token_expiry') return (Date.now() + 3600000).toString()
        return null
      })

      const mockResponse = {
        id: '123',
        gameType: 'countries',
        correctAnswers: 5,
        wrongAnswers: 2,
        accuracy: 71.43,
        sessionStartTime: '2023-01-01T10:00:00Z',
        sessionEndTime: '2023-01-01T10:05:00Z',
        sessionDurationMs: 300000,
        createdAt: '2023-01-01T10:05:00Z'
      }

      ;(fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const sessionRequest = {
        gameType: 'countries',
        correctAnswers: 5,
        wrongAnswers: 2,
        sessionStartTime: '2023-01-01T10:00:00Z',
        sessionEndTime: '2023-01-01T10:05:00Z'
      }

      const result = await gameStatsApiService.saveGameSession(sessionRequest)

      expect(result).toEqual(mockResponse)
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/game-stats',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer valid-token',
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify(sessionRequest)
        })
      )
    })

    it('should throw error when no access token', async () => {
      mockLocalStorage.getItem.mockReturnValue(null)

      const sessionRequest = {
        gameType: 'countries',
        correctAnswers: 5,
        wrongAnswers: 2,
        sessionStartTime: '2023-01-01T10:00:00Z',
        sessionEndTime: '2023-01-01T10:05:00Z'
      }

      await expect(gameStatsApiService.saveGameSession(sessionRequest))
        .rejects.toThrow(GameStatsApiError)
      
      await expect(gameStatsApiService.saveGameSession(sessionRequest))
        .rejects.toMatchObject({
          type: AuthErrorType.TOKEN_EXPIRED,
          message: 'No access token available. Please log in.'
        })
    })

    it('should handle RFC 9457 token expiration error', async () => {
      // Mock valid token
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'auth_access_token') return 'expired-token'
        if (key === 'auth_token_expiry') return (Date.now() + 3600000).toString()
        return null
      })

      const rfc9457Error: RFC9457Error = {
        type: 'http://localhost:5000/problems/authentication-error',
        title: 'Authentication Error',
        status: 401,
        detail: 'Token has expired',
        instance: '/api/game-stats'
      }

      ;(fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => rfc9457Error,
      })

      const sessionRequest = {
        gameType: 'countries',
        correctAnswers: 5,
        wrongAnswers: 2,
        sessionStartTime: '2023-01-01T10:00:00Z',
        sessionEndTime: '2023-01-01T10:05:00Z'
      }

      await expect(gameStatsApiService.saveGameSession(sessionRequest))
        .rejects.toMatchObject({
          type: AuthErrorType.TOKEN_EXPIRED,
          message: 'Token has expired'
        })
    })

    it('should handle RFC 9457 network error', async () => {
      // Mock valid token
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'auth_access_token') return 'valid-token'
        if (key === 'auth_token_expiry') return (Date.now() + 3600000).toString()
        return null
      })

      const rfc9457Error: RFC9457Error = {
        type: 'about:blank',
        title: 'Internal Server Error',
        status: 500,
        detail: 'An unexpected error occurred',
        instance: '/api/game-stats'
      }

      ;(fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => rfc9457Error,
      })

      const sessionRequest = {
        gameType: 'countries',
        correctAnswers: 5,
        wrongAnswers: 2,
        sessionStartTime: '2023-01-01T10:00:00Z',
        sessionEndTime: '2023-01-01T10:05:00Z'
      }

      await expect(gameStatsApiService.saveGameSession(sessionRequest))
        .rejects.toMatchObject({
          type: AuthErrorType.NETWORK_ERROR,
          message: 'An unexpected error occurred'
        })
    })
  })

  describe('getUserStats', () => {
    it('should get user stats successfully', async () => {
      // Mock valid token
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'auth_access_token') return 'valid-token'
        if (key === 'auth_token_expiry') return (Date.now() + 3600000).toString()
        return null
      })

      const mockResponse = {
        totalGames: 10,
        totalCorrectAnswers: 75,
        totalWrongAnswers: 25,
        bestStreak: 8,
        averageAccuracy: 75.0,
        gameTypeStats: {
          countries: {
            games: 5,
            correctAnswers: 40,
            wrongAnswers: 10,
            accuracy: 80.0,
            bestStreak: 6
          }
        }
      }

      ;(fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await gameStatsApiService.getUserStats()

      expect(result).toEqual(mockResponse)
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/game-stats/me',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer valid-token'
          })
        })
      )
    })

    it('should handle RFC 9457 token expiration error', async () => {
      // Mock valid token
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'auth_access_token') return 'expired-token'
        if (key === 'auth_token_expiry') return (Date.now() + 3600000).toString()
        return null
      })

      const rfc9457Error: RFC9457Error = {
        type: 'http://localhost:5000/problems/authentication-error',
        title: 'Authentication Error',
        status: 401,
        detail: 'Token has expired',
        instance: '/api/game-stats/me'
      }

      ;(fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => rfc9457Error,
      })

      await expect(gameStatsApiService.getUserStats())
        .rejects.toMatchObject({
          type: AuthErrorType.TOKEN_EXPIRED,
          message: 'Token has expired'
        })
    })
  })

  describe('getUserGameHistory', () => {
    it('should get user game history successfully', async () => {
      // Mock valid token
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'auth_access_token') return 'valid-token'
        if (key === 'auth_token_expiry') return (Date.now() + 3600000).toString()
        return null
      })

      const mockResponse = {
        sessions: [
          {
            id: '123',
            gameType: 'countries',
            correctAnswers: 5,
            wrongAnswers: 2,
            accuracy: 71.43,
            sessionStartTime: '2023-01-01T10:00:00Z',
            sessionEndTime: '2023-01-01T10:05:00Z',
            sessionDurationMs: 300000,
            createdAt: '2023-01-01T10:05:00Z'
          }
        ],
        totalCount: 1,
        page: 1,
        pageSize: 20,
        hasNextPage: false
      }

      ;(fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await gameStatsApiService.getUserGameHistory(1, 20)

      expect(result).toEqual(mockResponse)
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/game-stats/me/history?page=1&pageSize=20',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer valid-token'
          })
        })
      )
    })

    it('should handle RFC 9457 authorization error', async () => {
      // Mock valid token
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'auth_access_token') return 'invalid-token'
        if (key === 'auth_token_expiry') return (Date.now() + 3600000).toString()
        return null
      })

      const rfc9457Error: RFC9457Error = {
        type: 'http://localhost:5000/problems/authorization-error',
        title: 'Authorization Error',
        status: 403,
        detail: 'Access denied',
        instance: '/api/game-stats/me/history'
      }

      ;(fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => rfc9457Error,
      })

      await expect(gameStatsApiService.getUserGameHistory())
        .rejects.toMatchObject({
          type: AuthErrorType.TOKEN_EXPIRED,
          message: 'Access denied'
        })
    })
  })

  describe('migrateAnonymousProgress', () => {
    it('should migrate anonymous progress successfully', async () => {
      // Mock valid token
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'auth_access_token') return 'valid-token'
        if (key === 'auth_token_expiry') return (Date.now() + 3600000).toString()
        return null
      })

      ;(fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      })

      const sessions = [
        {
          gameType: 'countries',
          correctAnswers: 5,
          wrongAnswers: 2,
          sessionStartTime: '2023-01-01T10:00:00Z',
          sessionEndTime: '2023-01-01T10:05:00Z',
          timestamp: '2023-01-01T10:05:00Z'
        }
      ]

      await gameStatsApiService.migrateAnonymousProgress(sessions)

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/game-stats/migrate',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer valid-token',
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify({ sessions })
        })
      )
    })

    it('should handle RFC 9457 validation error', async () => {
      // Mock valid token
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'auth_access_token') return 'valid-token'
        if (key === 'auth_token_expiry') return (Date.now() + 3600000).toString()
        return null
      })

      const rfc9457Error: RFC9457Error = {
        type: 'http://localhost:5000/problems/validation-error',
        title: 'Validation Error',
        status: 422,
        detail: 'Invalid session data',
        instance: '/api/game-stats/migrate',
        errors: {
          'sessions[0].gameType': ['Game type is required'],
          'sessions[0].correctAnswers': ['Must be a positive number']
        }
      }

      ;(fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 422,
        json: async () => rfc9457Error,
      })

      const sessions = [
        {
          gameType: '',
          correctAnswers: -1,
          wrongAnswers: 2,
          sessionStartTime: '2023-01-01T10:00:00Z',
          sessionEndTime: '2023-01-01T10:05:00Z',
          timestamp: '2023-01-01T10:05:00Z'
        }
      ]

      await expect(gameStatsApiService.migrateAnonymousProgress(sessions))
        .rejects.toMatchObject({
          type: AuthErrorType.VALIDATION_ERROR,
          message: 'Invalid session data',
          details: expect.objectContaining({
            errors: {
              'sessions[0].gameType': ['Game type is required'],
              'sessions[0].correctAnswers': ['Must be a positive number']
            }
          })
        })
    })

    it('should handle empty sessions array', async () => {
      // Mock valid token
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'auth_access_token') return 'valid-token'
        if (key === 'auth_token_expiry') return (Date.now() + 3600000).toString()
        return null
      })

      await gameStatsApiService.migrateAnonymousProgress([])

      // Should not make any API call
      expect(fetch).not.toHaveBeenCalled()
    })
  })

  describe('isAuthenticated', () => {
    it('should return true when token is valid', () => {
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'auth_access_token') return 'valid-token'
        if (key === 'auth_token_expiry') return (Date.now() + 3600000).toString()
        return null
      })

      expect(gameStatsApiService.isAuthenticated()).toBe(true)
    })

    it('should return false when no token', () => {
      mockLocalStorage.getItem.mockReturnValue(null)

      expect(gameStatsApiService.isAuthenticated()).toBe(false)
    })

    it('should return false when token is expired', () => {
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'auth_access_token') return 'expired-token'
        if (key === 'auth_token_expiry') return (Date.now() - 3600000).toString() // Expired
        return null
      })

      expect(gameStatsApiService.isAuthenticated()).toBe(false)
    })
  })
})