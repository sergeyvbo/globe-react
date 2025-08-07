/**
 * Centralized error notification component for consistent error messaging
 * Provides toast-style notifications with retry functionality
 */

import React, { useState, useEffect, useCallback } from 'react'
import { 
  Snackbar, 
  Alert, 
  AlertTitle, 
  Button, 
  Box, 
  IconButton,
  Collapse
} from '@mui/material'
import { 
  Close, 
  Refresh, 
  ExpandMore, 
  ExpandLess,
  Warning,
  Error as ErrorIcon,
  Info
} from '@mui/icons-material'
import { SaveError, ErrorSeverity } from './ErrorTypes'
import { saveErrorHandler } from './SaveErrorHandler'

interface ErrorNotificationProps {
  error: SaveError | null
  isOffline?: boolean
  onRetry?: () => Promise<void>
  onClose?: () => void
  autoHide?: boolean
  hideAfterMs?: number
}

export const ErrorNotification: React.FC<ErrorNotificationProps> = ({
  error,
  isOffline = false,
  onRetry,
  onClose,
  autoHide,
  hideAfterMs
}) => {
  const [open, setOpen] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [isRetrying, setIsRetrying] = useState(false)

  // Update open state when error changes
  useEffect(() => {
    setOpen(!!error)
    setShowDetails(false)
  }, [error])

  // Auto-hide functionality
  useEffect(() => {
    if (!error || !open) return

    const config = saveErrorHandler.getDisplayConfig(error)
    const shouldAutoHide = autoHide ?? config.autoHide
    const hideDelay = hideAfterMs ?? config.hideAfterMs ?? 5000

    if (shouldAutoHide) {
      const timer = setTimeout(() => {
        handleClose()
      }, hideDelay)

      return () => clearTimeout(timer)
    }
  }, [error, open, autoHide, hideAfterMs])

  const handleClose = useCallback(() => {
    setOpen(false)
    onClose?.()
  }, [onClose])

  const handleRetry = useCallback(async () => {
    if (!onRetry || isRetrying) return

    setIsRetrying(true)
    try {
      await onRetry()
      handleClose()
    } catch (retryError) {
      console.error('Retry failed:', retryError)
      // Keep notification open to show retry failed
    } finally {
      setIsRetrying(false)
    }
  }, [onRetry, isRetrying, handleClose])

  const toggleDetails = useCallback(() => {
    setShowDetails(prev => !prev)
  }, [])

  if (!error) return null

  const config = saveErrorHandler.getDisplayConfig(error)
  const userMessage = saveErrorHandler.getUserMessage(error, isOffline)
  
  // Map severity to MUI alert severity
  const alertSeverity = config.severity === ErrorSeverity.LOW ? 'info' :
                       config.severity === ErrorSeverity.MEDIUM ? 'warning' : 'error'

  // Get appropriate icon
  const getIcon = () => {
    switch (config.severity) {
      case ErrorSeverity.LOW:
        return <Info />
      case ErrorSeverity.MEDIUM:
        return <Warning />
      case ErrorSeverity.HIGH:
      case ErrorSeverity.CRITICAL:
        return <ErrorIcon />
      default:
        return <Warning />
    }
  }

  const renderActions = () => {
    const actions = []

    // Retry button
    if (config.allowRetry && onRetry) {
      actions.push(
        <Button
          key="retry"
          color="inherit"
          size="small"
          startIcon={<Refresh />}
          onClick={handleRetry}
          disabled={isRetrying}
        >
          {isRetrying ? 'Retrying...' : 'Retry'}
        </Button>
      )
    }

    // Details toggle button
    if (error.details || error.context) {
      actions.push(
        <Button
          key="details"
          color="inherit"
          size="small"
          startIcon={showDetails ? <ExpandLess /> : <ExpandMore />}
          onClick={toggleDetails}
        >
          Details
        </Button>
      )
    }

    return actions
  }

  const renderDetails = () => {
    if (!showDetails) return null

    return (
      <Collapse in={showDetails}>
        <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ mb: 1 }}>
            <strong>Error Type:</strong> {error.type}
          </Box>
          <Box sx={{ mb: 1 }}>
            <strong>Operation:</strong> {error.operation}
          </Box>
          {error.gameType && (
            <Box sx={{ mb: 1 }}>
              <strong>Game Type:</strong> {error.gameType}
            </Box>
          )}
          <Box sx={{ mb: 1 }}>
            <strong>Time:</strong> {error.timestamp.toLocaleString()}
          </Box>
          {error.details && (
            <Box sx={{ mb: 1 }}>
              <strong>Details:</strong>
              <Box
                component="pre"
                sx={{
                  fontSize: '0.75rem',
                  backgroundColor: 'rgba(0,0,0,0.05)',
                  p: 1,
                  borderRadius: 1,
                  mt: 0.5,
                  overflow: 'auto',
                  maxHeight: 100
                }}
              >
                {JSON.stringify(error.details, null, 2)}
              </Box>
            </Box>
          )}
        </Box>
      </Collapse>
    )
  }

  return (
    <Snackbar
      open={open}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      sx={{ maxWidth: 500 }}
    >
      <Alert
        severity={alertSeverity}
        icon={getIcon()}
        action={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {renderActions()}
            <IconButton
              size="small"
              aria-label="close"
              color="inherit"
              onClick={handleClose}
            >
              <Close fontSize="small" />
            </IconButton>
          </Box>
        }
        sx={{ width: '100%' }}
      >
        <AlertTitle>
          {config.severity === ErrorSeverity.LOW ? 'Info' :
           config.severity === ErrorSeverity.MEDIUM ? 'Warning' : 'Error'}
        </AlertTitle>
        {userMessage}
        {renderDetails()}
      </Alert>
    </Snackbar>
  )
}

export default ErrorNotification