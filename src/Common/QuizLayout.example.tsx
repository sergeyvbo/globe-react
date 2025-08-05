import React, { useState } from 'react'
import { Button, Box, Typography } from '@mui/material'
import { QuizLayout } from './QuizLayout'

/**
 * Example usage of the QuizLayout component showing how to integrate
 * all the different slots and features.
 */
export const QuizLayoutExample: React.FC = () => {
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)

  const handleSave = () => {
    setIsSaving(true)
    setSaveError(null)
    
    // Simulate save operation
    setTimeout(() => {
      setIsSaving(false)
      // Randomly succeed or fail for demo
      if (Math.random() > 0.7) {
        setSaveError('Failed to save progress')
      }
    }, 2000)
  }

  const handleToggleLoading = () => {
    setIsLoading(!isLoading)
  }

  // Example menu component
  const menuComponent = (
    <Box sx={{ p: 2, backgroundColor: '#1976d2', color: 'white' }}>
      <Typography variant="h6">Example Quiz Menu</Typography>
      <Button 
        variant="contained" 
        color="secondary" 
        onClick={handleSave}
        sx={{ ml: 2 }}
      >
        Save Progress
      </Button>
      <Button 
        variant="contained" 
        color="secondary" 
        onClick={handleToggleLoading}
        sx={{ ml: 1 }}
      >
        Toggle Loading
      </Button>
    </Box>
  )

  // Example game area component
  const gameAreaComponent = (
    <Box 
      sx={{ 
        flex: 1, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#f5f5f5',
        minHeight: '400px'
      }}
    >
      <Typography variant="h4" color="textSecondary">
        🌍 Game Area (Globe/Map/Content)
      </Typography>
    </Box>
  )

  // Example quiz component
  const quizComponent = (
    <Box sx={{ p: 2, backgroundColor: 'white', borderTop: '1px solid #ddd' }}>
      <Typography variant="h6" gutterBottom>Quiz Question</Typography>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Button variant="outlined">Option A</Button>
        <Button variant="outlined">Option B</Button>
        <Button variant="outlined">Option C</Button>
      </Box>
    </Box>
  )

  // Example score component
  const scoreComponent = (
    <Box sx={{ p: 2, textAlign: 'center', backgroundColor: '#e3f2fd' }}>
      <Typography variant="body1">
        ✅ Correct: 5 | ❌ Wrong: 2
      </Typography>
    </Box>
  )

  // Example additional content (modal)
  const additionalContent = showModal ? (
    <Box
      sx={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        backgroundColor: 'white',
        p: 3,
        borderRadius: 2,
        boxShadow: 24,
        zIndex: 1000
      }}
    >
      <Typography variant="h6" gutterBottom>Example Modal</Typography>
      <Typography variant="body2" gutterBottom>
        This demonstrates additional content like auth modals or dialogs.
      </Typography>
      <Button 
        variant="contained" 
        onClick={() => setShowModal(false)}
      >
        Close
      </Button>
    </Box>
  ) : null

  return (
    <Box sx={{ height: '100vh' }}>
      <QuizLayout
        menuComponent={menuComponent}
        gameAreaComponent={gameAreaComponent}
        quizComponent={quizComponent}
        scoreComponent={scoreComponent}
        isSaving={isSaving}
        saveError={saveError}
        isLoading={isLoading}
        loadingMessage="Loading example quiz..."
        additionalContent={additionalContent}
        className="example-quiz-layout"
      />
      
      {/* Demo controls */}
      {!isLoading && (
        <Box
          sx={{
            position: 'fixed',
            bottom: 16,
            left: 16,
            zIndex: 1001
          }}
        >
          <Button 
            variant="contained" 
            size="small"
            onClick={() => setShowModal(true)}
          >
            Show Modal
          </Button>
        </Box>
      )}
    </Box>
  )
}

export default QuizLayoutExample