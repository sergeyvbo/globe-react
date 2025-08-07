/**
 * Enhanced Error Boundary component for better error handling and user experience
 * Provides fallback UI, error reporting, and recovery options
 */

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Box, Typography, Button, Alert, Card, CardContent } from '@mui/material'
import { Refresh, BugReport, Home } from '@mui/icons-material'
import { AppError, ErrorSeverity, ErrorContext } from './ErrorTypes'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: AppError, errorInfo: ErrorInfo) => void
  showErrorDetails?: boolean
  allowRetry?: boolean
  allowReset?: boolean
  context?: Partial<ErrorContext>
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  retryCount: number
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private maxRetries = 3

  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      errorInfo
    })

    // Create structured error object
    const appError: AppError = {
      type: 'COMPONENT_ERROR',
      message: error.message,
      timestamp: new Date(),
      context: {
        ...this.props.context,
        component: errorInfo.componentStack,
        timestamp: new Date(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        additionalData: {
          stack: error.stack,
          componentStack: errorInfo.componentStack
        }
      }
    }

    // Log error
    this.logError(appError, errorInfo)

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(appError, errorInfo)
    }
  }

  private logError(error: AppError, errorInfo: ErrorInfo): void {
    console.error('Error Boundary caught an error:', {
      error: error.message,
      context: error.context,
      componentStack: errorInfo.componentStack,
      timestamp: error.timestamp.toISOString()
    })

    // In production, you might send this to an error reporting service
    // errorReportingService.reportError(error, errorInfo)
  }

  private handleRetry = (): void => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1
      }))
    }
  }

  private handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    })
  }

  private handleGoHome = (): void => {
    window.location.href = '/'
  }

  private getErrorSeverity(): ErrorSeverity {
    if (!this.state.error) return ErrorSeverity.MEDIUM

    // Determine severity based on error type
    const errorMessage = this.state.error.message.toLowerCase()
    
    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      return ErrorSeverity.LOW
    }
    
    if (errorMessage.includes('chunk') || errorMessage.includes('loading')) {
      return ErrorSeverity.MEDIUM
    }
    
    return ErrorSeverity.HIGH
  }

  private renderErrorDetails(): ReactNode {
    if (!this.props.showErrorDetails || !this.state.error) {
      return null
    }

    return (
      <Box sx={{ mt: 2 }}>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Error Details:
        </Typography>
        <Box
          sx={{
            backgroundColor: 'grey.100',
            p: 2,
            borderRadius: 1,
            fontFamily: 'monospace',
            fontSize: '0.875rem',
            maxHeight: 200,
            overflow: 'auto'
          }}
        >
          <Typography variant="body2" component="pre">
            {this.state.error.message}
          </Typography>
          {this.state.error.stack && (
            <Typography variant="body2" component="pre" sx={{ mt: 1, opacity: 0.7 }}>
              {this.state.error.stack.split('\n').slice(0, 5).join('\n')}
            </Typography>
          )}
        </Box>
      </Box>
    )
  }

  private renderActions(): ReactNode {
    const canRetry = this.props.allowRetry !== false && this.state.retryCount < this.maxRetries
    const canReset = this.props.allowReset !== false

    return (
      <Box sx={{ mt: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        {canRetry && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<Refresh />}
            onClick={this.handleRetry}
          >
            Try Again ({this.maxRetries - this.state.retryCount} left)
          </Button>
        )}
        
        {canReset && (
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<BugReport />}
            onClick={this.handleReset}
          >
            Reset Component
          </Button>
        )}
        
        <Button
          variant="outlined"
          color="inherit"
          startIcon={<Home />}
          onClick={this.handleGoHome}
        >
          Go Home
        </Button>
      </Box>
    )
  }

  private renderFallbackUI(): ReactNode {
    const severity = this.getErrorSeverity()
    const alertSeverity = severity === ErrorSeverity.LOW ? 'warning' : 
                         severity === ErrorSeverity.MEDIUM ? 'error' : 'error'

    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Card>
          <CardContent>
            <Alert severity={alertSeverity} sx={{ mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                Something went wrong
              </Typography>
              <Typography variant="body2">
                {severity === ErrorSeverity.LOW 
                  ? 'A minor issue occurred, but you can try again.'
                  : severity === ErrorSeverity.MEDIUM
                  ? 'An error occurred while loading this component.'
                  : 'A serious error occurred. Please try refreshing the page.'
                }
              </Typography>
            </Alert>

            {this.renderErrorDetails()}
            {this.renderActions()}

            <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
              <Typography variant="body2" color="text.secondary">
                If this problem persists, please contact support.
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>
    )
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Use default fallback UI
      return this.renderFallbackUI()
    }

    return this.props.children
  }
}

// Higher-order component for easier usage
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  )

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
  
  return WrappedComponent
}

// Hook for error boundary context (if needed in the future)
export const useErrorHandler = () => {
  const throwError = (error: Error) => {
    throw error
  }

  const handleAsyncError = (error: Error) => {
    // For async errors that don't get caught by error boundaries
    console.error('Async error:', error)
    
    // You could dispatch to a global error state here
    // or show a toast notification
  }

  return {
    throwError,
    handleAsyncError
  }
}

export default ErrorBoundary