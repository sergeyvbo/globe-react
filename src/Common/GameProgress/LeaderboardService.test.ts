import { describe, it, expect, beforeEach, vi } from 'vitest'
import { leaderboardService, LeaderboardApiError } from './LeaderboardService'
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

describe('LeaderboardService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLocalStorage.getItem.mockClear()
    leaderboardService.clearCache()
  })

  describe('getGlobalLeaderboard', () => {
    it('should get global leaderboard successfully', async () => {
      const mockBackendResponse = {
        players: [
          {
            rank: 1,
            userId: 'user1',
            userName: 'Player 1',
            userAvatar: 'avatar1.jpg',
            totalScore: 1000,
            accuracy: 95.5,
            gamesPlayed: 50,
            isCurrentUser: false
          }
        ],
        totalPlayers: 100,
        page: 1,
        pageSize: 50,
        hasNextPage: true,
        currentUserRank: 25
      }

      const expectedTransformedResponse = {
        players: [
          {
            rank: 1,
            userId: 'user1',
            userName: 'Player 1',
            displayName: 'Player 1',
            userAvatar: 'avatar1.jpg',
            totalScore: 1000,
            accuracy: 95.5,
            gamesPlayed: 50,
            totalGames: 50,
            isCurrentUser: false
          }
        ],
        entries: [
          {
            rank: 1,
            userId: 'user1',
            userName: 'Player 1',
            displayName: 'Player 1',
            userAvatar: 'avatar1.jpg',
            totalScore: 1000,
            accuracy: 95.5,
            gamesPlayed: 50,
            totalGames: 50,
            isCurrentUser: false
          }
        ],
        totalPlayers: 100,
        page: 1,
        pageSize: 50,
        hasNextPage: true,
        currentUserRank: 25
      }

      ;(fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBackendResponse,
      })

      const result = await leaderboardService.getGlobalLeaderboard(1, 50)

      expect(result).toEqual(expectedTransformedResponse)
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/leaderboard?page=1&pageSize=50',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Accept': 'application/problem+json, application/json'
          })
        })
      )
    })

    it('should use cached data when available', async () => {
      const mockBackendResponse = {
        players: [],
        totalPlayers: 0,
        page: 1,
        pageSize: 50,
        hasNextPage: false
      }

      const expectedTransformedResponse = {
        players: [],
        entries: [],
        totalPlayers: 0,
        page: 1,
        pageSize: 50,
        hasNextPage: false,
        currentUserRank: undefined
      }

      ;(fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBackendResponse,
      })

      // First call should fetch from API
      const result1 = await leaderboardService.getGlobalLeaderboard()
      expect(fetch).toHaveBeenCalledTimes(1)
      expect(result1).toEqual(expectedTransformedResponse)

      // Second call should use cache
      const result2 = await leaderboardService.getGlobalLeaderboard()
      expect(fetch).toHaveBeenCalledTimes(1) // Still only 1 call
      expect(result1).toEqual(result2)
    })
  })

  describe('getLeaderboardByGameType', () => {
    it('should get leaderboard filtered by game type', async () => {
      const mockBackendResponse = {
        players: [
          {
            rank: 1,
            userId: 'user1',
            userName: 'Country Expert',
            totalScore: 800,
            accuracy: 90.0,
            gamesPlayed: 30,
            isCurrentUser: false
          }
        ],
        totalPlayers: 50,
        page: 1,
        pageSize: 50,
        hasNextPage: false
      }

      const expectedTransformedResponse = {
        players: [
          {
            rank: 1,
            userId: 'user1',
            userName: 'Country Expert',
            displayName: 'Country Expert',
            totalScore: 800,
            accuracy: 90.0,
            gamesPlayed: 30,
            totalGames: 30,
            isCurrentUser: false
          }
        ],
        entries: [
          {
            rank: 1,
            userId: 'user1',
            userName: 'Country Expert',
            displayName: 'Country Expert',
            totalScore: 800,
            accuracy: 90.0,
            gamesPlayed: 30,
            totalGames: 30,
            isCurrentUser: false
          }
        ],
        totalPlayers: 50,
        page: 1,
        pageSize: 50,
        hasNextPage: false,
        currentUserRank: undefined
      }

      ;(fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBackendResponse,
      })

      const result = await leaderboardService.getLeaderboardByGameType('countries')

      expect(result).toEqual(expectedTransformedResponse)
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/leaderboard/game-type/countries?page=1&pageSize=50',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Accept': 'application/problem+json, application/json'
          })
        })
      )
    })
  })

  describe('isAuthenticated', () => {
    it('should return true when token is valid', () => {
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'auth_access_token') return 'valid-token'
        if (key === 'auth_token_expiry') return (Date.now() + 3600000).toString()
        return null
      })

      expect(leaderboardService.isAuthenticated()).toBe(true)
    })

    it('should return false when no token', () => {
      mockLocalStorage.getItem.mockReturnValue(null)

      expect(leaderboardService.isAuthenticated()).toBe(false)
    })

    it('should return false when token is expired', () => {
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'auth_access_token') return 'expired-token'
        if (key === 'auth_token_expiry') return (Date.now() - 3600000).toString() // Expired
        return null
      })

      expect(leaderboardService.isAuthenticated()).toBe(false)
    })
  })

  describe('RFC 9457 Error Handling', () => {
    it('should handle RFC 9457 token expiration error in global leaderboard', async () => {
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
        instance: '/api/leaderboard'
      }

      ;(fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => rfc9457Error,
      })

      await expect(leaderboardService.getGlobalLeaderboard())
        .rejects.toMatchObject({
          type: AuthErrorType.TOKEN_EXPIRED,
          message: 'Token has expired'
        })
    })

    it('should handle RFC 9457 network error in game type leaderboard', async () => {
      const rfc9457Error: RFC9457Error = {
        type: 'about:blank',
        title: 'Internal Server Error',
        status: 500,
        detail: 'An unexpected error occurred',
        instance: '/api/leaderboard/game-type/countries'
      }

      ;(fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => rfc9457Error,
      })

      await expect(leaderboardService.getLeaderboardByGameType('countries'))
        .rejects.toMatchObject({
          type: AuthErrorType.NETWORK_ERROR,
          message: 'An unexpected error occurred'
        })
    })

    it('should handle RFC 9457 authorization error in period leaderboard', async () => {
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
        instance: '/api/leaderboard/period/week'
      }

      ;(fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => rfc9457Error,
      })

      await expect(leaderboardService.getLeaderboardByPeriod('week'))
        .rejects.toMatchObject({
          type: AuthErrorType.TOKEN_EXPIRED,
          message: 'Access denied'
        })
    })

    it('should handle RFC 9457 not found error in filtered leaderboard', async () => {
      const rfc9457Error: RFC9457Error = {
        type: 'http://localhost:5000/problems/not-found-error',
        title: 'Not Found',
        status: 404,
        detail: 'Leaderboard data not found',
        instance: '/api/leaderboard/filtered'
      }

      ;(fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => rfc9457Error,
      })

      await expect(leaderboardService.getFilteredLeaderboard({ gameType: 'nonexistent' }))
        .rejects.toMatchObject({
          type: AuthErrorType.NETWORK_ERROR,
          message: 'Leaderboard data not found'
        })
    })

    it('should handle network errors with fallback RFC 9457 format', async () => {
      ;(fetch as any).mockRejectedValueOnce(new Error('Network connection failed'))

      await expect(leaderboardService.getGlobalLeaderboard())
        .rejects.toMatchObject({
          type: AuthErrorType.NETWORK_ERROR,
          message: 'Network error occurred. Please check your connection.'
        })
    })

    it('should handle malformed error responses with fallback', async () => {
      ;(fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => { throw new Error('Invalid JSON') },
      })

      await expect(leaderboardService.getGlobalLeaderboard())
        .rejects.toMatchObject({
          type: AuthErrorType.NETWORK_ERROR,
          message: 'An unexpected error occurred'
        })
    })
  })

  describe('getLeaderboardByPeriod', () => {
    it('should get leaderboard filtered by period', async () => {
      const mockBackendResponse = {
        players: [
          {
            rank: 1,
            userId: 'user1',
            userName: 'Weekly Champion',
            totalScore: 600,
            accuracy: 85.0,
            gamesPlayed: 20,
            isCurrentUser: false
          }
        ],
        totalPlayers: 25,
        page: 1,
        pageSize: 50,
        hasNextPage: false
      }

      const expectedTransformedResponse = {
        players: [
          {
            rank: 1,
            userId: 'user1',
            userName: 'Weekly Champion',
            displayName: 'Weekly Champion',
            totalScore: 600,
            accuracy: 85.0,
            gamesPlayed: 20,
            totalGames: 20,
            isCurrentUser: false
          }
        ],
        entries: [
          {
            rank: 1,
            userId: 'user1',
            userName: 'Weekly Champion',
            displayName: 'Weekly Champion',
            totalScore: 600,
            accuracy: 85.0,
            gamesPlayed: 20,
            totalGames: 20,
            isCurrentUser: false
          }
        ],
        totalPlayers: 25,
        page: 1,
        pageSize: 50,
        hasNextPage: false,
        currentUserRank: undefined
      }

      ;(fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBackendResponse,
      })

      const result = await leaderboardService.getLeaderboardByPeriod('week')

      expect(result).toEqual(expectedTransformedResponse)
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/leaderboard/period/week?page=1&pageSize=50',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Accept': 'application/problem+json, application/json'
          })
        })
      )
    })
  })

  describe('getFilteredLeaderboard', () => {
    it('should get leaderboard with multiple filters', async () => {
      const mockBackendResponse = {
        players: [
          {
            rank: 1,
            userId: 'user1',
            userName: 'Filtered Champion',
            totalScore: 400,
            accuracy: 80.0,
            gamesPlayed: 15,
            isCurrentUser: false
          }
        ],
        totalPlayers: 10,
        page: 1,
        pageSize: 50,
        hasNextPage: false
      }

      const expectedTransformedResponse = {
        players: [
          {
            rank: 1,
            userId: 'user1',
            userName: 'Filtered Champion',
            displayName: 'Filtered Champion',
            totalScore: 400,
            accuracy: 80.0,
            gamesPlayed: 15,
            totalGames: 15,
            isCurrentUser: false
          }
        ],
        entries: [
          {
            rank: 1,
            userId: 'user1',
            userName: 'Filtered Champion',
            displayName: 'Filtered Champion',
            totalScore: 400,
            accuracy: 80.0,
            gamesPlayed: 15,
            totalGames: 15,
            isCurrentUser: false
          }
        ],
        totalPlayers: 10,
        page: 1,
        pageSize: 50,
        hasNextPage: false,
        currentUserRank: undefined
      }

      ;(fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBackendResponse,
      })

      const filter = {
        gameType: 'countries',
        period: 'month' as const,
        page: 1,
        pageSize: 50
      }

      const result = await leaderboardService.getFilteredLeaderboard(filter)

      expect(result).toEqual(expectedTransformedResponse)
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/leaderboard/filtered?page=1&pageSize=50&gameType=countries&period=month',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Accept': 'application/problem+json, application/json'
          })
        })
      )
    })
  })

  describe('Cache Management', () => {
    it('should clear cache successfully', () => {
      leaderboardService.clearCache()
      expect(leaderboardService.getCacheStats().size).toBe(0)
    })

    it('should provide cache statistics', () => {
      const stats = leaderboardService.getCacheStats()
      expect(stats).toHaveProperty('size')
      expect(stats).toHaveProperty('keys')
      expect(Array.isArray(stats.keys)).toBe(true)
    })
  })
})