import React from 'react'
import { Box, useTheme, useMediaQuery } from '@mui/material'
import { OfflineIndicator } from './Network/OfflineIndicator'
import { SaveStatusIndicator } from './SaveStatusIndicator'
import { QuizLayoutProps } from './QuizLayout.types'

/**
 * A shared layout component for all quiz types that provides consistent structure
 * and responsive design. Includes slots for menu, game area, quiz, score, and status indicators.
 */

export const QuizLayout: React.FC<QuizLayoutProps> = React.memo(({
  menuComponent,
  gameAreaComponent,
  quizComponent,
  scoreComponent,
  showOfflineIndicator = true,
  showSaveIndicator = true,
  isSaving = false,
  saveError = null,
  additionalContent,
  className = '',
  isLoading = false,
  loadingMessage = 'Loading...'
}) => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  if (isLoading) {
    return (
      <Box
        className={`quiz-layout loading ${className}`}
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        role="status"
        aria-live="polite"
      >
        <p>{loadingMessage}</p>
      </Box>
    )
  }

  return (
    <Box
      className={`quiz-layout ${className}`}
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative'
      }}
    >
      {/* Menu Section */}
      <Box
        component="header"
        role="banner"
        sx={{
          flexShrink: 0,
          zIndex: 10
        }}
      >
        {menuComponent}
      </Box>

      {/* Status Indicators */}
      {showOfflineIndicator && (
        <OfflineIndicator />
      )}
      
      {showSaveIndicator && (
        <SaveStatusIndicator 
          isSaving={isSaving} 
          saveError={saveError} 
        />
      )}

      {/* Main Content Area */}
      <Box
        component="main"
        role="main"
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Game Area */}
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0, // Allow shrinking
            position: 'relative'
          }}
        >
          {gameAreaComponent}
        </Box>

        {/* Quiz Section */}
        {quizComponent && (
          <Box
            sx={{
              flexShrink: 0,
              zIndex: 5,
              ...(isMobile && {
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                backgroundColor: theme.palette.background.paper,
                boxShadow: theme.shadows[8]
              })
            }}
          >
            {quizComponent}
          </Box>
        )}
      </Box>

      {/* Score Section */}
      {scoreComponent && (
        <Box
          component="aside"
          role="complementary"
          aria-label="Game score"
          sx={{
            flexShrink: 0,
            zIndex: 5,
            ...(isMobile && quizComponent && {
              marginBottom: '80px' // Space for fixed quiz component
            })
          }}
        >
          {scoreComponent}
        </Box>
      )}

      {/* Additional Content (modals, overlays, etc.) */}
      {additionalContent && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            pointerEvents: 'none', // Allow clicks through unless content handles it
            zIndex: 1000,
            '& > *': {
              pointerEvents: 'auto' // Re-enable pointer events for child elements
            }
          }}
        >
          {additionalContent}
        </Box>
      )}
    </Box>
  )
})

export default QuizLayout