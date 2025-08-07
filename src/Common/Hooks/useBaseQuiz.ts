import { useState, useEffect, useCallback } from 'react'

import { GameSession } from '../GameProgress/GameProgressService'
import { GameType, User } from '../types'
import { useGameProgress } from './useGameProgress'
import { useBeforeUnload } from './useBeforeUnload'

export interface BaseQuizState {
  correctScore: number
  wrongScore: number
  disabled: boolean
  gameSession: GameSession
}

export interface BaseQuizActions {
  onCorrectAnswer: () => void
  onWrongAnswer: () => void
  resetGame: () => void
  setDisabled: (disabled: boolean) => void
  resetScores: () => void
}

export interface UseBaseQuizOptions {
  gameType: GameType
  isAuthenticated: boolean
  user: User | null
}

export interface UseBaseQuizReturn extends BaseQuizState {
  actions: BaseQuizActions
  gameProgress: {
    isSaving: boolean
    saveError: string | null
    autoSaveProgress: () => Promise<void>
  }
}

export const useBaseQuiz = (options: UseBaseQuizOptions): UseBaseQuizReturn => {
  const { gameType, isAuthenticated, user } = options

  // Base quiz state
  const [correctScore, setCorrectScore] = useState(0)
  const [wrongScore, setWrongScore] = useState(0)
  const [disabled, setDisabled] = useState(false)
  const [gameSession, setGameSession] = useState<GameSession>({
    gameType,
    correctAnswers: 0,
    wrongAnswers: 0,
    sessionStartTime: new Date()
  })

  // Initialize session start time when game begins
  useEffect(() => {
    setGameSession(prev => ({
      ...prev,
      sessionStartTime: new Date()
    }))
  }, [])

  // Update game session when scores change
  useEffect(() => {
    setGameSession(prev => ({
      ...prev,
      correctAnswers: correctScore,
      wrongAnswers: wrongScore
    }))
  }, [correctScore, wrongScore])

  // Use shared game progress hook
  const gameProgress = useGameProgress({
    gameType,
    correctScore,
    wrongScore,
    isAuthenticated,
    user,
    gameSession
  })

  // Use shared beforeunload hook
  useBeforeUnload({
    shouldSave: correctScore > 0 || wrongScore > 0,
    gameSession,
    isAuthenticated,
    user,
    correctScore,
    wrongScore,
    gameType
  })

  // Quiz actions
  const onCorrectAnswer = useCallback(async () => {
    setCorrectScore(prev => prev + 1)
    setDisabled(true)

    // Auto-save after each answer
    try {
      await gameProgress.autoSaveProgress()
    } catch (error) {
      console.error('Failed to save progress after correct answer:', error)
    }
  }, [gameProgress])

  const onWrongAnswer = useCallback(async () => {
    setWrongScore(prev => prev + 1)
    setDisabled(true)

    // Auto-save after each answer
    try {
      await gameProgress.autoSaveProgress()
    } catch (error) {
      console.error('Failed to save progress after wrong answer:', error)
    }
  }, [gameProgress])

  const resetGame = useCallback(() => {
    setDisabled(false)
  }, [])

  const resetScores = useCallback(() => {
    setCorrectScore(0)
    setWrongScore(0)
    setGameSession(prev => ({
      ...prev,
      correctAnswers: 0,
      wrongAnswers: 0,
      sessionStartTime: new Date()
    }))
  }, [])

  const actions: BaseQuizActions = {
    onCorrectAnswer,
    onWrongAnswer,
    resetGame,
    setDisabled,
    resetScores
  }

  return {
    correctScore,
    wrongScore,
    disabled,
    gameSession,
    actions,
    gameProgress
  }
}