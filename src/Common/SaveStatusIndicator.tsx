import React from 'react'

/**
 * A shared component that displays the save status for quiz progress.
 * Shows a saving indicator when progress is being saved, or an error message if saving fails.
 * Used across all quiz components (CountryQuiz, FlagQuiz, StateQuiz) to provide consistent UI.
 */
interface SaveStatusIndicatorProps {
  /** Whether the save operation is currently in progress */
  isSaving: boolean
  /** Error message to display if save operation failed, or null if no error */
  saveError: string | null
  /** Optional additional CSS class name */
  className?: string
}

export const SaveStatusIndicator: React.FC<SaveStatusIndicatorProps> = React.memo(({ 
  isSaving, 
  saveError, 
  className = '' 
}) => {
  // Don't render if neither saving nor error
  if (!isSaving && !saveError) {
    return null
  }

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
        backgroundColor: saveError ? '#ff9800' : '#2196f3',
        color: 'white',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        transition: 'all 0.3s ease'
      }}
    >
      {isSaving ? '💾 Saving...' : saveError}
    </div>
  )
})

export default SaveStatusIndicator