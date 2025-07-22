import { describe, it, expect, beforeEach, vi } from 'vitest'
import { gameStatsApiService, GameStatsApiError } from './GameStatsApiService'
import { AuthErrorType } from '../types'

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
  })
})