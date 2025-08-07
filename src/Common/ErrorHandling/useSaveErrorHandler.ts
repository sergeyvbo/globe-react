/**
 * Custom hook for handling save operation errors with consistent behavior
 * Integrates with the centralized error handling system
 */

import { useState, useCallback, useRef } from 'react'
import { SaveError, SaveErrorType, ErrorContext } from './ErrorTypes'
import { saveErrorHandler } from './SaveErrorHandler'
import { useOfflineDetector } from '../Network/useOfflineDetector'

interface UseSaveErrorHandlerOptions {
  context?: Partial<ErrorContext>
  onError?: (error: SaveError) => void
  maxRetries?: number
  retryDelayMs?: number
}

interface UseSaveErrorHandlerReturn {
  error: SaveError | null
  isRetrying: boolean
  retryCount: number
  handleError: (error: unknown, context?: Partial<ErrorContext>) => SaveError
  retry: () => Promise<void>
  clearError: () => void
  canRetry: boolean
  setRetryOperation: (operation: () => Promise<void>) => void
  isOffline: boolean
  getUserMessage: string | null
  getDisplayConfig: any
}

export const useSaveErrorHandler = (
  options: UseSaveErrorHandlerOptions = {}
): UseSaveErrorHandlerReturn => {
  const { context = {}, onError, maxRetries = 3, retryDelayMs = 2000 } = options
  
  const { isOffline } = useOfflineDetector()
  const [error, setError] = useState<SaveError | null>(null)
  const [isRetrying, setIsRetrying] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  
  // Store the last failed operation for retry
  const lastOperationRef = useRef<(() => Promise<void>) | null>(null)

  const handleError = useCallback((
    rawError: unknown, 
    additionalContext: Partial<ErrorContext> = {}
  ): SaveError => {
    const mergedContext = { ...context, ...additionalContext }
    const processedError = saveErrorHandler.processSaveError(rawError, mergedContext)
    
    // Log the error
    saveErrorHandler.logError(processedError)
    
    // Set error state
    setError(processedError)
    
    // Call custom error handler if provided
    onError?.(processedError)
    
    return processedError
  }, [context, onError])

  const retry = useCallback(async () => {
    if (!error || !lastOperationRef.current || isRetrying || retryCount >= maxRetries) {
      return
    }

    setIsRetrying(true)
    
    try {
      // Add delay before retry
      if (retryDelayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, retryDelayMs))
      }
      
      // Execute the retry operation
      await lastOperationRef.current()
      
      // Clear error on successful retry
      setError(null)
      setRetryCount(0)
      
    } catch (retryError) {
      // Handle retry failure
      const newRetryCount = retryCount + 1
      setRetryCount(newRetryCount)
      
      // Process the retry error
      const processedRetryError = saveErrorHandler.processSaveError(retryError, {
        ...context,
        action: 'retry',
        additionalData: { 
          originalError: error.type,
          retryAttempt: newRetryCount
        }
      })
      
      setError(processedRetryError)
      saveErrorHandler.logError(processedRetryError)
      
      // Call custom error handler for retry failure
      onError?.(processedRetryError)
      
    } finally {
      setIsRetrying(false)
    }
  }, [error, isRetrying, retryCount, maxRetries, retryDelayMs, context, onError])

  const clearError = useCallback(() => {
    setError(null)
    setRetryCount(0)
    setIsRetrying(false)
    lastOperationRef.current = null
  }, [])

  // Determine if retry is possible
  const canRetry = !!(
    error?.retryable && 
    !isRetrying && 
    retryCount < maxRetries &&
    lastOperationRef.current
  )

  // Store operation for retry capability
  const setRetryOperation = useCallback((operation: () => Promise<void>) => {
    lastOperationRef.current = operation
  }, [])

  return {
    error,
    isRetrying,
    retryCount,
    handleError,
    retry,
    clearError,
    canRetry,
    setRetryOperation,
    isOffline,
    getUserMessage: error ? saveErrorHandler.getUserMessage(error, isOffline) : null,
    getDisplayConfig: error ? saveErrorHandler.getDisplayConfig(error) : null
  }
}

export default useSaveErrorHandler