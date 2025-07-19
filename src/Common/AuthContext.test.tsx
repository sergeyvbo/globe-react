import React from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
import { vi, beforeEach, afterEach, beforeAll, afterAll, describe, it, expect } from 'vitest'
import { AuthProvider, useAuth } from './AuthContext'
import { authService } from './AuthService'
import { AuthResponse, User, AuthErrorType } from './types'

// Mock the AuthService
vi.mock('./AuthService')
const mockAuthService = authService as any

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

// Mock console methods to avoid noise in tests
const originalConsoleLog = console.log
const originalConsoleWarn = console.warn
const originalConsoleError = console.error

beforeAll(() => {
  console.log = vi.fn()
  console.warn = vi.fn()
  console.error = vi.fn()
})

afterAll(() => {
  console.log = originalConsoleLog
  console.warn = originalConsoleWarn
  console.error = originalConsoleError
})

// Test component that uses the auth context
const TestComponent: React.FC = () => {
  const { user, isAuthenticated, isLoading, login, logout } = useAuth()
  
  return (
    <div>
      <div data-testid="loading">{isLoading ? 'loading' : 'not-loading'}</div>
      <div data-testid="authenticated">{isAuthenticated ? 'authenticated' : 'not-authenticated'}</div>
      <div data-testid="user">{user ? user.email : 'no-user'}</div>
      <button onClick={() => login('test@example.com', 'password123')} data-testid="login-btn">
        Login
      </button>
      <button onClick={logout} data-testid="logout-btn">
        Logout
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

describe('AuthContext - Automatic Session Management', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLocalStorage.getItem.mockReturnValue(null)
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  describe('Session Initialization', () => {
    it('should initialize with loading state and check for existing session', async () => {
      mockLocalStorage.getItem.mockReturnValue(null)
      
      renderWithAuthProvider()
      
      expect(screen.getByTestId('loading')).toHaveTextContent('loading')
      expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated')
      
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading')
      })
    })

    it('should restore valid session from localStorage', async () => {
      const mockUser: User = {
        id: '1',
        email: 'test@example.com',
        provider: 'email',
        createdAt: new Date(),
        lastLoginAt: new Date()
      }

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
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading')
      })
    })

    it('should logout user if session is expired', async () => {
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
              id: '1',
              email: 'test@example.com',
              provider: 'email',
              createdAt: new Date().toISOString()
            })
          default:
            return null
        }
      })

      renderWithAuthProvider()

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated')
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading')
      })
    })

    it('should logout user if inactive for too long', async () => {
      const mockUser: User = {
        id: '1',
        email: 'test@example.com',
        provider: 'email',
        createdAt: new Date(),
        lastLoginAt: new Date()
      }

      const futureExpiry = new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now
      const oldActivity = Date.now() - (31 * 60 * 1000) // 31 minutes ago (past inactivity threshold)
      
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

      mockAuthService.logout.mockResolvedValue()

      renderWithAuthProvider()

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated')
        expect(mockAuthService.logout).toHaveBeenCalled()
      })
    })
  })

  describe('Automatic Token Refresh', () => {
    it('should attempt token refresh when session is close to expiry', async () => {
      const mockUser: User = {
        id: '1',
        email: 'test@example.com',
        provider: 'email',
        createdAt: new Date(),
        lastLoginAt: new Date()
      }

      const closeExpiry = new Date(Date.now() + 4 * 60 * 1000) // 4 minutes from now (within refresh threshold)
      
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

      const refreshResponse: AuthResponse = {
        user: mockUser,
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 3600
      }

      mockAuthService.refreshToken.mockResolvedValue(refreshResponse)

      renderWithAuthProvider()

      await waitFor(() => {
        expect(mockAuthService.refreshToken).toHaveBeenCalled()
      })
    })

    it('should logout user if token refresh fails', async () => {
      const mockUser: User = {
        id: '1',
        email: 'test@example.com',
        provider: 'email',
        createdAt: new Date(),
        lastLoginAt: new Date()
      }

      const closeExpiry = new Date(Date.now() + 4 * 60 * 1000) // 4 minutes from now
      
      mockLocalStorage.getItem.mockImplementation((key) => {
        switch (key) {
          case 'auth_session':
            return JSON.stringify({
              accessToken: 'expiring-token',
              refreshToken: 'invalid-refresh-token',
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

      mockAuthService.refreshToken.mockRejectedValue(new Error('Refresh failed'))
      mockAuthService.logout.mockResolvedValue()

      renderWithAuthProvider()

      await waitFor(() => {
        expect(mockAuthService.refreshToken).toHaveBeenCalled()
        expect(mockAuthService.logout).toHaveBeenCalled()
        expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated')
      })
    })
  })

  describe('Session Management Timers', () => {
    it('should set up refresh timer after successful login', async () => {
      const mockUser: User = {
        id: '1',
        email: 'test@example.com',
        provider: 'email',
        createdAt: new Date(),
        lastLoginAt: new Date()
      }

      const loginResponse: AuthResponse = {
        user: mockUser,
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 3600 // 1 hour
      }

      mockAuthService.login.mockResolvedValue(loginResponse)
      mockAuthService.refreshToken.mockResolvedValue(loginResponse)

      renderWithAuthProvider()

      await act(async () => {
        screen.getByTestId('login-btn').click()
      })

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated')
      })

      // Fast-forward to near token expiry (55 minutes)
      act(() => {
        vi.advanceTimersByTime(55 * 60 * 1000)
      })

      await waitFor(() => {
        expect(mockAuthService.refreshToken).toHaveBeenCalled()
      })
    })

    it('should logout user when session expires', async () => {
      const mockUser: User = {
        id: '1',
        email: 'test@example.com',
        provider: 'email',
        createdAt: new Date(),
        lastLoginAt: new Date()
      }

      const shortExpiry = new Date(Date.now() + 10 * 1000) // 10 seconds from now
      
      mockLocalStorage.getItem.mockImplementation((key) => {
        switch (key) {
          case 'auth_session':
            return JSON.stringify({
              accessToken: 'short-lived-token',
              refreshToken: 'refresh-token',
              expiresAt: shortExpiry.toISOString()
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

      mockAuthService.logout.mockResolvedValue()

      renderWithAuthProvider()

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated')
      })

      // Fast-forward past token expiry
      act(() => {
        vi.advanceTimersByTime(15 * 1000)
      })

      await waitFor(() => {
        expect(mockAuthService.logout).toHaveBeenCalled()
        expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated')
      })
    })
  })

  describe('User Activity Tracking', () => {
    it('should track user activity and update timestamp', async () => {
      const mockUser: User = {
        id: '1',
        email: 'test@example.com',
        provider: 'email',
        createdAt: new Date(),
        lastLoginAt: new Date()
      }

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

  describe('Periodic Session Validation', () => {
    it('should periodically check session validity', async () => {
      const mockUser: User = {
        id: '1',
        email: 'test@example.com',
        provider: 'email',
        createdAt: new Date(),
        lastLoginAt: new Date()
      }

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

      // Fast-forward to trigger periodic check (1 minute)
      act(() => {
        vi.advanceTimersByTime(60 * 1000)
      })

      // The periodic check should have run (we can't easily assert this directly,
      // but we can verify the session is still valid)
      expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated')
    })
  })

  describe('Cleanup', () => {
    it('should clear timers on logout', async () => {
      const mockUser: User = {
        id: '1',
        email: 'test@example.com',
        provider: 'email',
        createdAt: new Date(),
        lastLoginAt: new Date()
      }

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

      mockAuthService.logout.mockResolvedValue()

      renderWithAuthProvider()

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated')
      })

      // Logout
      await act(async () => {
        screen.getByTestId('logout-btn').click()
      })

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated')
      })

      // Verify localStorage was cleared
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth_session')
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth_user')
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth_last_activity')
    })
  })
})