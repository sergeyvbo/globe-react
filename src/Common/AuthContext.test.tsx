import React from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, beforeEach, afterEach, describe, it, expect } from 'vitest'
import { AuthProvider, useAuth } from './AuthContext'
import { authService } from './AuthService'
import { gameProgressService } from './GameProgressService'
import { AuthResponse, User, AuthErrorType } from './types'

// Mock the AuthService
vi.mock('./AuthService', () => ({
  authService: {
    login: vi.fn(),
    register: vi.fn(),
    loginWithOAuth: vi.fn(),
    logout: vi.fn(),
    updateProfile: vi.fn(),
    refreshToken: vi.fn(),
  }
}))

// Mock the GameProgressService
vi.mock('./GameProgressService', () => ({
  gameProgressService: {
    autoSyncOnAuth: vi.fn().mockResolvedValue(undefined)
  }
}))

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
})

// Mock console to reduce noise
const consoleMock = {
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}
Object.defineProperty(console, 'log', { value: consoleMock.log })
Object.defineProperty(console, 'warn', { value: consoleMock.warn })
Object.defineProperty(console, 'error', { value: consoleMock.error })

// Test component that uses the auth context
const TestComponent: React.FC = () => {
  const { user, isAuthenticated, isLoading, login, register, loginWithOAuth, logout, updateProfile } = useAuth()
  
  return (
    <div>
      <div data-testid="loading">{isLoading ? 'loading' : 'not-loading'}</div>
      <div data-testid="authenticated">{isAuthenticated ? 'authenticated' : 'not-authenticated'}</div>
      <div data-testid="user">{user ? user.email : 'no-user'}</div>
      <button onClick={() => login('test@example.com', 'password123')} data-testid="login-btn">
        Login
      </button>
      <button onClick={() => register('test@example.com', 'password123')} data-testid="register-btn">
        Register
      </button>
      <button onClick={() => loginWithOAuth('google')} data-testid="oauth-btn">
        OAuth Login
      </button>
      <button onClick={logout} data-testid="logout-btn">
        Logout
      </button>
      <button onClick={() => updateProfile({ email: 'new@example.com' })} data-testid="update-btn">
        Update Profile
      </button>
    </div>
  )
}

const renderWithAuthProvider = () => {
  return render(
    <AuthProvider>
      <TestComponent />
    </AuthProvider>
  )
}

describe('AuthContext', () => {
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
    mockLocalStorage.getItem.mockReturnValue(null)
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  describe('Initialization', () => {
    it('should initialize with loading state', async () => {
      renderWithAuthProvider()
      
      expect(screen.getByTestId('loading')).toHaveTextContent('loading')
      expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated')
      
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading')
      }, { timeout: 1000 })
    })

    it('should restore valid session from localStorage', async () => {
      const futureExpiry = new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now
      
      mockLocalStorage.getItem.mockImplementation((key) => {
        switch (key) {
          case 'auth_session':
            return JSON.stringify({
              accessToken: 'valid-token',
              refreshToken: 'valid-refresh-token',
              expiresAt: futureExpiry.toISOString()
            })
          case 'auth_user':
            return JSON.stringify({
              ...mockUser,
              createdAt: mockUser.createdAt.toISOString(),
              lastLoginAt: mockUser.lastLoginAt?.toISOString()
            })
          case 'auth_last_activity':
            return Date.now().toString()
          default:
            return null
        }
      })

      renderWithAuthProvider()

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated')
        expect(screen.getByTestId('user')).toHaveTextContent('test@example.com')
      }, { timeout: 1000 })
    })

    it('should clear expired session', async () => {
      const pastExpiry = new Date(Date.now() - 60 * 60 * 1000) // 1 hour ago
      
      mockLocalStorage.getItem.mockImplementation((key) => {
        switch (key) {
          case 'auth_session':
            return JSON.stringify({
              accessToken: 'expired-token',
              refreshToken: 'expired-refresh-token',
              expiresAt: pastExpiry.toISOString()
            })
          case 'auth_user':
            return JSON.stringify({
              ...mockUser,
              createdAt: mockUser.createdAt.toISOString()
            })
          default:
            return null
        }
      })

      renderWithAuthProvider()

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated')
        expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth_session')
        expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth_user')
      }, { timeout: 1000 })
    })
  })

  describe('Authentication Methods', () => {
    it('should handle successful login', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      authService.login = vi.fn().mockResolvedValue(mockAuthResponse)

      renderWithAuthProvider()

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading')
      })

      await user.click(screen.getByTestId('login-btn'))

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated')
        expect(screen.getByTestId('user')).toHaveTextContent('test@example.com')
      })

      expect(authService.login).toHaveBeenCalledWith('test@example.com', 'password123')
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('auth_session', expect.any(String))
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('auth_user', expect.any(String))
    })

    it('should handle login error', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      const loginError = new Error('Invalid credentials') as any
      loginError.type = AuthErrorType.INVALID_CREDENTIALS
      authService.login = vi.fn().mockRejectedValue(loginError)

      renderWithAuthProvider()

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading')
      })

      await expect(async () => {
        await user.click(screen.getByTestId('login-btn'))
        await waitFor(() => {
          expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated')
        })
      }).rejects.toThrow()

      expect(authService.login).toHaveBeenCalled()
    })

    it('should handle successful registration', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      authService.register = vi.fn().mockResolvedValue(mockAuthResponse)

      renderWithAuthProvider()

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading')
      })

      await user.click(screen.getByTestId('register-btn'))

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated')
        expect(screen.getByTestId('user')).toHaveTextContent('test@example.com')
      })

      expect(authService.register).toHaveBeenCalledWith('test@example.com', 'password123', 'password123')
    })

    it('should handle OAuth login', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      authService.loginWithOAuth = vi.fn().mockResolvedValue(mockAuthResponse)

      renderWithAuthProvider()

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading')
      })

      await user.click(screen.getByTestId('oauth-btn'))

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated')
      })

      expect(authService.loginWithOAuth).toHaveBeenCalledWith('google')
    })

    it('should handle logout', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      authService.logout = vi.fn().mockResolvedValue(undefined)

      // First set up authenticated state
      mockLocalStorage.getItem.mockImplementation((key) => {
        switch (key) {
          case 'auth_session':
            return JSON.stringify({
              accessToken: 'valid-token',
              refreshToken: 'valid-refresh-token',
              expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString()
            })
          case 'auth_user':
            return JSON.stringify({
              ...mockUser,
              createdAt: mockUser.createdAt.toISOString(),
              lastLoginAt: mockUser.lastLoginAt?.toISOString()
            })
          case 'auth_last_activity':
            return Date.now().toString()
          default:
            return null
        }
      })

      renderWithAuthProvider()

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated')
      })

      await user.click(screen.getByTestId('logout-btn'))

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated')
        expect(screen.getByTestId('user')).toHaveTextContent('no-user')
      })

      expect(authService.logout).toHaveBeenCalled()
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth_session')
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth_user')
    })

    it('should handle profile update', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      const updatedUser = { ...mockUser, email: 'new@example.com' }
      authService.updateProfile = vi.fn().mockResolvedValue(updatedUser)

      // Set up authenticated state
      mockLocalStorage.getItem.mockImplementation((key) => {
        switch (key) {
          case 'auth_session':
            return JSON.stringify({
              accessToken: 'valid-token',
              refreshToken: 'valid-refresh-token',
              expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString()
            })
          case 'auth_user':
            return JSON.stringify({
              ...mockUser,
              createdAt: mockUser.createdAt.toISOString(),
              lastLoginAt: mockUser.lastLoginAt?.toISOString()
            })
          case 'auth_last_activity':
            return Date.now().toString()
          default:
            return null
        }
      })

      renderWithAuthProvider()

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated')
      })

      await user.click(screen.getByTestId('update-btn'))

      await waitFor(() => {
        expect(authService.updateProfile).toHaveBeenCalledWith({ email: 'new@example.com' })
      })
    })
  })

  describe('Session Management', () => {
    it('should attempt token refresh when session is close to expiry', async () => {
      const closeExpiry = new Date(Date.now() + 4 * 60 * 1000) // 4 minutes from now
      
      mockLocalStorage.getItem.mockImplementation((key) => {
        switch (key) {
          case 'auth_session':
            return JSON.stringify({
              accessToken: 'expiring-token',
              refreshToken: 'valid-refresh-token',
              expiresAt: closeExpiry.toISOString()
            })
          case 'auth_user':
            return JSON.stringify({
              ...mockUser,
              createdAt: mockUser.createdAt.toISOString(),
              lastLoginAt: mockUser.lastLoginAt?.toISOString()
            })
          case 'auth_last_activity':
            return Date.now().toString()
          default:
            return null
        }
      })

      authService.refreshToken = vi.fn().mockResolvedValue(mockAuthResponse)

      renderWithAuthProvider()

      await waitFor(() => {
        expect(authService.refreshToken).toHaveBeenCalled()
      }, { timeout: 2000 })
    })

    it('should logout if user is inactive for too long', async () => {
      const futureExpiry = new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now
      const oldActivity = Date.now() - (31 * 60 * 1000) // 31 minutes ago
      
      mockLocalStorage.getItem.mockImplementation((key) => {
        switch (key) {
          case 'auth_session':
            return JSON.stringify({
              accessToken: 'valid-token',
              refreshToken: 'valid-refresh-token',
              expiresAt: futureExpiry.toISOString()
            })
          case 'auth_user':
            return JSON.stringify({
              ...mockUser,
              createdAt: mockUser.createdAt.toISOString(),
              lastLoginAt: mockUser.lastLoginAt?.toISOString()
            })
          case 'auth_last_activity':
            return oldActivity.toString()
          default:
            return null
        }
      })

      authService.logout = vi.fn().mockResolvedValue(undefined)

      renderWithAuthProvider()

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated')
        expect(authService.logout).toHaveBeenCalled()
      }, { timeout: 1000 })
    })

    it('should track user activity', async () => {
      const futureExpiry = new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now
      
      mockLocalStorage.getItem.mockImplementation((key) => {
        switch (key) {
          case 'auth_session':
            return JSON.stringify({
              accessToken: 'valid-token',
              refreshToken: 'valid-refresh-token',
              expiresAt: futureExpiry.toISOString()
            })
          case 'auth_user':
            return JSON.stringify({
              ...mockUser,
              createdAt: mockUser.createdAt.toISOString(),
              lastLoginAt: mockUser.lastLoginAt?.toISOString()
            })
          case 'auth_last_activity':
            return Date.now().toString()
          default:
            return null
        }
      })

      renderWithAuthProvider()

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated')
      })

      // Simulate user activity
      act(() => {
        document.dispatchEvent(new Event('mousedown'))
      })

      // Verify that activity timestamp was updated
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'auth_last_activity',
        expect.any(String)
      )
    })
  })

  describe('Error Handling', () => {
    it('should handle malformed localStorage data', async () => {
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'auth_session') return 'invalid-json'
        return null
      })

      renderWithAuthProvider()

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated')
        expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth_session')
      }, { timeout: 1000 })
    })

    it('should handle localStorage access errors', async () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('localStorage error')
      })

      renderWithAuthProvider()

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated')
      }, { timeout: 1000 })
    })
  })
})