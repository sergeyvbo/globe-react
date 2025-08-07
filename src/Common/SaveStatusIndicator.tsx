import React from 'react'
import { SaveError, ErrorSeverity } from './ErrorHandling/ErrorTypes'
import { saveErrorHandler } from './ErrorHandling/SaveErrorHandler'

/**
 * A shared component that displays the save status for quiz progress.
 * Shows a saving indicator when progress is being saved, or an error message if saving fails.
 * Used across all quiz components (CountryQuiz, FlagQuiz, StateQuiz) to provide consistent UI.
 * Enhanced with centralized error handling support.
 */
interface SaveStatusIndicatorProps {
  /** Whether the save operation is currently in progress */
  isSaving: boolean
  /** Error message to display if save operation failed, or null if no error */
  saveError: string | null
  /** Optional SaveError object for enhanced error handling */
  error?: SaveError | null
  /** Optional additional CSS class name */
  className?: string
  /** Optional callback for retry action */
  onRetry?: () => Promise<void>
}

export const SaveStatusIndicator: React.FC<SaveStatusIndicatorProps> = React.memo(({ 
  isSaving, 
  saveError, 
  error,
  className = '',
  onRetry
}) => {
  // Don't render if neither saving nor error
  if (!isSaving && !saveError && !error) {
    return null
  }

  // Get enhanced styling based on error severity
  const getBackgroundColor = (): string => {
    if (isSaving) return '#2196f3' // Blue for saving
    
    if (error) {
      const config = saveErrorHandler.getDisplayConfig(error)
      switch (config.severity) {
        case ErrorSeverity.LOW:
          return '#4caf50' // Green for low severity (like offline save)
        case ErrorSeverity.MEDIUM:
          return '#ff9800' // Orange for medium severity
        case ErrorSeverity.HIGH:
        case ErrorSeverity.CRITICAL:
          return '#f44336' // Red for high severity
        default:
          return '#ff9800'
      }
    }
    
    return '#ff9800' // Default orange for legacy saveError
  }

  // Get display message
  const getMessage = (): string => {
    if (isSaving) return '💾 Saving...'
    if (error) return saveErrorHandler.getUserMessage(error)
    return saveError || ''
  }

  // Check if retry is available
  const canRetry = error?.retryable && onRetry && !isSaving

  return (
    <div 
      className={`save-status-indicator ${className}`}
      style={{
        position: 'fixed',
        top: '50px',
        right: '10px',
        padding: '8px 16px',
        borderRadius: '4px',
        fontSize: '12px',
        zIndex: 999,
        backgroundColor: getBackgroundColor(),
        color: 'white',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        transition: 'all 0.3s ease',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}
    >
      <span>{getMessage()}</span>
      {canRetry && (
        <button
          onClick={onRetry}
          style={{
            background: 'rgba(255,255,255,0.2)',
            border: 'none',
            color: 'white',
            padding: '2px 6px',
            borderRadius: '2px',
            fontSize: '10px',
            cursor: 'pointer',
            transition: 'background 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.3)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.2)'
          }}
        >
          Retry
        </button>
      )}
    </div>
  )
})

export default SaveStatusIndicator