/**
 * Tests for useSaveErrorHandler hook
 */

import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useSaveErrorHandler } from '../useSaveErrorHandler'
import { SaveErrorType } from '../ErrorTypes'

// Mock the offline detector
vi.mock('../../Network/useOfflineDetector', () => ({
  useOfflineDetector: () => ({ isOffline: false })
}))

// Mock the save error handler
vi.mock('../SaveErrorHandler', () => ({
  saveErrorHandler: {
    processSaveError: vi.fn(),
    logError: vi.fn(),
    getUserMessage: vi.fn(),
    getDisplayConfig: vi.fn()
  }
}))

describe('useSaveErrorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Initial State', () => {
    it('should initialize with no error', () => {
      const { result } = renderHook(() => useSaveErrorHandler())

      expect(result.current.error).toBeNull()
      expect(result.current.isRetrying).toBe(false)
      expect(result.current.retryCount).toBe(0)
      expect(result.current.canRetry).toBe(false)
    })
  })

  describe('Error Handling', () => {
    it('should handle errors correctly', () => {
      const mockProcessedError = {
        type: SaveErrorType.NETWORK_ERROR,
        message: 'Network failed',
        operation: 'save' as const,
        retryable: true,
        timestamp: new Date()
      }

      const { saveErrorHandler } = require('../SaveErrorHandler')
      saveErrorHandler.processSaveError.mockReturnValue(mockProcessedError)

      const { result } = renderHook(() => useSaveErrorHandler())

      act(() => {
        result.current.handleError(new Error('Network failed'))
      })

      expect(result.current.error).toEqual(mockProcessedError)
      expect(saveErrorHandler.processSaveError).toHaveBeenCalledWith(
        expect.any(Error),
        {}
      )
      expect(saveErrorHandler.logError).toHaveBeenCalledWith(mockProcessedError)
    })

    it('should call custom error handler', () => {
      const onError = vi.fn()
      const mockProcessedError = {
        type: SaveErrorType.NETWORK_ERROR,
        message: 'Network failed',
        operation: 'save' as const,
        retryable: true,
        timestamp: new Date()
      }

      const { saveErrorHandler } = require('../SaveErrorHandler')
      saveErrorHandler.processSaveError.mockReturnValue(mockProcessedError)

      const { result } = renderHook(() => useSaveErrorHandler({ onError }))

      act(() => {
        result.current.handleError(new Error('Network failed'))
      })

      expect(onError).toHaveBeenCalledWith(mockProcessedError)
    })

    it('should merge context correctly', () => {
      const baseContext = { component: 'TestComponent' }
      const additionalContext = { gameType: 'countries' }
      
      const { saveErrorHandler } = require('../SaveErrorHandler')
      saveErrorHandler.processSaveError.mockReturnValue({
        type: SaveErrorType.NETWORK_ERROR,
        message: 'Network failed',
        operation: 'save' as const,
        retryable: true,
        timestamp: new Date()
      })

      const { result } = renderHook(() => 
        useSaveErrorHandler({ context: baseContext })
      )

      act(() => {
        result.current.handleError(new Error('Network failed'), additionalContext)
      })

      expect(saveErrorHandler.processSaveError).toHaveBeenCalledWith(
        expect.any(Error),
        { ...baseContext, ...additionalContext }
      )
    })
  })

  describe('Retry Functionality', () => {
    it('should retry successfully', async () => {
      const mockOperation = vi.fn().mockResolvedValue(undefined)
      const mockProcessedError = {
        type: SaveErrorType.NETWORK_ERROR,
        message: 'Network failed',
        operation: 'save' as const,
        retryable: true,
        timestamp: new Date()
      }

      const { saveErrorHandler } = require('../SaveErrorHandler')
      saveErrorHandler.processSaveError.mockReturnValue(mockProcessedError)

      const { result } = renderHook(() => useSaveErrorHandler())

      // Set up error and retry operation
      act(() => {
        result.current.handleError(new Error('Network failed'))
        result.current.setRetryOperation(mockOperation)
      })

      expect(result.current.canRetry).toBe(true)

      // Perform retry
      await act(async () => {
        await result.current.retry()
      })

      expect(mockOperation).toHaveBeenCalled()
      expect(result.current.error).toBeNull()
      expect(result.current.retryCount).toBe(0)
    })

    it('should handle retry failure', async () => {
      const mockOperation = vi.fn().mockRejectedValue(new Error('Retry failed'))
      const mockProcessedError = {
        type: SaveErrorType.NETWORK_ERROR,
        message: 'Network failed',
        operation: 'save' as const,
        retryable: true,
        timestamp: new Date()
      }

      const mockRetryError = {
        type: SaveErrorType.NETWORK_ERROR,
        message: 'Retry failed',
        operation: 'retry' as const,
        retryable: true,
        timestamp: new Date()
      }

      const { saveErrorHandler } = require('../SaveErrorHandler')
      saveErrorHandler.processSaveError
        .mockReturnValueOnce(mockProcessedError)
        .mockReturnValueOnce(mockRetryError)

      const { result } = renderHook(() => useSaveErrorHandler())

      // Set up error and retry operation
      act(() => {
        result.current.handleError(new Error('Network failed'))
        result.current.setRetryOperation(mockOperation)
      })

      // Perform retry
      await act(async () => {
        await result.current.retry()
      })

      expect(mockOperation).toHaveBeenCalled()
      expect(result.current.error).toEqual(mockRetryError)
      expect(result.current.retryCount).toBe(1)
    })

    it('should respect max retries', async () => {
      const mockOperation = vi.fn().mockRejectedValue(new Error('Always fails'))
      const maxRetries = 2
      
      const { result } = renderHook(() => 
        useSaveErrorHandler({ maxRetries })
      )

      const { saveErrorHandler } = require('../SaveErrorHandler')
      saveErrorHandler.processSaveError.mockReturnValue({
        type: SaveErrorType.NETWORK_ERROR,
        message: 'Network failed',
        operation: 'save' as const,
        retryable: true,
        timestamp: new Date()
      })

      // Set up error and retry operation
      act(() => {
        result.current.handleError(new Error('Network failed'))
        result.current.setRetryOperation(mockOperation)
      })

      // Perform retries up to max
      await act(async () => {
        await result.current.retry() // Retry 1
      })
      await act(async () => {
        await result.current.retry() // Retry 2
      })

      expect(result.current.retryCount).toBe(2)
      expect(result.current.canRetry).toBe(false)

      // Should not retry beyond max
      await act(async () => {
        await result.current.retry() // Should not execute
      })

      expect(mockOperation).toHaveBeenCalledTimes(2)
    })

    it('should add retry delay', async () => {
      const mockOperation = vi.fn().mockResolvedValue(undefined)
      const retryDelayMs = 100
      
      const { result } = renderHook(() => 
        useSaveErrorHandler({ retryDelayMs })
      )

      const { saveErrorHandler } = require('../SaveErrorHandler')
      saveErrorHandler.processSaveError.mockReturnValue({
        type: SaveErrorType.NETWORK_ERROR,
        message: 'Network failed',
        operation: 'save' as const,
        retryable: true,
        timestamp: new Date()
      })

      // Set up error and retry operation
      act(() => {
        result.current.handleError(new Error('Network failed'))
        result.current.setRetryOperation(mockOperation)
      })

      const startTime = Date.now()
      
      await act(async () => {
        await result.current.retry()
      })

      const endTime = Date.now()
      const elapsed = endTime - startTime

      expect(elapsed).toBeGreaterThanOrEqual(retryDelayMs - 10) // Allow some tolerance
      expect(mockOperation).toHaveBeenCalled()
    })
  })

  describe('Clear Error', () => {
    it('should clear error state', () => {
      const { result } = renderHook(() => useSaveErrorHandler())

      const { saveErrorHandler } = require('../SaveErrorHandler')
      saveErrorHandler.processSaveError.mockReturnValue({
        type: SaveErrorType.NETWORK_ERROR,
        message: 'Network failed',
        operation: 'save' as const,
        retryable: true,
        timestamp: new Date()
      })

      // Set error
      act(() => {
        result.current.handleError(new Error('Network failed'))
      })

      expect(result.current.error).not.toBeNull()

      // Clear error
      act(() => {
        result.current.clearError()
      })

      expect(result.current.error).toBeNull()
      expect(result.current.retryCount).toBe(0)
      expect(result.current.isRetrying).toBe(false)
    })
  })

  describe('Can Retry Logic', () => {
    it('should determine retry capability correctly', () => {
      const { result } = renderHook(() => useSaveErrorHandler())

      const { saveErrorHandler } = require('../SaveErrorHandler')
      
      // Non-retryable error
      saveErrorHandler.processSaveError.mockReturnValue({
        type: SaveErrorType.AUTH_ERROR,
        message: 'Auth failed',
        operation: 'save' as const,
        retryable: false,
        timestamp: new Date()
      })

      act(() => {
        result.current.handleError(new Error('Auth failed'))
        result.current.setRetryOperation(vi.fn())
      })

      expect(result.current.canRetry).toBe(false)

      // Retryable error
      saveErrorHandler.processSaveError.mockReturnValue({
        type: SaveErrorType.NETWORK_ERROR,
        message: 'Network failed',
        operation: 'save' as const,
        retryable: true,
        timestamp: new Date()
      })

      act(() => {
        result.current.handleError(new Error('Network failed'))
        result.current.setRetryOperation(vi.fn())
      })

      expect(result.current.canRetry).toBe(true)
    })
  })
})