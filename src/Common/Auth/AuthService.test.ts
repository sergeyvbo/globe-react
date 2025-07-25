import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ValidationUtils, AuthService, AuthServiceError } from './AuthService'
import { AuthErrorType, AuthResponse, User } from '../types'

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

// Mock OAuth2Service
vi.mock('./OAuth2Service', () => ({
  oauth2Service: {
    initiateLogin: vi.fn(),
    loginWithPopup: vi.fn(),
    handleCallback: vi.fn(),
    isCallbackUrl: vi.fn(),
    getProviderFromCallback: vi.fn(),
  }
}))

// Mock localization
vi.mock('../Localization/strings', () => ({
  getAuthString: vi.fn((key: string) => {
    const strings: Record<string, string> = {
      emailRequired: 'Email is required',
      emailInvalid: 'Please enter a valid email address',
      passwordRequired: 'Password is required',
      passwordTooShort: 'Password must be at least 8 characters long',
      passwordMustContainLetterAndNumber: 'Password must contain at least one letter and one number',
      passwordsDoNotMatch: 'Passwords do not match',
    }
    return strings[key] || key
  })
}))

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
  const mockUser: User = {
    id: '1',
    email: 'test@example.com',
    provider: 'email',
    createdAt: new Date(),
    lastLoginAt: new Date()
  }

  const mockAuthResponse: AuthResponse = {
    user: mockUser,
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    expiresIn: 3600
  }

  beforeEach(() => {
    vi.clearAllMocks()
    authService = AuthService.getInstance()
  })

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = AuthService.getInstance()
      const instance2 = AuthService.getInstance()
      expect(instance1).toBe(instance2)
    })
  })

  describe('register', () => {
    it('should successfully register with valid data', async () => {
      const mockFetch = fetch as any
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(mockAuthResponse)
      })

      const result = await authService.register('test@example.com', 'password123', 'password123')
      
      expect(result).toEqual(mockAuthResponse)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/register'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'password123'
          })
        })
      )
    })

    it('should throw validation error for invalid data', async () => {
      await expect(authService.register('invalid-email', 'short', 'different')).rejects.toThrow(AuthServiceError)

      try {
        await authService.register('invalid-email', 'short', 'different')
      } catch (error) {
        expect(error).toBeInstanceOf(AuthServiceError)
        expect((error as AuthServiceError).type).toBe(AuthErrorType.VALIDATION_ERROR)
        expect((error as AuthServiceError).details.errors).toBeDefined()
      }
    })

    it('should handle API error responses', async () => {
      const mockFetch = fetch as any
      mockFetch.mockResolvedValue({
        ok: false,
        status: 409,
        json: vi.fn().mockResolvedValue({ message: 'User already exists' })
      })

      try {
        await authService.register('test@example.com', 'password123', 'password123')
      } catch (error) {
        expect(error).toBeInstanceOf(AuthServiceError)
        expect((error as AuthServiceError).type).toBe(AuthErrorType.USER_EXISTS)
        expect((error as AuthServiceError).message).toBe('User already exists')
      }
    })

    it('should handle network errors', async () => {
      const mockFetch = fetch as any
      mockFetch.mockRejectedValue(new Error('Network error'))

      try {
        await authService.register('test@example.com', 'password123', 'password123')
      } catch (error) {
        expect(error).toBeInstanceOf(AuthServiceError)
        expect((error as AuthServiceError).type).toBe(AuthErrorType.NETWORK_ERROR)
      }
    })
  })

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      const mockFetch = fetch as any
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(mockAuthResponse)
      })

      const result = await authService.login('test@example.com', 'password123')
      
      expect(result).toEqual(mockAuthResponse)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/login'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'password123'
          })
        })
      )
    })

    it('should throw validation error for invalid data', async () => {
      await expect(authService.login('invalid-email', '')).rejects.toThrow(AuthServiceError)

      try {
        await authService.login('invalid-email', '')
      } catch (error) {
        expect(error).toBeInstanceOf(AuthServiceError)
        expect((error as AuthServiceError).type).toBe(AuthErrorType.VALIDATION_ERROR)
      }
    })

    it('should handle invalid credentials', async () => {
      const mockFetch = fetch as any
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: vi.fn().mockResolvedValue({ message: 'Invalid credentials' })
      })

      try {
        await authService.login('test@example.com', 'wrongpassword')
      } catch (error) {
        expect(error).toBeInstanceOf(AuthServiceError)
        expect((error as AuthServiceError).type).toBe(AuthErrorType.INVALID_CREDENTIALS)
      }
    })

    it('should handle network errors', async () => {
      const mockFetch = fetch as any
      mockFetch.mockRejectedValue(new Error('Network error'))

      try {
        await authService.login('test@example.com', 'password123')
      } catch (error) {
        expect(error).toBeInstanceOf(AuthServiceError)
        expect((error as AuthServiceError).type).toBe(AuthErrorType.NETWORK_ERROR)
      }
    })
  })

  describe('refreshToken', () => {
    it('should successfully refresh token', async () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'auth_refresh_token') {
          return 'valid-refresh-token'
        }
        return null
      })

      const mockFetch = fetch as any
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(mockAuthResponse)
      })

      const result = await authService.refreshToken()
      
      expect(result).toEqual(mockAuthResponse)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/refresh'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            refreshToken: 'valid-refresh-token'
          })
        })
      )
    })

    it('should throw error when no refresh token available', async () => {
      localStorageMock.getItem.mockReturnValue(null)

      await expect(authService.refreshToken()).rejects.toThrow(AuthServiceError)

      try {
        await authService.refreshToken()
      } catch (error) {
        expect(error).toBeInstanceOf(AuthServiceError)
        expect((error as AuthServiceError).type).toBe(AuthErrorType.TOKEN_EXPIRED)
      }
    })

    it('should handle invalid refresh token', async () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'auth_refresh_token') {
          return 'invalid-refresh-token'
        }
        return null
      })

      const mockFetch = fetch as any
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: vi.fn().mockResolvedValue({ message: 'Invalid refresh token' })
      })

      try {
        await authService.refreshToken()
      } catch (error) {
        expect(error).toBeInstanceOf(AuthServiceError)
        expect((error as AuthServiceError).type).toBe(AuthErrorType.INVALID_CREDENTIALS)
      }
    })
  })

  describe('logout', () => {
    it('should successfully logout', async () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'auth_access_token') {
          return 'valid-access-token'
        }
        return null
      })

      const mockFetch = fetch as any
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({})
      })

      await authService.logout()
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/logout'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer valid-access-token'
          })
        })
      )
    })

    it('should handle logout without token', async () => {
      localStorageMock.getItem.mockReturnValue(null)

      const mockFetch = fetch as any
      mockFetch.mockClear()

      await authService.logout()
      
      // Should not make API call when no token is available
      expect(mockFetch).not.toHaveBeenCalled()
      
      // Should still clear tokens (which is a no-op when no tokens exist)
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_access_token')
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_refresh_token')
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_token_expiry')
    })

    it('should handle logout API errors gracefully', async () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'auth_access_token') {
          return 'valid-access-token'
        }
        return null
      })

      const mockFetch = fetch as any
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: vi.fn().mockResolvedValue({ message: 'Server error' })
      })

      // Should not throw error, just log warning
      await expect(authService.logout()).resolves.toBeUndefined()
    })
  })

  describe('updateProfile', () => {
    it('should successfully update profile', async () => {
      const futureTime = Date.now() + 60 * 60 * 1000 // 1 hour from now
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'auth_access_token') {
          return 'valid-access-token'
        }
        if (key === 'auth_token_expiry') {
          return futureTime.toString()
        }
        return null
      })

      const updatedUser = { ...mockUser, email: 'updated@example.com' }
      const mockFetch = fetch as any
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(updatedUser)
      })

      const result = await authService.updateProfile({ email: 'updated@example.com' })
      
      expect(result).toEqual(updatedUser)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/profile'),
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            'Authorization': 'Bearer valid-access-token'
          }),
          body: JSON.stringify({ email: 'updated@example.com' })
        })
      )
    })

    it('should throw error when not authenticated', async () => {
      localStorageMock.getItem.mockReturnValue(null)

      await expect(authService.updateProfile({ email: 'updated@example.com' })).rejects.toThrow(AuthServiceError)

      try {
        await authService.updateProfile({ email: 'updated@example.com' })
      } catch (error) {
        expect(error).toBeInstanceOf(AuthServiceError)
        expect((error as AuthServiceError).type).toBe(AuthErrorType.TOKEN_EXPIRED)
      }
    })
  })

  describe('loginWithOAuth', () => {
    it('should initiate OAuth login', async () => {
      const { oauth2Service } = await import('./OAuth2Service')
      const mockOAuth2Response = {
        user: mockUser,
        accessToken: 'oauth-access-token',
        refreshToken: 'oauth-refresh-token',
        expiresIn: 3600
      }
      
      oauth2Service.loginWithPopup = vi.fn().mockResolvedValue(mockOAuth2Response)
      
      const result = await authService.loginWithOAuth('google')
      
      expect(oauth2Service.loginWithPopup).toHaveBeenCalledWith('google')
      expect(result).toEqual(mockOAuth2Response)
    })

    it('should handle OAuth callback', async () => {
      const { oauth2Service } = await import('./OAuth2Service')
      const mockOAuth2Response = {
        user: mockUser,
        accessToken: 'oauth-access-token',
        refreshToken: 'oauth-refresh-token',
        expiresIn: 3600
      }
      
      oauth2Service.loginWithPopup = vi.fn().mockResolvedValue(mockOAuth2Response)

      const result = await authService.loginWithOAuth('google')
      
      expect(oauth2Service.loginWithPopup).toHaveBeenCalledWith('google')
      expect(result).toEqual(mockOAuth2Response)
    })
  })

  describe('isAuthenticated', () => {
    it('should return false when no token', () => {
      localStorageMock.getItem.mockReturnValue(null)
      expect(authService.isAuthenticated()).toBe(false)
    })

    it('should return false when token is expired', () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'auth_session') {
          return JSON.stringify({
            accessToken: 'token',
            expiresAt: new Date(Date.now() - 1000).toISOString() // Expired
          })
        }
        return null
      })
      expect(authService.isAuthenticated()).toBe(false)
    })

    it('should return true when token is valid', () => {
      const futureTime = Date.now() + 60 * 60 * 1000 // 1 hour from now
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'auth_access_token') {
          return 'valid-token'
        }
        if (key === 'auth_token_expiry') {
          return futureTime.toString()
        }
        return null
      })
      expect(authService.isAuthenticated()).toBe(true)
    })

    it('should handle malformed session data', () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'auth_session') {
          return 'invalid-json'
        }
        return null
      })
      expect(authService.isAuthenticated()).toBe(false)
    })
  })

  describe('getSession', () => {
    it('should return valid session', () => {
      const futureTime = Date.now() + 60 * 60 * 1000 // 1 hour from now
      const expiryDate = new Date(futureTime)
      
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'auth_access_token') {
          return 'token'
        }
        if (key === 'auth_refresh_token') {
          return 'refresh-token'
        }
        if (key === 'auth_token_expiry') {
          return futureTime.toString()
        }
        return null
      })

      const session = authService.getSession()
      expect(session).toBeDefined()
      expect(session?.accessToken).toBe('token')
      expect(session?.refreshToken).toBe('refresh-token')
      expect(session?.expiresAt).toEqual(expiryDate)
    })

    it('should return null for invalid session', () => {
      localStorageMock.getItem.mockReturnValue(null)
      const session = authService.getSession()
      expect(session).toBeNull()
    })
  })
})