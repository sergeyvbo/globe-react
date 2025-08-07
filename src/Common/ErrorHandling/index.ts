/**
 * Centralized error handling utilities - main export file
 * Provides a single entry point for all error handling functionality
 */

// Core error types and interfaces
export * from './ErrorTypes'

// Error handlers
export { SaveErrorHandler, saveErrorHandler } from './SaveErrorHandler'

// React components
export { ErrorBoundary, withErrorBoundary, useErrorHandler } from './ErrorBoundary'
export { ErrorNotification } from './ErrorNotification'

// Custom hooks
export { useSaveErrorHandler } from './useSaveErrorHandler'

// Utility functions for common error handling patterns
export const createErrorContext = (
  component: string,
  action: string,
  additionalData?: Record<string, unknown>
) => ({
  component,
  action,
  timestamp: new Date(),
  userAgent: navigator.userAgent,
  url: window.location.href,
  additionalData
})

// Helper function to determine if an error is retryable
export const isRetryableError = (error: unknown): boolean => {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    return (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('timeout') ||
      message.includes('connection')
    )
  }
  return false
}

// Helper function to get error type from unknown error
export const getErrorType = (error: unknown): string => {
  if (error instanceof Error) {
    return error.constructor.name
  }
  return typeof error
}