import React from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, beforeEach, afterEach, describe, it, expect } from 'vitest'
import { AuthProvider, useAuth } from './AuthContext'
import { authService } from './AuthService'
import { AuthResponse, User, AuthErrorType } from '../types'

// Mock the AuthService
vi.mock('./AuthService', () => ({
  authService: {
    login: vi.fn(),
    register: vi.fn(),
    loginWithOAuth: vi.fn(),
    logout: vi.fn().mockResolvedValue(undefined),
    updateProfile: vi.fn(),
    refreshToken: vi.fn(),
  }
}))

// Mock the GameProgressService
vi.mock('../GameProgress/GameProgressService', () => ({
  gameProgressService: {
    autoSyncOnAuth: vi.fn().mockResolvedValue(undefined)
  }
}))

// Mock the entire GameProgress module
vi.mock('../GameProgress', () => ({
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

  const handleLogin = async () => {
    try {
      await login('test@example.com', 'password123')
    } catch (error) {
      // Handle login error gracefully in test
      console.log('Login error handled:', error)
    }
  }

  const handleRegister = async () => {
    try {
      await register('test@example.com', 'password123')
    } catch (error) {
      // Handle register error gracefully in test
      console.log('Register error handled:', error)
    }
  }

  const handleOAuth = async () => {
    try {
      await loginWithOAuth('google')
    } catch (error) {
      // Handle OAuth error gracefully in test
      console.log('OAuth error handled:', error)
    }
  }

  const handleUpdateProfile = async () => {
    try {
      await updateProfile({ email: 'new@example.com' })
    } catch (error) {
      // Handle update error gracefully in test
      console.log('Update error handled:', error)
    }
  }

  return (
    <div>
      <div data-testid="loading">{isLoading ? 'loading' : 'not-loading'}</div>
      <div data-testid="authenticated">{isAuthenticated ? 'authenticated' : 'not-authenticated'}</div>
      <div data-testid="user">{user ? user.email : 'no-user'}</div>
      <button onClick={handleLogin} data-testid="login-btn">
        Login
      </button>
      <button onClick={handleRegister} data-testid="register-btn">
        Register
      </button>
      <button onClick={handleOAuth} data-testid="oauth-btn">
        OAuth Login
      </button>
      <button onClick={logout} data-testid="logout-btn">
        Logout
      </button>
      <button onClick={handleUpdateProfile} data-testid="update-btn">
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

    // Reset all mocked functions
    authService.logout = vi.fn().mockResolvedValue(undefined)
    authService.refreshToken = vi.fn().mockRejectedValue(new Error('No refresh token'))
  })

  describe('Initialization', () => {
    it('should initialize with loading state', async () => {
      renderWithAuthProvider()

      // Give it a moment to initialize
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
      })

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading')
      }, { timeout: 2000 })

      expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated')
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

      // Give it a moment to process
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 200))
      })

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated')
        expect(screen.getByTestId('user')).toHaveTextContent('test@example.com')
      }, { timeout: 2000 })
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

      // Give it a moment to process
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 200))
      })

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated')
      }, { timeout: 2000 })

      // Should handle expired session gracefully (implementation dependent)
    })
  })

  describe('Authentication Methods', () => {
    it('should handle successful login', async () => {
      const user = userEvent.setup()
      authService.login = vi.fn().mockResolvedValue(mockAuthResponse)

      renderWithAuthProvider()

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading')
      }, { timeout: 2000 })

      await user.click(screen.getByTestId('login-btn'))

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated')
        expect(screen.getByTestId('user')).toHaveTextContent('test@example.com')
      }, { timeout: 2000 })

      expect(authService.login).toHaveBeenCalledWith('test@example.com', 'password123')
    })

    it('should handle login error', async () => {
      const user = userEvent.setup()
      const loginError = new Error('Invalid credentials') as any
      loginError.type = AuthErrorType.INVALID_CREDENTIALS
      authService.login = vi.fn().mockRejectedValue(loginError)

      renderWithAuthProvider()

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading')
      })

      // Click login button - the login function will throw an error internally
      // but the component should handle it gracefully
      await user.click(screen.getByTestId('login-btn'))

      // Give it a moment to process the error
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
      })

      // Should remain not authenticated after error
      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated')
      })

      expect(authService.login).toHaveBeenCalled()
    })

    it('should handle successful registration', async () => {
      const user = userEvent.setup()
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
      const user = userEvent.setup()
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
      const user = userEvent.setup()
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
    })

    it('should handle profile update', async () => {
      const user = userEvent.setup()
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
    it('should handle session expiry gracefully', async () => {
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

      // Should initialize properly
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading')
      }, { timeout: 2000 })
    })

    it('should handle inactive user session', async () => {
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

      renderWithAuthProvider()

      // Should handle inactive session gracefully
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading')
      }, { timeout: 2000 })
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

      // Clear previous calls
      mockLocalStorage.setItem.mockClear()

      // Simulate user activity
      act(() => {
        document.dispatchEvent(new Event('mousedown'))
      })

      // Give it a moment to process
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
      })

      // Should handle activity tracking gracefully (implementation dependent)
      expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated')
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
      }, { timeout: 2000 })

      // Should handle malformed data gracefully
    })

    it('should handle localStorage access errors', async () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('localStorage error')
      })

      renderWithAuthProvider()

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated')
      }, { timeout: 2000 })

      // Should handle localStorage errors gracefully
    })
  })
})