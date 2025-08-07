/**
 * Example component demonstrating the centralized error handling utilities
 * This shows how to integrate the error handling system in quiz components
 */

import React, { useState } from 'react'
import { Box, Button, Typography, Card, CardContent } from '@mui/material'
import { ErrorBoundary } from './ErrorBoundary'
import { ErrorNotification } from './ErrorNotification'
import { useSaveErrorHandler } from './useSaveErrorHandler'
import { SaveStatusIndicator } from '../SaveStatusIndicator'
import { SaveErrorType } from './ErrorTypes'

// Mock save operation that can fail
const mockSaveOperation = async (shouldFail: boolean = false): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate network delay
  
  if (shouldFail) {
    throw new Error('Network connection failed')
  }
}

const ErrorHandlingDemo: React.FC = () => {
  const [isSaving, setIsSaving] = useState(false)
  const [showNotification, setShowNotification] = useState(false)
  
  const errorHandler = useSaveErrorHandler({
    context: {
      component: 'ErrorHandlingDemo',
      gameType: 'countries'
    },
    onError: (error) => {
      console.log('Error handled:', error)
      setShowNotification(true)
    }
  })

  const handleSaveSuccess = async () => {
    setIsSaving(true)
    errorHandler.clearError()
    
    try {
      await mockSaveOperation(false)
      console.log('Save successful!')
    } catch (error) {
      errorHandler.handleError(error, { action: 'save' })
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveFailure = async () => {
    setIsSaving(true)
    errorHandler.clearError()
    
    const saveOperation = async () => {
      await mockSaveOperation(true)
    }
    
    try {
      await saveOperation()
      console.log('Save successful!')
    } catch (error) {
      errorHandler.handleError(error, { action: 'save' })
      errorHandler.setRetryOperation(saveOperation)
    } finally {
      setIsSaving(false)
    }
  }

  const handleRetry = async () => {
    await errorHandler.retry()
  }

  const handleCloseNotification = () => {
    setShowNotification(false)
    errorHandler.clearError()
  }

  return (
    <ErrorBoundary
      showErrorDetails={true}
      context={{ component: 'ErrorHandlingDemo' }}
    >
      <Box sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
        <Typography variant="h4" gutterBottom>
          Centralized Error Handling Demo
        </Typography>
        
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Save Operations
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <Button
                variant="contained"
                color="success"
                onClick={handleSaveSuccess}
                disabled={isSaving}
              >
                Successful Save
              </Button>
              
              <Button
                variant="contained"
                color="error"
                onClick={handleSaveFailure}
                disabled={isSaving}
              >
                Failed Save
              </Button>
            </Box>

            {/* Save Status Indicator */}
            <SaveStatusIndicator
              isSaving={isSaving}
              saveError={errorHandler.getUserMessage}
              error={errorHandler.error}
              onRetry={errorHandler.canRetry ? handleRetry : undefined}
            />

            {/* Error Information Display */}
            {errorHandler.error && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Error Details:
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Type: {errorHandler.error.type}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Message: {errorHandler.error.message}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Retryable: {errorHandler.error.retryable ? 'Yes' : 'No'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Can Retry: {errorHandler.canRetry ? 'Yes' : 'No'}
                </Typography>
                
                {errorHandler.canRetry && (
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={handleRetry}
                    disabled={errorHandler.isRetrying}
                    sx={{ mt: 1 }}
                  >
                    {errorHandler.isRetrying ? 'Retrying...' : 'Retry'}
                  </Button>
                )}
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Error Notification */}
        {showNotification && (
          <ErrorNotification
            error={errorHandler.error}
            onRetry={errorHandler.canRetry ? handleRetry : undefined}
            onClose={handleCloseNotification}
          />
        )}

        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Features Demonstrated:
            </Typography>
            <ul>
              <li>Centralized error processing and categorization</li>
              <li>Consistent error messaging across components</li>
              <li>Automatic retry functionality with configurable limits</li>
              <li>Error severity-based styling and behavior</li>
              <li>Enhanced SaveStatusIndicator with retry button</li>
              <li>Toast-style error notifications</li>
              <li>Error boundary for component-level error handling</li>
              <li>Comprehensive error logging and context tracking</li>
            </ul>
          </CardContent>
        </Card>
      </Box>
    </ErrorBoundary>
  )
}

export default ErrorHandlingDemo