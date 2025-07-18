import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ValidationUtils, AuthService, AuthServiceError } from './AuthService'
import { AuthErrorType } from './types'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

// Mock fetch
global.fetch = vi.fn()

describe('ValidationUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('validateEmail', () => {
    it('should validate correct email', () => {
      const result = ValidationUtils.validateEmail('test@example.com')
      expect(result.isValid).toBe(true)
      expect(result.message).toBeUndefined()
    })

    it('should reject empty email', () => {
      const result = ValidationUtils.validateEmail('')
      expect(result.isValid).toBe(false)
      expect(result.message).toBe('Email is required')
    })

    it('should reject invalid email format', () => {
      const result = ValidationUtils.validateEmail('invalid-email')
      expect(result.isValid).toBe(false)
      expect(result.message).toBe('Please enter a valid email address')
    })
  })

  describe('validatePassword', () => {
    it('should validate correct password', () => {
      const result = ValidationUtils.validatePassword('password123')
      expect(result.isValid).toBe(true)
      expect(result.message).toBeUndefined()
    })

    it('should reject empty password', () => {
      const result = ValidationUtils.validatePassword('')
      expect(result.isValid).toBe(false)
      expect(result.message).toBe('Password is required')
    })

    it('should reject short password', () => {
      const result = ValidationUtils.validatePassword('short')
      expect(result.isValid).toBe(false)
      expect(result.message).toBe('Password must be at least 8 characters long')
    })

    it('should reject password without letter', () => {
      const result = ValidationUtils.validatePassword('12345678')
      expect(result.isValid).toBe(false)
      expect(result.message).toBe('Password must contain at least one letter and one number')
    })

    it('should reject password without number', () => {
      const result = ValidationUtils.validatePassword('password')
      expect(result.isValid).toBe(false)
      expect(result.message).toBe('Password must contain at least one letter and one number')
    })
  })

  describe('validatePasswordConfirmation', () => {
    it('should validate matching passwords', () => {
      const result = ValidationUtils.validatePasswordConfirmation('password123', 'password123')
      expect(result.isValid).toBe(true)
      expect(result.message).toBeUndefined()
    })

    it('should reject non-matching passwords', () => {
      const result = ValidationUtils.validatePasswordConfirmation('password123', 'different123')
      expect(result.isValid).toBe(false)
      expect(result.message).toBe('Passwords do not match')
    })
  })

  describe('validateRegistrationData', () => {
    it('should validate correct registration data', () => {
      const result = ValidationUtils.validateRegistrationData(
        'test@example.com',
        'password123',
        'password123'
      )
      expect(result.isValid).toBe(true)
      expect(Object.keys(result.errors)).toHaveLength(0)
    })

    it('should return all validation errors', () => {
      const result = ValidationUtils.validateRegistrationData(
        'invalid-email',
        'short',
        'different'
      )
      expect(result.isValid).toBe(false)
      expect(result.errors.email).toBe('Please enter a valid email address')
      expect(result.errors.password).toBe('Password must be at least 8 characters long')
      expect(result.errors.confirmPassword).toBe('Passwords do not match')
    })
  })

  describe('validateLoginData', () => {
    it('should validate correct login data', () => {
      const result = ValidationUtils.validateLoginData('test@example.com', 'password123')
      expect(result.isValid).toBe(true)
      expect(Object.keys(result.errors)).toHaveLength(0)
    })

    it('should return validation errors', () => {
      const result = ValidationUtils.validateLoginData('invalid-email', '')
      expect(result.isValid).toBe(false)
      expect(result.errors.email).toBe('Please enter a valid email address')
      expect(result.errors.password).toBe('Password is required')
    })
  })
})

describe('AuthService', () => {
  let authService: AuthService

  beforeEach(() => {
    vi.clearAllMocks()
    authService = AuthService.getInstance()
  })

  describe('register', () => {
    it('should throw validation error for invalid data', async () => {
      await expect(async () => {
        await authService.register('invalid-email', 'short', 'different')
      }).rejects.toThrow()

      try {
        await authService.register('invalid-email', 'short', 'different')
      } catch (error) {
        expect(error).toBeInstanceOf(AuthServiceError)
        expect((error as AuthServiceError).type).toBe(AuthErrorType.VALIDATION_ERROR)
        expect((error as AuthServiceError).details.errors).toBeDefined()
      }
    })

    it('should handle network errors', async () => {
      const mockFetch = fetch as any
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(async () => {
        await authService.register('test@example.com', 'password123', 'password123')
      }).rejects.toThrow()

      try {
        await authService.register('test@example.com', 'password123', 'password123')
      } catch (error) {
        expect(error).toBeInstanceOf(AuthServiceError)
        expect((error as AuthServiceError).type).toBe(AuthErrorType.NETWORK_ERROR)
      }
    })
  })

  describe('login', () => {
    it('should throw validation error for invalid data', async () => {
      await expect(async () => {
        await authService.login('invalid-email', '')
      }).rejects.toThrow()

      try {
        await authService.login('invalid-email', '')
      } catch (error) {
        expect(error).toBeInstanceOf(AuthServiceError)
        expect((error as AuthServiceError).type).toBe(AuthErrorType.VALIDATION_ERROR)
      }
    })

    it('should handle network errors', async () => {
      const mockFetch = fetch as any
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(async () => {
        await authService.login('test@example.com', 'password123')
      }).rejects.toThrow()

      try {
        await authService.login('test@example.com', 'password123')
      } catch (error) {
        expect(error).toBeInstanceOf(AuthServiceError)
        expect((error as AuthServiceError).type).toBe(AuthErrorType.NETWORK_ERROR)
      }
    })
  })

  describe('isAuthenticated', () => {
    it('should return false when no token', () => {
      localStorageMock.getItem.mockReturnValue(null)
      expect(authService.isAuthenticated()).toBe(false)
    })

    it('should return false when token is expired', () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'auth_access_token') return 'token'
        if (key === 'auth_token_expiry') return (Date.now() - 1000).toString() // Expired
        return null
      })
      expect(authService.isAuthenticated()).toBe(false)
    })

    it('should return true when token is valid', () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'auth_access_token') return 'token'
        if (key === 'auth_token_expiry') return (Date.now() + 1000).toString() // Valid
        return null
      })
      expect(authService.isAuthenticated()).toBe(true)
    })
  })
})