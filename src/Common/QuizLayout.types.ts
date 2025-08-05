import React from 'react'

/**
 * Props interface for the QuizLayout component
 */
export interface QuizLayoutProps {
  /** Main menu component (e.g., MainMenu, FlagMainMenu, CountryMainMenu) */
  menuComponent: React.ReactNode
  /** Main game area component (e.g., Globe, Map, or game content) */
  gameAreaComponent: React.ReactNode
  /** Quiz component for user interaction */
  quizComponent?: React.ReactNode
  /** Score display component */
  scoreComponent?: React.ReactNode
  /** Whether to show the offline indicator */
  showOfflineIndicator?: boolean
  /** Whether to show the save status indicator */
  showSaveIndicator?: boolean
  /** Whether a save operation is currently in progress */
  isSaving?: boolean
  /** Error message to display if save operation failed */
  saveError?: string | null
  /** Additional content to render (e.g., auth modals, continue buttons) */
  additionalContent?: React.ReactNode
  /** Custom CSS class name */
  className?: string
  /** Loading state - shows loading message when true */
  isLoading?: boolean
  /** Loading message to display */
  loadingMessage?: string
}