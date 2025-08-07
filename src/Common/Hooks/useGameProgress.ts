import { useState, useEffect, useCallback, useRef } from 'react'

import { GameSession, gameProgressService } from '../GameProgress/GameProgressService'
import { GameType, User } from '../types'
import { useOfflineDetector } from '../Network/useOfflineDetector'
import { useSaveErrorHandler } from '../ErrorHandling/useSaveErrorHandler'

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

  const { isOnline } = useOfflineDetector()
  
  const [isSaving, setIsSaving] = useState(false)
  
  // Use centralized error handling
  const errorHandler = useSaveErrorHandler({
    context: {
      component: 'useGameProgress',
      gameType,
      userId: user?.id
    }
  })
  
  // Use ref to track the latest values to avoid stale closures
  const optionsRef = useRef(options)
  optionsRef.current = options

  // Auto-save progress function
  const autoSaveProgress = useCallback(async () => {
    const currentOptions = optionsRef.current
    
    if (currentOptions.correctScore === 0 && currentOptions.wrongScore === 0) return

    setIsSaving(true)
    errorHandler.clearError()

    const saveOperation = async () => {
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

      } else {
        // Save temporarily for unauthenticated users
        gameProgressService.saveTempSession(currentSession)
      }
    }

    try {
      await saveOperation()
    } catch (error) {
      // Use centralized error handling
      errorHandler.handleError(error, {
        action: 'save',
        gameType: currentOptions.gameType,
        userId: currentOptions.user?.id
      })
      
      // Set retry operation for potential retry
      errorHandler.setRetryOperation(saveOperation)
    } finally {
      setIsSaving(false)
    }
  }, [errorHandler])

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
        } catch (error) {
          console.error(`Failed to sync offline ${gameType} quiz sessions:`, error)
        }
      }
      
      syncOfflineSessions()
    }
  }, [isOnline, gameType])

  return {
    isSaving,
    saveError: errorHandler.getUserMessage,
    autoSaveProgress
  }
}