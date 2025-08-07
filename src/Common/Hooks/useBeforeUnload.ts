import { useEffect, useRef } from 'react'

import { GameSession, gameProgressService } from '../GameProgress/GameProgressService'
import { GameType, User } from '../types'

export interface UseBeforeUnloadOptions {
  shouldSave: boolean
  gameSession: GameSession
  isAuthenticated: boolean
  user: User | null
  correctScore: number
  wrongScore: number
  gameType: GameType
}

export const useBeforeUnload = (options: UseBeforeUnloadOptions): void => {
  const {
    shouldSave,
    gameSession,
    isAuthenticated,
    user,
    correctScore,
    wrongScore,
    gameType
  } = options

  // Use ref to track the latest values to avoid stale closures
  const optionsRef = useRef(options)
  optionsRef.current = options

  useEffect(() => {
    const handleBeforeUnload = () => {
      const currentOptions = optionsRef.current
      
      // Only save if there's actual progress and we should save
      if (!currentOptions.shouldSave || 
          (currentOptions.correctScore === 0 && currentOptions.wrongScore === 0)) {
        return
      }

      // Create current session with latest scores
      const currentSession: GameSession = {
        ...currentOptions.gameSession,
        correctAnswers: currentOptions.correctScore,
        wrongAnswers: currentOptions.wrongScore,
        sessionEndTime: new Date()
      }

      try {
        if (currentOptions.isAuthenticated && currentOptions.user) {
          // For authenticated users, try to save but don't block
          gameProgressService.saveGameProgress(
            currentOptions.user.id, 
            currentOptions.gameType, 
            currentSession
          ).catch(console.error)
        } else {
          // For unauthenticated users, save to temp storage
          gameProgressService.saveTempSession(currentSession)
        }
      } catch (error) {
        console.error(`Failed to save ${currentOptions.gameType} progress on beforeunload:`, error)
      }
    }

    // Add event listener
    window.addEventListener('beforeunload', handleBeforeUnload)

    // Cleanup function
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [shouldSave, gameSession, isAuthenticated, user, correctScore, wrongScore, gameType])
}