import { 
  GameProgress, 
  GameType, 
  User, 
  GameSessionRequest, 
  GameStatsResponse,
  AnonymousGameSession 
} from '../types'
import { gameStatsApiService } from './GameStatsApiService'
import { offlineSyncService } from '../Network/OfflineSyncService'
import { offlineDetector } from '../Network/OfflineDetector'

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
  private readonly OFFLINE_QUEUE_KEY = 'offline_game_sessions'
  private readonly ANONYMOUS_SESSIONS_KEY = 'anonymous_game_sessions'

  // Save game progress for authenticated users
  async saveGameProgress(userId: string, gameType: GameType, session: GameSession): Promise<void> {
    try {
      const sessionRequest: GameSessionRequest = {
        gameType,
        correctAnswers: session.correctAnswers,
        wrongAnswers: session.wrongAnswers,
        sessionStartTime: session.sessionStartTime.toISOString(),
        sessionEndTime: (session.sessionEndTime || new Date()).toISOString()
      }

      // Try to save to server first if user is authenticated and online
      if (gameStatsApiService.isAuthenticated() && offlineDetector.isOnline()) {
        try {
          await gameStatsApiService.saveGameSession(sessionRequest)
          console.log('Game session saved to server successfully', { userId, gameType, session })
          
          // Also update local storage for offline access
          await this.saveGameProgressLocally(userId, gameType, session)
          
          return
        } catch (error) {
          console.warn('Failed to save to server, adding to offline sync queue:', error)
          
          // Add to offline sync service for later sync
          await offlineSyncService.addPendingAction('game_session', sessionRequest)
        }
      } else if (gameStatsApiService.isAuthenticated() && !offlineDetector.isOnline()) {
        // User is authenticated but offline - add to sync queue
        console.log('User authenticated but offline, adding to sync queue')
        await offlineSyncService.addPendingAction('game_session', sessionRequest)
      }
      
      // Always save locally as fallback/cache
      await this.saveGameProgressLocally(userId, gameType, session)
      
    } catch (error) {
      console.error('Failed to save game progress:', error)
      throw new Error('Failed to save game progress')
    }
  }

  // Save game progress locally (fallback method)
  private async saveGameProgressLocally(userId: string, gameType: GameType, session: GameSession): Promise<void> {
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

    console.log('Game progress saved locally', { userId, gameType, session })
  }

  // Get game progress for a user
  async getGameProgress(userId: string): Promise<GameProgress[]> {
    try {
      // Try to get from server first if authenticated
      if (gameStatsApiService.isAuthenticated()) {
        try {
          const serverStats = await gameStatsApiService.getUserStats()
          return this.convertServerStatsToProgress(userId, serverStats)
        } catch (error) {
          console.warn('Failed to get progress from server, using local storage:', error)
        }
      }
      
      // Fallback to local storage
      return await this.getGameProgressLocally(userId)
    } catch (error) {
      console.error('Failed to load game progress:', error)
      return []
    }
  }

  // Get game progress from local storage
  private async getGameProgressLocally(userId: string): Promise<GameProgress[]> {
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
  }

  // Convert server stats to local progress format
  private convertServerStatsToProgress(userId: string, serverStats: GameStatsResponse): GameProgress[] {
    const progress: GameProgress[] = []
    
    Object.entries(serverStats.gameTypeStats).forEach(([gameType, stats]) => {
      if (stats.games > 0) {
        progress.push({
          userId,
          gameType: gameType as GameType,
          correctAnswers: stats.correctAnswers,
          wrongAnswers: stats.wrongAnswers,
          totalGames: stats.games,
          bestStreak: stats.bestStreak,
          lastPlayedAt: serverStats.lastPlayedAt ? new Date(serverStats.lastPlayedAt) : new Date()
        })
      }
    })
    
    return progress
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
      
      // Also save to anonymous sessions for potential migration
      this.saveAnonymousSession(session)
    } catch (error) {
      console.error('Failed to save temporary session:', error)
    }
  }

  // Save anonymous session for later migration
  private saveAnonymousSession(session: GameSession): void {
    try {
      const anonymousSession: AnonymousGameSession = {
        gameType: session.gameType,
        correctAnswers: session.correctAnswers,
        wrongAnswers: session.wrongAnswers,
        sessionStartTime: session.sessionStartTime.toISOString(),
        sessionEndTime: (session.sessionEndTime || new Date()).toISOString(),
        timestamp: new Date().toISOString()
      }
      
      const existing = this.getAnonymousSessions()
      existing.push(anonymousSession)
      
      localStorage.setItem(this.ANONYMOUS_SESSIONS_KEY, JSON.stringify(existing))
    } catch (error) {
      console.error('Failed to save anonymous session:', error)
    }
  }

  // Get anonymous sessions
  private getAnonymousSessions(): AnonymousGameSession[] {
    try {
      const stored = localStorage.getItem(this.ANONYMOUS_SESSIONS_KEY)
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.error('Failed to get anonymous sessions:', error)
      return []
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
      // Get temporary session
      const tempSession = this.getTempSession()
      
      // Get all anonymous sessions
      const anonymousSessions = this.getAnonymousSessions()
      
      if (!tempSession && anonymousSessions.length === 0) {
        console.log('No temporary progress to migrate')
        return
      }

      // Migrate via API if authenticated
      if (gameStatsApiService.isAuthenticated() && anonymousSessions.length > 0) {
        try {
          await gameStatsApiService.migrateAnonymousProgress(anonymousSessions)
          
          // Clear anonymous sessions after successful migration
          localStorage.removeItem(this.ANONYMOUS_SESSIONS_KEY)
          
          console.log('Anonymous progress migrated via API successfully', { 
            userId: user.id, 
            sessionsCount: anonymousSessions.length 
          })
        } catch (error) {
          console.warn('Failed to migrate via API, falling back to local migration:', error)
        }
      }

      // Migrate temporary session locally
      if (tempSession) {
        await this.saveGameProgress(user.id, tempSession.gameType, tempSession)
        console.log('Temporary session migrated successfully', { userId: user.id, session: tempSession })
      }
      
      // Migrate anonymous sessions locally if API migration failed
      if (anonymousSessions.length > 0) {
        for (const anonymousSession of anonymousSessions) {
          const session: GameSession = {
            gameType: anonymousSession.gameType as GameType,
            correctAnswers: anonymousSession.correctAnswers,
            wrongAnswers: anonymousSession.wrongAnswers,
            sessionStartTime: new Date(anonymousSession.sessionStartTime),
            sessionEndTime: new Date(anonymousSession.sessionEndTime)
          }
          
          await this.saveGameProgressLocally(user.id, session.gameType, session)
        }
        
        // Clear anonymous sessions after local migration
        localStorage.removeItem(this.ANONYMOUS_SESSIONS_KEY)
        
        console.log('Anonymous sessions migrated locally', { 
          userId: user.id, 
          sessionsCount: anonymousSessions.length 
        })
      }
      
    } catch (error) {
      console.error('Failed to migrate temporary progress:', error)
    }
  }

  // Sync progress between devices and with server
  async syncProgress(userId: string): Promise<void> {
    try {
      console.log('Progress sync initiated for user:', userId)
      
      // First, sync offline queue if user is authenticated
      if (gameStatsApiService.isAuthenticated()) {
        await this.syncOfflineQueue()
      }
      
      // Get local progress
      const localProgress = await this.getGameProgressLocally(userId)
      
      // If authenticated, try to get server progress and merge
      if (gameStatsApiService.isAuthenticated()) {
        try {
          const serverStats = await gameStatsApiService.getUserStats()
          const serverProgress = this.convertServerStatsToProgress(userId, serverStats)
          
          // Merge local and server progress (server takes precedence for conflicts)
          const mergedProgress = this.mergeProgress(localProgress, serverProgress)
          
          // Update local storage with merged data
          const storageKey = `${this.STORAGE_KEY}_${userId}`
          localStorage.setItem(storageKey, JSON.stringify(mergedProgress.map(p => ({
            ...p,
            lastPlayedAt: p.lastPlayedAt.toISOString()
          }))))
          
          console.log('Progress synced with server successfully')
        } catch (error) {
          console.warn('Failed to sync with server, using local progress:', error)
        }
      }
      
      // Save current progress to backup
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

  // Merge local and server progress
  private mergeProgress(localProgress: GameProgress[], serverProgress: GameProgress[]): GameProgress[] {
    const merged = new Map<GameType, GameProgress>()
    
    // Add local progress
    localProgress.forEach(progress => {
      merged.set(progress.gameType, { ...progress })
    })
    
    // Merge server progress (server takes precedence for higher values)
    serverProgress.forEach(serverProg => {
      const localProg = merged.get(serverProg.gameType)
      
      if (!localProg) {
        merged.set(serverProg.gameType, { ...serverProg })
      } else {
        // Merge by taking higher values
        merged.set(serverProg.gameType, {
          ...serverProg,
          correctAnswers: Math.max(localProg.correctAnswers, serverProg.correctAnswers),
          wrongAnswers: Math.max(localProg.wrongAnswers, serverProg.wrongAnswers),
          totalGames: Math.max(localProg.totalGames, serverProg.totalGames),
          bestStreak: Math.max(localProg.bestStreak, serverProg.bestStreak),
          lastPlayedAt: localProg.lastPlayedAt > serverProg.lastPlayedAt 
            ? localProg.lastPlayedAt 
            : serverProg.lastPlayedAt
        })
      }
    })
    
    return Array.from(merged.values())
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
      
      // Then sync with server
      await this.syncProgress(userId)
      
      console.log('Auto-sync completed for user:', userId)
    } catch (error) {
      console.error('Auto-sync failed:', error)
      // Don't throw error to avoid blocking authentication
    }
  }

  // Add session to offline queue for later sync
  private async addToOfflineQueue(sessionRequest: GameSessionRequest): Promise<void> {
    try {
      const queue = this.getOfflineQueue()
      queue.push({
        ...sessionRequest,
        timestamp: new Date().toISOString()
      })
      
      localStorage.setItem(this.OFFLINE_QUEUE_KEY, JSON.stringify(queue))
      console.log('Session added to offline queue')
    } catch (error) {
      console.error('Failed to add session to offline queue:', error)
    }
  }

  // Get offline queue
  private getOfflineQueue(): (GameSessionRequest & { timestamp: string })[] {
    try {
      const stored = localStorage.getItem(this.OFFLINE_QUEUE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.error('Failed to get offline queue:', error)
      return []
    }
  }

  // Sync offline queue when connection is restored
  private async syncOfflineQueue(): Promise<void> {
    const queue = this.getOfflineQueue()
    
    if (queue.length === 0) {
      return
    }
    
    console.log(`Syncing ${queue.length} offline sessions...`)
    
    const failedSessions: (GameSessionRequest & { timestamp: string })[] = []
    
    for (const session of queue) {
      try {
        await gameStatsApiService.saveGameSession(session)
        console.log('Offline session synced successfully')
      } catch (error) {
        console.warn('Failed to sync offline session:', error)
        failedSessions.push(session)
      }
    }
    
    // Update queue with failed sessions only
    if (failedSessions.length > 0) {
      localStorage.setItem(this.OFFLINE_QUEUE_KEY, JSON.stringify(failedSessions))
      console.log(`${failedSessions.length} sessions remain in offline queue`)
    } else {
      localStorage.removeItem(this.OFFLINE_QUEUE_KEY)
      console.log('All offline sessions synced successfully')
    }
  }

  // Check if there are pending offline sessions
  hasPendingOfflineSessions(): boolean {
    return this.getOfflineQueue().length > 0
  }

  // Manual sync trigger for offline sessions
  async syncOfflineSessionsManually(): Promise<void> {
    if (!gameStatsApiService.isAuthenticated()) {
      throw new Error('User must be authenticated to sync offline sessions')
    }
    
    await this.syncOfflineQueue()
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