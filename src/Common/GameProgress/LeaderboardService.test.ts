import { describe, it, expect, beforeEach, vi } from 'vitest'
import { leaderboardService, LeaderboardApiError } from './LeaderboardService'
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

describe('LeaderboardService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLocalStorage.getItem.mockClear()
    leaderboardService.clearCache()
  })

  describe('getGlobalLeaderboard', () => {
    it('should get global leaderboard successfully', async () => {
      const mockResponse = {
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

      ;(fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await leaderboardService.getGlobalLeaderboard(1, 50)

      expect(result).toEqual(mockResponse)
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/leaderboard?page=1&pageSize=50',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      )
    })

    it('should use cached data when available', async () => {
      const mockResponse = {
        players: [],
        totalPlayers: 0,
        page: 1,
        pageSize: 50,
        hasNextPage: false
      }

      ;(fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      // First call should fetch from API
      const result1 = await leaderboardService.getGlobalLeaderboard()
      expect(fetch).toHaveBeenCalledTimes(1)

      // Second call should use cache
      const result2 = await leaderboardService.getGlobalLeaderboard()
      expect(fetch).toHaveBeenCalledTimes(1) // Still only 1 call
      expect(result1).toEqual(result2)
    })
  })

  describe('getLeaderboardByGameType', () => {
    it('should get leaderboard filtered by game type', async () => {
      const mockResponse = {
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

      ;(fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await leaderboardService.getLeaderboardByGameType('countries')

      expect(result).toEqual(mockResponse)
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/leaderboard/game-type/countries?page=1&pageSize=50',
        expect.objectContaining({
          method: 'GET'
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
  })
})