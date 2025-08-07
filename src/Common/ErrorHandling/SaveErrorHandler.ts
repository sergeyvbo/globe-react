/**
 * Centralized error handling logic specifically for save operations
 * Provides consistent error processing, messaging, and recovery strategies
 */

import { 
  SaveError, 
  SaveErrorType, 
  ErrorSeverity, 
  ErrorDisplayConfig, 
  ErrorContext,
  ErrorRecoveryStrategy,
  ErrorRecoveryConfig
} from './ErrorTypes'
import { GameStatsApiError } from '../GameProgress/GameStatsApiService'
import { GameType } from '../types'

export class SaveErrorHandler {
  private static instance: SaveErrorHandler
  
  private constructor() {}
  
  static getInstance(): SaveErrorHandler {
    if (!SaveErrorHandler.instance) {
      SaveErrorHandler.instance = new SaveErrorHandler()
    }
    return SaveErrorHandler.instance
  }

  /**
   * Process and categorize save operation errors
   */
  processSaveError(
    error: unknown, 
    context: Partial<ErrorContext> = {}
  ): SaveError {
    const timestamp = new Date()
    const baseContext: ErrorContext = {
      timestamp,
      userAgent: navigator.userAgent,
      url: window.location.href,
      ...context
    }

    // Handle GameStatsApiError (from API service)
    if (error instanceof GameStatsApiError || (error && typeof error === 'object' && 'type' in error && error.constructor.name === 'GameStatsApiError')) {
      return this.processApiError(error as GameStatsApiError, baseContext)
    }

    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return this.createSaveError({
        type: SaveErrorType.NETWORK_ERROR,
        message: 'Network connection failed',
        operation: context.action as 'save' | 'sync' | 'migrate' || 'save',
        retryable: true,
        context: baseContext,
        details: { originalError: error.message }
      })
    }

    // Handle storage errors (localStorage, etc.)
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      return this.createSaveError({
        type: SaveErrorType.STORAGE_ERROR,
        message: 'Storage quota exceeded',
        operation: context.action as 'save' | 'sync' | 'migrate' || 'save',
        retryable: false,
        context: baseContext,
        details: { originalError: error.message }
      })
    }

    // Handle generic errors
    const errorMessage = error instanceof Error ? error.message : String(error)
    return this.createSaveError({
      type: SaveErrorType.UNKNOWN_ERROR,
      message: errorMessage,
      operation: context.action as 'save' | 'sync' | 'migrate' || 'save',
      retryable: true,
      context: baseContext,
      details: { originalError: errorMessage }
    })
  }

  /**
   * Process API-specific errors
   */
  private processApiError(apiError: GameStatsApiError, context: ErrorContext): SaveError {
    let saveErrorType: SaveErrorType
    let retryable = true

    // Map API error types to save error types
    switch (apiError.type) {
      case 'NETWORK_ERROR':
        saveErrorType = SaveErrorType.NETWORK_ERROR
        break
      case 'TOKEN_EXPIRED':
        saveErrorType = SaveErrorType.AUTH_ERROR
        retryable = false
        break
      case 'VALIDATION_ERROR':
        saveErrorType = SaveErrorType.VALIDATION_ERROR
        retryable = false
        break
      default:
        saveErrorType = SaveErrorType.UNKNOWN_ERROR
    }

    return this.createSaveError({
      type: saveErrorType,
      message: apiError.message,
      operation: context.action as 'save' | 'sync' | 'migrate' || 'save',
      retryable,
      context,
      details: apiError.details
    })
  }

  /**
   * Create a standardized SaveError object
   */
  private createSaveError(params: {
    type: SaveErrorType
    message: string
    operation: 'save' | 'sync' | 'migrate'
    retryable: boolean
    context: ErrorContext
    details?: any
  }): SaveError {
    return {
      type: params.type,
      message: params.message,
      operation: params.operation,
      gameType: params.context.gameType,
      userId: params.context.userId,
      retryable: params.retryable,
      timestamp: params.context.timestamp,
      context: params.context,
      details: params.details
    }
  }

  /**
   * Get user-friendly error message for display
   */
  getUserMessage(error: SaveError, isOffline: boolean = false): string {
    // Handle offline scenarios specially
    if (isOffline && error.type === SaveErrorType.NETWORK_ERROR) {
      return 'Saved offline - will sync when online'
    }

    switch (error.type) {
      case SaveErrorType.NETWORK_ERROR:
        return 'Unable to save to server. Please check your connection and try again.'
      
      case SaveErrorType.OFFLINE_SAVE:
        return 'Saved offline - will sync when online'
      
      case SaveErrorType.AUTH_ERROR:
        return 'Session expired. Please log in again to save your progress.'
      
      case SaveErrorType.VALIDATION_ERROR:
        return 'Invalid data. Please try again.'
      
      case SaveErrorType.STORAGE_ERROR:
        return 'Storage full. Please free up space and try again.'
      
      case SaveErrorType.UNKNOWN_ERROR:
        return 'Failed to save progress. Please try again.'
      
      default:
        return 'An error occurred while saving. Please try again.'
    }
  }

  /**
   * Get error display configuration
   */
  getDisplayConfig(error: SaveError): ErrorDisplayConfig {
    const baseConfig: ErrorDisplayConfig = {
      severity: ErrorSeverity.MEDIUM,
      showToUser: true,
      autoHide: true,
      hideAfterMs: 5000,
      allowRetry: error.retryable
    }

    switch (error.type) {
      case SaveErrorType.NETWORK_ERROR:
        return {
          ...baseConfig,
          severity: ErrorSeverity.LOW,
          hideAfterMs: 3000
        }
      
      case SaveErrorType.OFFLINE_SAVE:
        return {
          ...baseConfig,
          severity: ErrorSeverity.LOW,
          hideAfterMs: 2000,
          allowRetry: false
        }
      
      case SaveErrorType.AUTH_ERROR:
        return {
          ...baseConfig,
          severity: ErrorSeverity.HIGH,
          autoHide: false,
          allowRetry: false
        }
      
      case SaveErrorType.STORAGE_ERROR:
        return {
          ...baseConfig,
          severity: ErrorSeverity.HIGH,
          autoHide: false,
          allowRetry: false
        }
      
      case SaveErrorType.VALIDATION_ERROR:
        return {
          ...baseConfig,
          severity: ErrorSeverity.MEDIUM,
          allowRetry: false
        }
      
      default:
        return baseConfig
    }
  }

  /**
   * Get error recovery configuration
   */
  getRecoveryConfig(error: SaveError): ErrorRecoveryConfig {
    switch (error.type) {
      case SaveErrorType.NETWORK_ERROR:
        return {
          strategy: ErrorRecoveryStrategy.RETRY,
          maxRetries: 3,
          retryDelayMs: 2000
        }
      
      case SaveErrorType.AUTH_ERROR:
        return {
          strategy: ErrorRecoveryStrategy.ESCALATE,
          escalationAction: () => {
            // Trigger re-authentication
            console.warn('Authentication required for save operation')
          }
        }
      
      case SaveErrorType.STORAGE_ERROR:
        return {
          strategy: ErrorRecoveryStrategy.FALLBACK,
          fallbackAction: async () => {
            // Try to clear old data or use alternative storage
            console.warn('Storage full, attempting cleanup')
          }
        }
      
      case SaveErrorType.OFFLINE_SAVE:
        return {
          strategy: ErrorRecoveryStrategy.IGNORE // This is expected behavior
        }
      
      default:
        return {
          strategy: ErrorRecoveryStrategy.RETRY,
          maxRetries: 1,
          retryDelayMs: 1000
        }
    }
  }

  /**
   * Log error for debugging and monitoring
   */
  logError(error: SaveError): void {
    const logData = {
      type: error.type,
      message: error.message,
      operation: error.operation,
      gameType: error.gameType,
      userId: error.userId,
      retryable: error.retryable,
      timestamp: error.timestamp.toISOString(),
      context: error.context,
      details: error.details
    }

    // Log to console with appropriate level
    switch (this.getDisplayConfig(error).severity) {
      case ErrorSeverity.LOW:
        console.info('Save operation info:', logData)
        break
      case ErrorSeverity.MEDIUM:
        console.warn('Save operation warning:', logData)
        break
      case ErrorSeverity.HIGH:
      case ErrorSeverity.CRITICAL:
        console.error('Save operation error:', logData)
        break
    }

    // In a production app, you might also send to monitoring service
    // this.sendToMonitoring(logData)
  }

  /**
   * Check if error should trigger offline mode
   */
  shouldTriggerOfflineMode(error: SaveError): boolean {
    return error.type === SaveErrorType.NETWORK_ERROR && error.retryable
  }

  /**
   * Check if error should clear user session
   */
  shouldClearSession(error: SaveError): boolean {
    return error.type === SaveErrorType.AUTH_ERROR
  }
}

// Export singleton instance
export const saveErrorHandler = SaveErrorHandler.getInstance()
export default saveErrorHandler