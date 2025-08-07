/**
 * Tests for SaveErrorHandler - centralized save operation error handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SaveErrorHandler, saveErrorHandler } from '../SaveErrorHandler'
import { SaveErrorType, ErrorSeverity, ErrorRecoveryStrategy } from '../ErrorTypes'

// Mock the GameStatsApiError and AuthErrorType
const AuthErrorType = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  VALIDATION_ERROR: 'VALIDATION_ERROR'
} as const

class GameStatsApiError extends Error {
  public type: string
  public details?: any
  
  constructor({ type, message, details }: { type: string; message: string; details?: any }) {
    super(message)
    this.name = 'GameStatsApiError'
    this.type = type
    this.details = details
  }
}

// Mock navigator and window
Object.defineProperty(window, 'location', {
  value: { href: 'http://localhost:3000/test' },
  writable: true
})

Object.defineProperty(navigator, 'userAgent', {
  value: 'Mozilla/5.0 (Test Browser)',
  writable: true
})

describe('SaveErrorHandler', () => {
  let handler: SaveErrorHandler

  beforeEach(() => {
    handler = SaveErrorHandler.getInstance()
    vi.clearAllMocks()
  })

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = SaveErrorHandler.getInstance()
      const instance2 = SaveErrorHandler.getInstance()
      expect(instance1).toBe(instance2)
    })

    it('should be the same as exported instance', () => {
      expect(handler).toBe(saveErrorHandler)
    })
  })

  describe('processSaveError', () => {
    it('should process GameStatsApiError correctly', () => {
      const apiError = new GameStatsApiError({
        type: AuthErrorType.NETWORK_ERROR,
        message: 'Network connection failed'
      })

      const result = handler.processSaveError(apiError, {
        component: 'TestComponent',
        action: 'save',
        gameType: 'countries'
      })

      expect(result.type).toBe(SaveErrorType.NETWORK_ERROR)
      expect(result.message).toBe('Network connection failed')
      expect(result.operation).toBe('save')
      expect(result.gameType).toBe('countries')
      expect(result.retryable).toBe(true)
    })

    it('should process network errors correctly', () => {
      const networkError = new TypeError('fetch failed')

      const result = handler.processSaveError(networkError, {
        action: 'sync'
      })

      expect(result.type).toBe(SaveErrorType.NETWORK_ERROR)
      expect(result.message).toBe('Network connection failed')
      expect(result.operation).toBe('sync')
      expect(result.retryable).toBe(true)
    })

    it('should process storage quota errors correctly', () => {
      const quotaError = new DOMException('Storage quota exceeded', 'QuotaExceededError')
      Object.defineProperty(quotaError, 'name', {
        value: 'QuotaExceededError',
        writable: false
      })

      const result = handler.processSaveError(quotaError)

      expect(result.type).toBe(SaveErrorType.STORAGE_ERROR)
      expect(result.message).toBe('Storage quota exceeded')
      expect(result.retryable).toBe(false)
    })

    it('should process unknown errors correctly', () => {
      const unknownError = new Error('Something went wrong')

      const result = handler.processSaveError(unknownError)

      expect(result.type).toBe(SaveErrorType.UNKNOWN_ERROR)
      expect(result.message).toBe('Something went wrong')
      expect(result.retryable).toBe(true)
    })

    it('should handle non-Error objects', () => {
      const stringError = 'String error'

      const result = handler.processSaveError(stringError)

      expect(result.type).toBe(SaveErrorType.UNKNOWN_ERROR)
      expect(result.message).toBe('String error')
    })
  })

  describe('getUserMessage', () => {
    it('should return offline message when offline and network error', () => {
      const error = {
        type: SaveErrorType.NETWORK_ERROR,
        message: 'Network failed',
        operation: 'save' as const,
        retryable: true,
        timestamp: new Date()
      }

      const message = handler.getUserMessage(error, true)
      expect(message).toBe('Saved offline - will sync when online')
    })

    it('should return appropriate messages for different error types', () => {
      const testCases = [
        {
          type: SaveErrorType.NETWORK_ERROR,
          expected: 'Unable to save to server. Please check your connection and try again.'
        },
        {
          type: SaveErrorType.AUTH_ERROR,
          expected: 'Session expired. Please log in again to save your progress.'
        },
        {
          type: SaveErrorType.VALIDATION_ERROR,
          expected: 'Invalid data. Please try again.'
        },
        {
          type: SaveErrorType.STORAGE_ERROR,
          expected: 'Storage full. Please free up space and try again.'
        }
      ]

      testCases.forEach(({ type, expected }) => {
        const error = {
          type,
          message: 'Test error',
          operation: 'save' as const,
          retryable: true,
          timestamp: new Date()
        }

        const message = handler.getUserMessage(error, false)
        expect(message).toBe(expected)
      })
    })
  })

  describe('getDisplayConfig', () => {
    it('should return correct config for network errors', () => {
      const error = {
        type: SaveErrorType.NETWORK_ERROR,
        message: 'Network failed',
        operation: 'save' as const,
        retryable: true,
        timestamp: new Date()
      }

      const config = handler.getDisplayConfig(error)
      expect(config.severity).toBe(ErrorSeverity.LOW)
      expect(config.hideAfterMs).toBe(3000)
      expect(config.allowRetry).toBe(true)
    })

    it('should return correct config for auth errors', () => {
      const error = {
        type: SaveErrorType.AUTH_ERROR,
        message: 'Auth failed',
        operation: 'save' as const,
        retryable: false,
        timestamp: new Date()
      }

      const config = handler.getDisplayConfig(error)
      expect(config.severity).toBe(ErrorSeverity.HIGH)
      expect(config.autoHide).toBe(false)
      expect(config.allowRetry).toBe(false)
    })
  })

  describe('getRecoveryConfig', () => {
    it('should return retry strategy for network errors', () => {
      const error = {
        type: SaveErrorType.NETWORK_ERROR,
        message: 'Network failed',
        operation: 'save' as const,
        retryable: true,
        timestamp: new Date()
      }

      const config = handler.getRecoveryConfig(error)
      expect(config.strategy).toBe(ErrorRecoveryStrategy.RETRY)
      expect(config.maxRetries).toBe(3)
      expect(config.retryDelayMs).toBe(2000)
    })

    it('should return escalate strategy for auth errors', () => {
      const error = {
        type: SaveErrorType.AUTH_ERROR,
        message: 'Auth failed',
        operation: 'save' as const,
        retryable: false,
        timestamp: new Date()
      }

      const config = handler.getRecoveryConfig(error)
      expect(config.strategy).toBe(ErrorRecoveryStrategy.ESCALATE)
      expect(config.escalationAction).toBeDefined()
    })
  })

  describe('logError', () => {
    it('should log errors with appropriate level', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      const error = {
        type: SaveErrorType.AUTH_ERROR,
        message: 'Auth failed',
        operation: 'save' as const,
        retryable: false,
        timestamp: new Date(),
        context: { component: 'TestComponent' }
      }

      handler.logError(error)
      expect(consoleSpy).toHaveBeenCalledWith('Save operation error:', expect.any(Object))
      
      consoleSpy.mockRestore()
    })
  })

  describe('Utility Methods', () => {
    it('should correctly identify offline mode triggers', () => {
      const networkError = {
        type: SaveErrorType.NETWORK_ERROR,
        message: 'Network failed',
        operation: 'save' as const,
        retryable: true,
        timestamp: new Date()
      }

      expect(handler.shouldTriggerOfflineMode(networkError)).toBe(true)

      const authError = {
        type: SaveErrorType.AUTH_ERROR,
        message: 'Auth failed',
        operation: 'save' as const,
        retryable: false,
        timestamp: new Date()
      }

      expect(handler.shouldTriggerOfflineMode(authError)).toBe(false)
    })

    it('should correctly identify session clearing needs', () => {
      const authError = {
        type: SaveErrorType.AUTH_ERROR,
        message: 'Auth failed',
        operation: 'save' as const,
        retryable: false,
        timestamp: new Date()
      }

      expect(handler.shouldClearSession(authError)).toBe(true)

      const networkError = {
        type: SaveErrorType.NETWORK_ERROR,
        message: 'Network failed',
        operation: 'save' as const,
        retryable: true,
        timestamp: new Date()
      }

      expect(handler.shouldClearSession(networkError)).toBe(false)
    })
  })
})