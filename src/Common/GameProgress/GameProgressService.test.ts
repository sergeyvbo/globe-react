import { describe, it, expect, beforeEach, vi } from 'vitest'
import { gameProgressService, GameSession } from './GameProgressService'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

describe('GameProgressService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('saveGameProgress', () => {
    it('should save game progress for a user', async () => {
      const userId = 'test-user-1'
      const gameType = 'countries'
      const session: GameSession = {
        gameType: 'countries',
        correctAnswers: 5,
        wrongAnswers: 2,
        sessionStartTime: new Date('2024-01-01T10:00:00Z'),
        sessionEndTime: new Date('2024-01-01T10:15:00Z')
      }

      // Mock existing progress
      localStorageMock.getItem.mockReturnValue('[]')

      await gameProgressService.saveGameProgress(userId, gameType, session)

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        `game_progress_${userId}`,
        expect.stringContaining('"correctAnswers":5')
      )
    })

    it('should update existing progress for the same game type', async () => {
      const userId = 'test-user-1'
      const gameType = 'countries'
      const session: GameSession = {
        gameType: 'countries',
        correctAnswers: 3,
        wrongAnswers: 1,
        sessionStartTime: new Date('2024-01-01T10:00:00Z'),
        sessionEndTime: new Date('2024-01-01T10:10:00Z')
      }

      // Mock existing progress
      const existingProgress = [{
        userId,
        gameType: 'countries',
        correctAnswers: 5,
        wrongAnswers: 2,
        totalGames: 1,
        bestStreak: 3,
        lastPlayedAt: '2024-01-01T09:00:00.000Z'
      }]
      localStorageMock.getItem.mockReturnValue(JSON.stringify(existingProgress))

      await gameProgressService.saveGameProgress(userId, gameType, session)

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        `game_progress_${userId}`,
        expect.stringContaining('"correctAnswers":8') // 5 + 3
      )
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        `game_progress_${userId}`,
        expect.stringContaining('"wrongAnswers":3') // 2 + 1
      )
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        `game_progress_${userId}`,
        expect.stringContaining('"totalGames":2') // 1 + 1
      )
    })
  })

  describe('getGameProgress', () => {
    it('should return empty array when no progress exists', async () => {
      localStorageMock.getItem.mockReturnValue(null)

      const progress = await gameProgressService.getGameProgress('test-user')

      expect(progress).toEqual([])
    })

    it('should return parsed progress data', async () => {
      const mockProgress = [{
        userId: 'test-user',
        gameType: 'countries',
        correctAnswers: 10,
        wrongAnswers: 3,
        totalGames: 2,
        bestStreak: 5,
        lastPlayedAt: '2024-01-01T10:00:00.000Z'
      }]
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockProgress))

      const progress = await gameProgressService.getGameProgress('test-user')

      expect(progress).toHaveLength(1)
      expect(progress[0].correctAnswers).toBe(10)
      expect(progress[0].wrongAnswers).toBe(3)
      expect(progress[0].lastPlayedAt).toBeInstanceOf(Date)
    })
  })

  describe('getGameStats', () => {
    it('should return default stats when no progress exists', async () => {
      localStorageMock.getItem.mockReturnValue(null)

      const stats = await gameProgressService.getGameStats('test-user')

      expect(stats.totalGames).toBe(0)
      expect(stats.totalCorrectAnswers).toBe(0)
      expect(stats.totalWrongAnswers).toBe(0)
      expect(stats.bestStreak).toBe(0)
      expect(stats.averageAccuracy).toBe(0)
    })

    it('should calculate correct aggregate stats', async () => {
      const mockProgress = [
        {
          userId: 'test-user',
          gameType: 'countries',
          correctAnswers: 10,
          wrongAnswers: 2,
          totalGames: 2,
          bestStreak: 5,
          lastPlayedAt: '2024-01-01T10:00:00.000Z'
        },
        {
          userId: 'test-user',
          gameType: 'flags',
          correctAnswers: 8,
          wrongAnswers: 4,
          totalGames: 1,
          bestStreak: 3,
          lastPlayedAt: '2024-01-01T11:00:00.000Z'
        }
      ]
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockProgress))

      const stats = await gameProgressService.getGameStats('test-user')

      expect(stats.totalGames).toBe(3) // 2 + 1
      expect(stats.totalCorrectAnswers).toBe(18) // 10 + 8
      expect(stats.totalWrongAnswers).toBe(6) // 2 + 4
      expect(stats.bestStreak).toBe(5) // max(5, 3)
      expect(stats.averageAccuracy).toBe(75) // 18/(18+6) * 100
      expect(stats.gameTypeStats.countries.games).toBe(2)
      expect(stats.gameTypeStats.flags.games).toBe(1)
      expect(stats.gameTypeStats.states.games).toBe(0)
    })
  })

  describe('saveTempSession', () => {
    it('should save temporary session to localStorage', () => {
      const session: GameSession = {
        gameType: 'countries',
        correctAnswers: 3,
        wrongAnswers: 1,
        sessionStartTime: new Date('2024-01-01T10:00:00Z')
      }

      gameProgressService.saveTempSession(session)

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'temp_game_session',
        expect.stringContaining('"correctAnswers":3')
      )
    })
  })

  describe('getTempSession', () => {
    it('should return null when no temp session exists', () => {
      localStorageMock.getItem.mockReturnValue(null)

      const session = gameProgressService.getTempSession()

      expect(session).toBeNull()
    })

    it('should return and clear temp session', () => {
      const mockSession = {
        gameType: 'countries',
        correctAnswers: 3,
        wrongAnswers: 1,
        sessionStartTime: '2024-01-01T10:00:00.000Z'
      }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockSession))

      const session = gameProgressService.getTempSession()

      expect(session).toBeTruthy()
      expect(session?.correctAnswers).toBe(3)
      expect(session?.sessionStartTime).toBeInstanceOf(Date)
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('temp_game_session')
    })
  })

  describe('clearProgress', () => {
    it('should clear all progress for a user', async () => {
      const userId = 'test-user'

      await gameProgressService.clearProgress(userId)

      expect(localStorageMock.removeItem).toHaveBeenCalledWith(`game_progress_${userId}`)
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(`game_progress_backup_${userId}`)
    })
  })
})