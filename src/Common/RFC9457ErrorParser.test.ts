import { describe, it, expect, beforeEach, vi } from 'vitest'
import { RFC9457ErrorParser } from './RFC9457ErrorParser'
import { ProblemDetails, ValidationProblemDetails, RFC9457Error } from './types'

// Mock window.location for fallback error creation
Object.defineProperty(window, 'location', {
  value: {
    pathname: '/test-path'
  },
  writable: true
})

describe('RFC9457ErrorParser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('parseError', () => {
    it('should return RFC 9457 error when data is already in correct format', () => {
      const rfc9457Error: ProblemDetails = {
        type: 'https://example.com/problems/validation-error',
        title: 'Validation Error',
        status: 422,
        detail: 'The request contains invalid data',
        instance: '/api/auth/register'
      }

      const result = RFC9457ErrorParser.parseError(rfc9457Error)

      expect(result).toEqual(rfc9457Error)
    })

    it('should return RFC 9457 validation error when data contains errors field', () => {
      const validationError: ValidationProblemDetails = {
        type: 'https://example.com/problems/validation-error',
        title: 'Validation Error',
        status: 422,
        detail: 'The request contains invalid data',
        instance: '/api/auth/register',
        errors: {
          email: ['Invalid email format'],
          password: ['Password must be at least 8 characters long']
        }
      }

      const result = RFC9457ErrorParser.parseError(validationError)

      expect(result).toEqual(validationError)
    })

    it('should create fallback error for non-RFC 9457 format', () => {
      const oldFormatError = {
        Error: 'Something went wrong',
        Timestamp: '2023-01-01T00:00:00Z',
        Path: '/api/test'
      }

      const result = RFC9457ErrorParser.parseError(oldFormatError)

      expect(result).toEqual({
        type: 'about:blank',
        title: 'Unknown Error',
        status: 500,
        detail: 'Something went wrong',
        instance: '/test-path'
      })
    })

    it('should create fallback error for null/undefined input', () => {
      const result = RFC9457ErrorParser.parseError(null)

      expect(result).toEqual({
        type: 'about:blank',
        title: 'Unknown Error',
        status: 500,
        detail: 'An unexpected error occurred',
        instance: '/test-path'
      })
    })

    it('should create fallback error for primitive input', () => {
      const result = RFC9457ErrorParser.parseError('Simple error message')

      expect(result).toEqual({
        type: 'about:blank',
        title: 'Unknown Error',
        status: 500,
        detail: 'An unexpected error occurred',
        instance: '/test-path'
      })
    })

    it('should create fallback error for object with message field', () => {
      const errorWithMessage = {
        message: 'Network connection failed'
      }

      const result = RFC9457ErrorParser.parseError(errorWithMessage)

      expect(result).toEqual({
        type: 'about:blank',
        title: 'Unknown Error',
        status: 500,
        detail: 'Network connection failed',
        instance: '/test-path'
      })
    })
  })

  describe('isRFC9457Error', () => {
    it('should return true for object with type field', () => {
      const error = { type: 'https://example.com/problems/validation-error' }
      expect(RFC9457ErrorParser.isRFC9457Error(error)).toBe(true)
    })

    it('should return true for object with title field', () => {
      const error = { title: 'Validation Error' }
      expect(RFC9457ErrorParser.isRFC9457Error(error)).toBe(true)
    })

    it('should return true for object with status field', () => {
      const error = { status: 422 }
      expect(RFC9457ErrorParser.isRFC9457Error(error)).toBe(true)
    })

    it('should return true for object with detail field', () => {
      const error = { detail: 'The request contains invalid data' }
      expect(RFC9457ErrorParser.isRFC9457Error(error)).toBe(true)
    })

    it('should return true for object with multiple RFC 9457 fields', () => {
      const error = {
        type: 'https://example.com/problems/validation-error',
        title: 'Validation Error',
        status: 422,
        detail: 'The request contains invalid data'
      }
      expect(RFC9457ErrorParser.isRFC9457Error(error)).toBe(true)
    })

    it('should return false for null', () => {
      expect(RFC9457ErrorParser.isRFC9457Error(null)).toBe(false)
    })

    it('should return false for undefined', () => {
      expect(RFC9457ErrorParser.isRFC9457Error(undefined)).toBe(false)
    })

    it('should return false for primitive values', () => {
      expect(RFC9457ErrorParser.isRFC9457Error('error')).toBe(false)
      expect(RFC9457ErrorParser.isRFC9457Error(123)).toBe(false)
      expect(RFC9457ErrorParser.isRFC9457Error(true)).toBe(false)
    })

    it('should return false for object without RFC 9457 fields', () => {
      const error = {
        Error: 'Something went wrong',
        Timestamp: '2023-01-01T00:00:00Z',
        Path: '/api/test'
      }
      expect(RFC9457ErrorParser.isRFC9457Error(error)).toBe(false)
    })

    it('should return false for empty object', () => {
      expect(RFC9457ErrorParser.isRFC9457Error({})).toBe(false)
    })
  })

  describe('createFallbackError', () => {
    it('should create fallback error with message from Error field', () => {
      const errorData = {
        Error: 'Database connection failed',
        Timestamp: '2023-01-01T00:00:00Z'
      }

      const result = RFC9457ErrorParser.createFallbackError(errorData)

      expect(result).toEqual({
        type: 'about:blank',
        title: 'Unknown Error',
        status: 500,
        detail: 'Database connection failed',
        instance: '/test-path'
      })
    })

    it('should create fallback error with message from message field', () => {
      const errorData = {
        message: 'Request timeout'
      }

      const result = RFC9457ErrorParser.createFallbackError(errorData)

      expect(result).toEqual({
        type: 'about:blank',
        title: 'Unknown Error',
        status: 500,
        detail: 'Request timeout',
        instance: '/test-path'
      })
    })

    it('should create fallback error with default message for null input', () => {
      const result = RFC9457ErrorParser.createFallbackError(null)

      expect(result).toEqual({
        type: 'about:blank',
        title: 'Unknown Error',
        status: 500,
        detail: 'An unexpected error occurred',
        instance: '/test-path'
      })
    })

    it('should create fallback error with default message for empty object', () => {
      const result = RFC9457ErrorParser.createFallbackError({})

      expect(result).toEqual({
        type: 'about:blank',
        title: 'Unknown Error',
        status: 500,
        detail: 'An unexpected error occurred',
        instance: '/test-path'
      })
    })

    it('should use current window pathname as instance', () => {
      // Change the pathname for this test
      Object.defineProperty(window, 'location', {
        value: {
          pathname: '/different-path'
        },
        writable: true
      })

      const result = RFC9457ErrorParser.createFallbackError({})

      expect(result.instance).toBe('/different-path')

      // Reset for other tests
      Object.defineProperty(window, 'location', {
        value: {
          pathname: '/test-path'
        },
        writable: true
      })
    })
  })

  describe('getDisplayMessage', () => {
    it('should return detail when available', () => {
      const error: ProblemDetails = {
        type: 'https://example.com/problems/validation-error',
        title: 'Validation Error',
        status: 422,
        detail: 'The email field is required',
        instance: '/api/auth/register'
      }

      const result = RFC9457ErrorParser.getDisplayMessage(error)

      expect(result).toBe('The email field is required')
    })

    it('should return title when detail is not available', () => {
      const error: ProblemDetails = {
        type: 'https://example.com/problems/validation-error',
        title: 'Validation Error',
        status: 422,
        instance: '/api/auth/register'
      }

      const result = RFC9457ErrorParser.getDisplayMessage(error)

      expect(result).toBe('Validation Error')
    })

    it('should return fallback message when neither detail nor title are available', () => {
      const error: ProblemDetails = {
        type: 'https://example.com/problems/unknown-error',
        status: 500,
        instance: '/api/test'
      }

      const result = RFC9457ErrorParser.getDisplayMessage(error)

      expect(result).toBe('An error occurred')
    })

    it('should prefer detail over title when both are available', () => {
      const error: ProblemDetails = {
        type: 'https://example.com/problems/validation-error',
        title: 'Validation Error',
        status: 422,
        detail: 'Specific validation message',
        instance: '/api/auth/register'
      }

      const result = RFC9457ErrorParser.getDisplayMessage(error)

      expect(result).toBe('Specific validation message')
    })

    it('should handle empty strings correctly', () => {
      const error: ProblemDetails = {
        type: 'https://example.com/problems/validation-error',
        title: '',
        status: 422,
        detail: '',
        instance: '/api/auth/register'
      }

      const result = RFC9457ErrorParser.getDisplayMessage(error)

      expect(result).toBe('An error occurred')
    })
  })

  describe('getValidationErrors', () => {
    it('should return validation errors from ValidationProblemDetails', () => {
      const error: ValidationProblemDetails = {
        type: 'https://example.com/problems/validation-error',
        title: 'Validation Error',
        status: 422,
        detail: 'The request contains invalid data',
        instance: '/api/auth/register',
        errors: {
          email: ['Invalid email format', 'Email is required'],
          password: ['Password must be at least 8 characters long']
        }
      }

      const result = RFC9457ErrorParser.getValidationErrors(error)

      expect(result).toEqual({
        email: ['Invalid email format', 'Email is required'],
        password: ['Password must be at least 8 characters long']
      })
    })

    it('should return empty object for ProblemDetails without errors', () => {
      const error: ProblemDetails = {
        type: 'https://example.com/problems/authentication-error',
        title: 'Authentication Error',
        status: 401,
        detail: 'Invalid credentials',
        instance: '/api/auth/login'
      }

      const result = RFC9457ErrorParser.getValidationErrors(error)

      expect(result).toEqual({})
    })

    it('should return empty object when errors field is undefined', () => {
      const error: ValidationProblemDetails = {
        type: 'https://example.com/problems/validation-error',
        title: 'Validation Error',
        status: 422,
        detail: 'The request contains invalid data',
        instance: '/api/auth/register',
        errors: undefined
      }

      const result = RFC9457ErrorParser.getValidationErrors(error)

      expect(result).toEqual({})
    })

    it('should return empty object when errors field is null', () => {
      const error: ValidationProblemDetails = {
        type: 'https://example.com/problems/validation-error',
        title: 'Validation Error',
        status: 422,
        detail: 'The request contains invalid data',
        instance: '/api/auth/register',
        errors: null as any
      }

      const result = RFC9457ErrorParser.getValidationErrors(error)

      expect(result).toEqual({})
    })

    it('should return empty validation errors object', () => {
      const error: ValidationProblemDetails = {
        type: 'https://example.com/problems/validation-error',
        title: 'Validation Error',
        status: 422,
        detail: 'The request contains invalid data',
        instance: '/api/auth/register',
        errors: {}
      }

      const result = RFC9457ErrorParser.getValidationErrors(error)

      expect(result).toEqual({})
    })

    it('should handle complex validation error structure', () => {
      const error: ValidationProblemDetails = {
        type: 'https://example.com/problems/validation-error',
        title: 'Validation Error',
        status: 422,
        detail: 'Multiple validation errors occurred',
        instance: '/api/auth/register',
        errors: {
          'user.email': ['Email format is invalid'],
          'user.password': ['Password too short', 'Password must contain uppercase letter'],
          'user.confirmPassword': ['Passwords do not match']
        }
      }

      const result = RFC9457ErrorParser.getValidationErrors(error)

      expect(result).toEqual({
        'user.email': ['Email format is invalid'],
        'user.password': ['Password too short', 'Password must contain uppercase letter'],
        'user.confirmPassword': ['Passwords do not match']
      })
    })
  })
})