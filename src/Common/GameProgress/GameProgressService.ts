import { GameProgress, GameType, User } from '../types'

export interface GameSession {
  gameType: GameType
  correctAnswers: number
  wrongAnswers: number
  sessionStartTime: Date
  sessionEndTime?: Date
  sessionDuration?: number
}

export interface GameStats {
  totalGames: number
  totalCorrectAnswers: number
  totalWrongAnswers: number
  bestStreak: number
  averageAccuracy: number
  lastPlayedAt: Date
  gameTypeStats: Record<GameType, {
    games: number
    correctAnswers: number
    wrongAnswers: number
    bestStreak: number
    accuracy: number
  }>
}

class GameProgressService {
  private readonly STORAGE_KEY = 'game_progress'
  private readonly TEMP_SESSION_KEY = 'temp_game_session'

  // Save game progress for authenticated users
  async saveGameProgress(userId: string, gameType: GameType, session: GameSession): Promise<void> {
    try {
      // In a real implementation, this would be an API call
      // For now, we'll use localStorage with user-specific keys
      const progress = await this.getGameProgress(userId)
      
      // Update progress with new session data
      const gameTypeProgress = progress.find(p => p.gameType === gameType)
      
      if (gameTypeProgress) {
        gameTypeProgress.correctAnswers += session.correctAnswers
        gameTypeProgress.wrongAnswers += session.wrongAnswers
        gameTypeProgress.totalGames += 1
        gameTypeProgress.lastPlayedAt = session.sessionEndTime || new Date()
        
        // Update best streak if current session had a better streak
        const currentStreak = this.calculateStreak(session)
        if (currentStreak > gameTypeProgress.bestStreak) {
          gameTypeProgress.bestStreak = currentStreak
        }
      } else {
        // Create new progress entry for this game type
        const newProgress: GameProgress = {
          userId,
          gameType,
          correctAnswers: session.correctAnswers,
          wrongAnswers: session.wrongAnswers,
          totalGames: 1,
          bestStreak: this.calculateStreak(session),
          lastPlayedAt: session.sessionEndTime || new Date()
        }
        progress.push(newProgress)
      }

      // Save updated progress
      const storageKey = `${this.STORAGE_KEY}_${userId}`
      localStorage.setItem(storageKey, JSON.stringify(progress.map(p => ({
        ...p,
        lastPlayedAt: p.lastPlayedAt.toISOString()
      }))))

      // Also save to a backup location for sync purposes
      await this.saveToBackup(userId, progress)

      console.log('Game progress saved successfully', { userId, gameType, session })
    } catch (error) {
      console.error('Failed to save game progress:', error)
      throw new Error('Failed to save game progress')
    }
  }

  // Get game progress for a user
  async getGameProgress(userId: string): Promise<GameProgress[]> {
    try {
      const storageKey = `${this.STORAGE_KEY}_${userId}`
      const stored = localStorage.getItem(storageKey)
      
      if (!stored) {
        return []
      }

      const progress = JSON.parse(stored) as (Omit<GameProgress, 'lastPlayedAt'> & { lastPlayedAt: string })[]
      
      return progress.map(p => ({
        ...p,
        lastPlayedAt: new Date(p.lastPlayedAt)
      }))
    } catch (error) {
      console.error('Failed to load game progress:', error)
      return []
    }
  }

  // Get aggregated statistics for a user
  async getGameStats(userId: string): Promise<GameStats> {
    const progress = await this.getGameProgress(userId)
    
    if (progress.length === 0) {
      return {
        totalGames: 0,
        totalCorrectAnswers: 0,
        totalWrongAnswers: 0,
        bestStreak: 0,
        averageAccuracy: 0,
        lastPlayedAt: new Date(),
        gameTypeStats: {
          countries: { games: 0, correctAnswers: 0, wrongAnswers: 0, bestStreak: 0, accuracy: 0 },
          flags: { games: 0, correctAnswers: 0, wrongAnswers: 0, bestStreak: 0, accuracy: 0 },
          states: { games: 0, correctAnswers: 0, wrongAnswers: 0, bestStreak: 0, accuracy: 0 }
        }
      }
    }

    const totalGames = progress.reduce((sum, p) => sum + p.totalGames, 0)
    const totalCorrectAnswers = progress.reduce((sum, p) => sum + p.correctAnswers, 0)
    const totalWrongAnswers = progress.reduce((sum, p) => sum + p.wrongAnswers, 0)
    const bestStreak = Math.max(...progress.map(p => p.bestStreak))
    const averageAccuracy = totalCorrectAnswers + totalWrongAnswers > 0 
      ? (totalCorrectAnswers / (totalCorrectAnswers + totalWrongAnswers)) * 100 
      : 0
    const lastPlayedAt = new Date(Math.max(...progress.map(p => p.lastPlayedAt.getTime())))

    const gameTypeStats: GameStats['gameTypeStats'] = {
      countries: { games: 0, correctAnswers: 0, wrongAnswers: 0, bestStreak: 0, accuracy: 0 },
      flags: { games: 0, correctAnswers: 0, wrongAnswers: 0, bestStreak: 0, accuracy: 0 },
      states: { games: 0, correctAnswers: 0, wrongAnswers: 0, bestStreak: 0, accuracy: 0 }
    }

    progress.forEach(p => {
      const stats = gameTypeStats[p.gameType]
      stats.games = p.totalGames
      stats.correctAnswers = p.correctAnswers
      stats.wrongAnswers = p.wrongAnswers
      stats.bestStreak = p.bestStreak
      stats.accuracy = p.correctAnswers + p.wrongAnswers > 0 
        ? (p.correctAnswers / (p.correctAnswers + p.wrongAnswers)) * 100 
        : 0
    })

    return {
      totalGames,
      totalCorrectAnswers,
      totalWrongAnswers,
      bestStreak,
      averageAccuracy,
      lastPlayedAt,
      gameTypeStats
    }
  }

  // Save temporary session for unauthenticated users
  saveTempSession(session: GameSession): void {
    try {
      const sessionData = {
        ...session,
        sessionStartTime: session.sessionStartTime.toISOString(),
        sessionEndTime: session.sessionEndTime?.toISOString()
      }
      localStorage.setItem(this.TEMP_SESSION_KEY, JSON.stringify(sessionData))
    } catch (error) {
      console.error('Failed to save temporary session:', error)
    }
  }

  // Get and clear temporary session (used when user authenticates during game)
  getTempSession(): GameSession | null {
    try {
      const stored = localStorage.getItem(this.TEMP_SESSION_KEY)
      if (!stored) return null

      const sessionData = JSON.parse(stored)
      localStorage.removeItem(this.TEMP_SESSION_KEY)

      return {
        ...sessionData,
        sessionStartTime: new Date(sessionData.sessionStartTime),
        sessionEndTime: sessionData.sessionEndTime ? new Date(sessionData.sessionEndTime) : undefined
      }
    } catch (error) {
      console.error('Failed to load temporary session:', error)
      return null
    }
  }

  // Migrate temporary progress when user authenticates
  async migrateTempProgress(user: User): Promise<void> {
    try {
      const tempSession = this.getTempSession()
      if (!tempSession) return

      // Save the temporary session as permanent progress
      await this.saveGameProgress(user.id, tempSession.gameType, tempSession)
      
      console.log('Temporary progress migrated successfully', { userId: user.id, session: tempSession })
    } catch (error) {
      console.error('Failed to migrate temporary progress:', error)
    }
  }

  // Sync progress between devices
  async syncProgress(userId: string): Promise<void> {
    try {
      console.log('Progress sync initiated for user:', userId)
      
      // Get local progress
      const localProgress = await this.getGameProgress(userId)
      
      // In a real implementation, this would:
      // 1. Upload local progress to server
      // 2. Download server progress from API
      // 3. Merge conflicts (take the higher values for stats)
      // 4. Update local storage with merged data
      
      // For now, we'll simulate sync by:
      // 1. Saving current progress to backup
      // 2. Checking if there's any temporary progress to merge
      // 3. Ensuring data consistency
      
      await this.saveToBackup(userId, localProgress)
      
      // Check for any temporary progress that needs to be merged
      const tempProgress = this.getTempProgressForSync()
      if (tempProgress.length > 0) {
        await this.mergeTemporaryProgress(userId, tempProgress)
      }
      
      console.log('Progress sync completed successfully')
    } catch (error) {
      console.error('Failed to sync progress:', error)
      throw new Error('Progress synchronization failed')
    }
  }

  // Get temporary progress that might need syncing
  private getTempProgressForSync(): GameSession[] {
    try {
      const keys = Object.keys(localStorage).filter(key => 
        key.startsWith('temp_game_progress_') || key === 'temp_game_progress'
      )
      
      const tempSessions: GameSession[] = []
      
      keys.forEach(key => {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '[]')
          if (Array.isArray(data)) {
            data.forEach(session => {
              tempSessions.push({
                ...session,
                sessionStartTime: new Date(session.sessionStartTime),
                sessionEndTime: session.sessionEndTime ? new Date(session.sessionEndTime) : undefined
              })
            })
          }
          // Clean up after reading
          localStorage.removeItem(key)
        } catch (error) {
          console.warn('Failed to parse temporary progress:', key, error)
        }
      })
      
      return tempSessions
    } catch (error) {
      console.error('Failed to get temporary progress:', error)
      return []
    }
  }

  // Merge temporary progress into user's permanent progress
  private async mergeTemporaryProgress(userId: string, tempSessions: GameSession[]): Promise<void> {
    try {
      for (const session of tempSessions) {
        await this.saveGameProgress(userId, session.gameType, session)
      }
      console.log(`Merged ${tempSessions.length} temporary sessions for user ${userId}`)
    } catch (error) {
      console.error('Failed to merge temporary progress:', error)
    }
  }

  // Auto-sync progress when user authenticates
  async autoSyncOnAuth(userId: string): Promise<void> {
    try {
      // Migrate any temporary progress first
      await this.migrateTempProgress({ id: userId } as any)
      
      // Then sync with server (in a real implementation)
      await this.syncProgress(userId)
      
      console.log('Auto-sync completed for user:', userId)
    } catch (error) {
      console.error('Auto-sync failed:', error)
      // Don't throw error to avoid blocking authentication
    }
  }

  // Calculate streak from a session (simplified - assumes consecutive correct answers)
  private calculateStreak(session: GameSession): number {
    // In a real implementation, we'd track the actual streak during the game
    // For now, we'll use a simple heuristic based on accuracy
    const totalAnswers = session.correctAnswers + session.wrongAnswers
    if (totalAnswers === 0) return 0
    
    const accuracy = session.correctAnswers / totalAnswers
    
    // If accuracy is very high, assume a good streak
    if (accuracy >= 0.9) return session.correctAnswers
    if (accuracy >= 0.7) return Math.floor(session.correctAnswers * 0.7)
    
    return Math.floor(session.correctAnswers * 0.5)
  }

  // Save to backup location for sync
  private async saveToBackup(userId: string, progress: GameProgress[]): Promise<void> {
    try {
      const backupKey = `${this.STORAGE_KEY}_backup_${userId}`
      const backupData = {
        userId,
        progress: progress.map(p => ({
          ...p,
          lastPlayedAt: p.lastPlayedAt.toISOString()
        })),
        lastSyncAt: new Date().toISOString()
      }
      
      localStorage.setItem(backupKey, JSON.stringify(backupData))
    } catch (error) {
      console.error('Failed to save backup:', error)
    }
  }

  // Clear all progress for a user (for testing or user request)
  async clearProgress(userId: string): Promise<void> {
    try {
      const storageKey = `${this.STORAGE_KEY}_${userId}`
      const backupKey = `${this.STORAGE_KEY}_backup_${userId}`
      
      localStorage.removeItem(storageKey)
      localStorage.removeItem(backupKey)
      
      console.log('Progress cleared for user:', userId)
    } catch (error) {
      console.error('Failed to clear progress:', error)
    }
  }
}

export const gameProgressService = new GameProgressService()
export default gameProgressService