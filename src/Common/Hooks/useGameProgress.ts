import { useState, useEffect, useCallback, useRef } from 'react'
import { GameSession, gameProgressService } from '../GameProgress/GameProgressService'
import { GameType, User } from '../types'
import { useOfflineDetector } from '../Network/useOfflineDetector'

export interface UseGameProgressOptions {
  gameType: GameType
  correctScore: number
  wrongScore: number
  isAuthenticated: boolean
  user: User | null
  gameSession: GameSession
}

export interface UseGameProgressReturn {
  isSaving: boolean
  saveError: string | null
  autoSaveProgress: () => Promise<void>
}

export const useGameProgress = (options: UseGameProgressOptions): UseGameProgressReturn => {
  const {
    gameType,
    correctScore,
    wrongScore,
    isAuthenticated,
    user,
    gameSession
  } = options

  const { isOnline, isOffline } = useOfflineDetector()
  
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  
  // Use ref to track the latest values to avoid stale closures
  const optionsRef = useRef(options)
  optionsRef.current = options

  // Auto-save progress function
  const autoSaveProgress = useCallback(async () => {
    const currentOptions = optionsRef.current
    
    if (currentOptions.correctScore === 0 && currentOptions.wrongScore === 0) return

    setIsSaving(true)
    setSaveError(null)

    try {
      const currentSession: GameSession = {
        ...currentOptions.gameSession,
        correctAnswers: currentOptions.correctScore,
        wrongAnswers: currentOptions.wrongScore,
        sessionEndTime: new Date()
      }

      if (currentOptions.isAuthenticated && currentOptions.user) {
        // Save for authenticated users
        await gameProgressService.saveGameProgress(
          currentOptions.user.id, 
          currentOptions.gameType, 
          currentSession
        )
        console.log(`${currentOptions.gameType} quiz progress auto-saved for authenticated user`)
      } else {
        // Save temporarily for unauthenticated users
        gameProgressService.saveTempSession(currentSession)
        console.log(`${currentOptions.gameType} quiz progress saved temporarily for unauthenticated user`)
      }
    } catch (error) {
      console.error(`Failed to auto-save ${currentOptions.gameType} quiz progress:`, error)
      setSaveError(isOffline ? 'Saved offline - will sync when online' : 'Failed to save progress')
    } finally {
      setIsSaving(false)
    }
  }, [isOffline])

  // Auto-save progress on score changes
  useEffect(() => {
    if (correctScore > 0 || wrongScore > 0) {
      autoSaveProgress()
    }
  }, [correctScore, wrongScore, autoSaveProgress])

  // Auto-save every 30 seconds during active gameplay
  useEffect(() => {
    if (correctScore === 0 && wrongScore === 0) return

    const interval = setInterval(() => {
      autoSaveProgress()
    }, 30000) // 30 seconds

    return () => clearInterval(interval)
  }, [correctScore, wrongScore, autoSaveProgress])

  // Handle online/offline transitions - sync offline sessions when coming back online
  useEffect(() => {
    if (isOnline && gameProgressService.hasPendingOfflineSessions()) {
      // Try to sync offline sessions when coming back online
      const syncOfflineSessions = async () => {
        try {
          await gameProgressService.syncOfflineSessionsManually()
          console.log(`Offline ${gameType} quiz sessions synced successfully`)
        } catch (error) {
          console.error(`Failed to sync offline ${gameType} quiz sessions:`, error)
        }
      }
      
      syncOfflineSessions()
    }
  }, [isOnline, gameType])

  return {
    isSaving,
    saveError,
    autoSaveProgress
  }
}