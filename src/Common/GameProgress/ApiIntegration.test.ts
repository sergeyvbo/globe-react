import { describe, it, expect, beforeEach, vi } from 'vitest'
import { gameStatsApiService } from './GameStatsApiService'
import { leaderboardService } from './LeaderboardService'
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

describe('API Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLocalStorage.getItem.mockClear()
    leaderboardService.clearCache()
    ;(fetch as any).mockClear()
  })

  describe('Full Game Result Saving Cycle', () => {
    it('should save game session and retrieve updated statistics', async () => {
      // Mock authenticated user
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'auth_access_token') return 'valid-token'
        if (key === 'auth_token_expiry') return (Date.now() + 3600000).toString()
        return null
      })

      // Mock successful game session save
      const mockSavedSession = {
        id: '123',
        gameType: 'countries',
        correctAnswers: 8,
        wrongAnswers: 2,
        accuracy: 80.0,
        sessionStartTime: '2023-01-01T10:00:00Z',
        sessionEndTime: '2023-01-01T10:10:00Z',
        sessionDurationMs: 600000,
        createdAt: '2023-01-01T10:10:00Z'
      }

      // Mock updated user stats after saving session
      const mockUpdatedStats = {
        totalGames: 5,
        totalCorrectAnswers: 35,
        totalWrongAnswers: 15,
        bestStreak: 12,
        averageAccuracy: 70.0,
        lastPlayedAt: '2023-01-01T10:10:00Z',
        gameTypeStats: {
          countries: {
            games: 3,
            correctAnswers: 20,
            wrongAnswers: 8,
            accuracy: 71.4,
            bestStreak: 8
          },
          flags: {
            games: 2,
            correctAnswers: 15,
            wrongAnswers: 7,
            accuracy: 68.2,
            bestStreak: 5
          },
          states: {
            games: 0,
            correctAnswers: 0,
            wrongAnswers: 0,
            accuracy: 0,
            bestStreak: 0
          }
        }
      }

      // Setup fetch mocks in sequence
      ;(fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockSavedSession,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockUpdatedStats,
        })

      // 1. Save a game session
      const sessionRequest = {
        gameType: 'countries',
        correctAnswers: 8,
        wrongAnswers: 2,
        sessionStartTime: '2023-01-01T10:00:00Z',
        sessionEndTime: '2023-01-01T10:10:00Z'
      }

      const savedSession = await gameStatsApiService.saveGameSession(sessionRequest)
      expect(savedSession).toEqual(mockSavedSession)

      // 2. Retrieve updated user statistics
      const userStats = await gameStatsApiService.getUserStats()
      expect(userStats).toEqual(mockUpdatedStats)

      // Verify API calls were made correctly
      expect(fetch).toHaveBeenCalledTimes(2)
      expect(fetch).toHaveBeenNthCalledWith(1,
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
      expect(fetch).toHaveBeenNthCalledWith(2,
        'http://localhost:5000/api/game-stats/user',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer valid-token',
            'Content-Type': 'application/json'
          })
        })
      )
    })

    it('should handle network errors during game session save', async () => {
      // Mock authenticated user
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'auth_access_token') return 'valid-token'
        if (key === 'auth_token_expiry') return (Date.now() + 3600000).toString()
        return null
      })

      // Mock network failure
      ;(fetch as any).mockRejectedValueOnce(new Error('Network error'))

      const sessionRequest = {
        gameType: 'flags',
        correctAnswers: 6,
        wrongAnswers: 4,
        sessionStartTime: '2023-01-01T11:00:00Z',
        sessionEndTime: '2023-01-01T11:08:00Z'
      }

      // Should throw network error
      await expect(gameStatsApiService.saveGameSession(sessionRequest))
        .rejects.toThrow('Network error occurred')

      // Verify the API call was attempted
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/game-stats',
        expect.objectContaining({
          method: 'POST'
        })
      )
    })
  })

  describe('Statistics Retrieval and Display', () => {
    it('should retrieve user statistics correctly', async () => {
      // Mock authenticated user
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'auth_access_token') return 'valid-token'
        if (key === 'auth_token_expiry') return (Date.now() + 3600000).toString()
        return null
      })

      const mockStats = {
        totalGames: 10,
        totalCorrectAnswers: 75,
        totalWrongAnswers: 25,
        bestStreak: 15,
        averageAccuracy: 75.0,
        lastPlayedAt: '2023-01-01T12:00:00Z',
        gameTypeStats: {
          countries: {
            games: 4,
            correctAnswers: 32,
            wrongAnswers: 8,
            accuracy: 80.0,
            bestStreak: 10
          },
          flags: {
            games: 3,
            correctAnswers: 21,
            wrongAnswers: 9,
            accuracy: 70.0,
            bestStreak: 7
          },
          states: {
            games: 3,
            correctAnswers: 22,
            wrongAnswers: 8,
            accuracy: 73.3,
            bestStreak: 8
          }
        }
      }

      ;(fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockStats,
      })

      const userStats = await gameStatsApiService.getUserStats()

      expect(userStats.totalGames).toBe(10)
      expect(userStats.averageAccuracy).toBe(75.0)
      expect(userStats.gameTypeStats.countries.accuracy).toBe(80.0)
      expect(userStats.gameTypeStats.flags.games).toBe(3)
      expect(userStats.gameTypeStats.states.bestStreak).toBe(8)

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/game-stats/user',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer valid-token'
          })
        })
      )
    })

    it('should retrieve game history with pagination', async () => {
      // Mock authenticated user
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'auth_access_token') return 'valid-token'
        if (key === 'auth_token_expiry') return (Date.now() + 3600000).toString()
        return null
      })

      const mockHistory = {
        sessions: [
          {
            id: '1',
            gameType: 'countries',
            correctAnswers: 8,
            wrongAnswers: 2,
            accuracy: 80.0,
            sessionStartTime: '2023-01-01T10:00:00Z',
            sessionEndTime: '2023-01-01T10:10:00Z',
            sessionDurationMs: 600000,
            createdAt: '2023-01-01T10:10:00Z'
          },
          {
            id: '2',
            gameType: 'flags',
            correctAnswers: 6,
            wrongAnswers: 4,
            accuracy: 60.0,
            sessionStartTime: '2023-01-01T11:00:00Z',
            sessionEndTime: '2023-01-01T11:08:00Z',
            sessionDurationMs: 480000,
            createdAt: '2023-01-01T11:08:00Z'
          }
        ],
        totalCount: 15,
        page: 1,
        pageSize: 10,
        hasNextPage: true
      }

      ;(fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockHistory,
      })

      const history = await gameStatsApiService.getUserGameHistory(1, 10)

      expect(history.sessions).toHaveLength(2)
      expect(history.totalCount).toBe(15)
      expect(history.hasNextPage).toBe(true)
      expect(history.sessions[0].gameType).toBe('countries')
      expect(history.sessions[1].gameType).toBe('flags')

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/game-stats/history?page=1&pageSize=10',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer valid-token'
          })
        })
      )
    })
  })

  describe('Leaderboard with Various Filters', () => {
    it('should retrieve global leaderboard', async () => {
      const mockLeaderboard = {
        players: [
          {
            rank: 1,
            userId: 'user1',
            userName: 'TopPlayer',
            userAvatar: 'avatar1.jpg',
            totalScore: 1500,
            accuracy: 95.0,
            gamesPlayed: 100,
            isCurrentUser: false
          },
          {
            rank: 2,
            userId: 'user2',
            userName: 'SecondPlace',
            totalScore: 1400,
            accuracy: 92.0,
            gamesPlayed: 95,
            isCurrentUser: true
          }
        ],
        totalPlayers: 500,
        page: 1,
        pageSize: 50,
        hasNextPage: true,
        currentUserRank: 2
      }

      ;(fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockLeaderboard,
      })

      const leaderboard = await leaderboardService.getGlobalLeaderboard(1, 50)

      expect(leaderboard.players).toHaveLength(2)
      expect(leaderboard.players[0].rank).toBe(1)
      expect(leaderboard.players[1].isCurrentUser).toBe(true)
      expect(leaderboard.currentUserRank).toBe(2)
      expect(leaderboard.totalPlayers).toBe(500)

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/leaderboard?page=1&pageSize=50',
        expect.objectContaining({
          method: 'GET'
        })
      )
    })

    it('should retrieve leaderboard filtered by game type', async () => {
      const mockFilteredLeaderboard = {
        players: [
          {
            rank: 1,
            userId: 'user3',
            userName: 'CountryExpert',
            totalScore: 800,
            accuracy: 90.0,
            gamesPlayed: 50,
            isCurrentUser: false
          }
        ],
        totalPlayers: 150,
        page: 1,
        pageSize: 50,
        hasNextPage: false
      }

      ;(fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockFilteredLeaderboard,
      })

      const leaderboard = await leaderboardService.getLeaderboardByGameType('countries', 1, 50)

      expect(leaderboard.players).toHaveLength(1)
      expect(leaderboard.players[0].userName).toBe('CountryExpert')
      expect(leaderboard.totalPlayers).toBe(150)
      expect(leaderboard.hasNextPage).toBe(false)

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/leaderboard?gameType=countries&page=1&pageSize=50',
        expect.objectContaining({
          method: 'GET'
        })
      )
    })

    it('should retrieve leaderboard filtered by time period', async () => {
      const mockPeriodLeaderboard = {
        players: [
          {
            rank: 1,
            userId: 'user4',
            userName: 'WeeklyChamp',
            totalScore: 300,
            accuracy: 85.0,
            gamesPlayed: 20,
            isCurrentUser: false
          }
        ],
        totalPlayers: 75,
        page: 1,
        pageSize: 50,
        hasNextPage: false
      }

      ;(fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockPeriodLeaderboard,
      })

      const leaderboard = await leaderboardService.getLeaderboardByPeriod('week', 1, 50)

      expect(leaderboard.players).toHaveLength(1)
      expect(leaderboard.players[0].userName).toBe('WeeklyChamp')
      expect(leaderboard.totalPlayers).toBe(75)

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/leaderboard?period=week&page=1&pageSize=50',
        expect.objectContaining({
          method: 'GET'
        })
      )
    })

    it('should use cached leaderboard data when available', async () => {
      const mockLeaderboard = {
        players: [
          {
            rank: 1,
            userId: 'user1',
            userName: 'CachedPlayer',
            totalScore: 1000,
            accuracy: 90.0,
            gamesPlayed: 50,
            isCurrentUser: false
          }
        ],
        totalPlayers: 100,
        page: 1,
        pageSize: 50,
        hasNextPage: true
      }

      ;(fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockLeaderboard,
      })

      // First call should fetch from API
      const leaderboard1 = await leaderboardService.getGlobalLeaderboard()
      expect(fetch).toHaveBeenCalledTimes(1)

      // Second call should use cache
      const leaderboard2 = await leaderboardService.getGlobalLeaderboard()
      expect(fetch).toHaveBeenCalledTimes(1) // Still only 1 call
      expect(leaderboard1).toEqual(leaderboard2)
    })
  })

  describe('Error Handling Integration', () => {
    it('should handle authentication errors in GameStatsApiService', async () => {
      // Mock expired token
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'auth_access_token') return null
        return null
      })

      // Test GameStatsApiService
      await expect(gameStatsApiService.saveGameSession({
        gameType: 'countries',
        correctAnswers: 5,
        wrongAnswers: 2,
        sessionStartTime: '2023-01-01T10:00:00Z',
        sessionEndTime: '2023-01-01T10:05:00Z'
      })).rejects.toMatchObject({
        type: AuthErrorType.TOKEN_EXPIRED,
        message: 'No access token available. Please log in.'
      })

      await expect(gameStatsApiService.getUserStats())
        .rejects.toMatchObject({
          type: AuthErrorType.TOKEN_EXPIRED
        })
    })

    it('should handle server errors gracefully', async () => {
      // Mock authenticated user
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'auth_access_token') return 'valid-token'
        if (key === 'auth_token_expiry') return (Date.now() + 3600000).toString()
        return null
      })

      // Mock server error
      ;(fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ message: 'Internal server error' }),
      })

      await expect(gameStatsApiService.saveGameSession({
        gameType: 'countries',
        correctAnswers: 5,
        wrongAnswers: 2,
        sessionStartTime: '2023-01-01T10:00:00Z',
        sessionEndTime: '2023-01-01T10:05:00Z'
      })).rejects.toThrow('Internal server error')
    })

    it('should handle network errors', async () => {
      // Mock authenticated user
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'auth_access_token') return 'valid-token'
        if (key === 'auth_token_expiry') return (Date.now() + 3600000).toString()
        return null
      })

      // Mock network error
      ;(fetch as any).mockRejectedValueOnce(new Error('Network error'))

      await expect(gameStatsApiService.saveGameSession({
        gameType: 'countries',
        correctAnswers: 5,
        wrongAnswers: 2,
        sessionStartTime: '2023-01-01T10:00:00Z',
        sessionEndTime: '2023-01-01T10:05:00Z'
      })).rejects.toThrow('Network error occurred')

      // Verify that the service attempted to make the request
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/game-stats',
        expect.objectContaining({
          method: 'POST'
        })
      )
    })

    it('should allow leaderboard access without authentication', async () => {
      // Mock no authentication
      mockLocalStorage.getItem.mockReturnValue(null)

      const mockLeaderboard = {
        players: [],
        totalPlayers: 0,
        page: 1,
        pageSize: 50,
        hasNextPage: false
      }

      ;(fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockLeaderboard,
      })

      const leaderboard = await leaderboardService.getGlobalLeaderboard()
      expect(leaderboard.players).toEqual([])
      expect(leaderboard.totalPlayers).toBe(0)

      // Should make request without Authorization header
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/leaderboard?page=1&pageSize=50',
        expect.objectContaining({
          method: 'GET',
          headers: expect.not.objectContaining({
            'Authorization': expect.any(String)
          })
        })
      )
    })
  })
})