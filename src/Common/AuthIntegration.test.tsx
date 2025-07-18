import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { AuthProvider, useAuth } from './AuthContext'
import React from 'react'

// Mock the AuthService
vi.mock('./AuthService', () => ({
  authService: {
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    updateProfile: vi.fn(),
    isAuthenticated: vi.fn(),
    getSession: vi.fn(),
  },
  ValidationUtils: {
    validateEmail: vi.fn(),
    validatePassword: vi.fn(),
    validatePasswordConfirmation: vi.fn(),
    validateRegistrationData: vi.fn(),
    validateLoginData: vi.fn(),
  },
  AuthServiceError: class AuthServiceError extends Error {
    constructor(public type: string, message: string, public details?: any) {
      super(message)
    }
  }
}))

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

// Test component that uses the auth context
const TestComponent: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth()
  
  return (
    <div>
      <div data-testid="loading">{isLoading ? 'Loading' : 'Not Loading'}</div>
      <div data-testid="authenticated">{isAuthenticated ? 'Authenticated' : 'Not Authenticated'}</div>
      <div data-testid="user">{user ? user.email : 'No User'}</div>
    </div>
  )
}

describe('AuthContext Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
  })

  it('should render with initial state', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    // Initially should be loading
    expect(screen.getByTestId('loading')).toHaveTextContent('Loading')
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading')
    })
    
    expect(screen.getByTestId('authenticated')).toHaveTextContent('Not Authenticated')
    expect(screen.getByTestId('user')).toHaveTextContent('No User')
  })

  it('should handle existing session from localStorage', async () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      provider: 'email' as const,
      createdAt: new Date(),
    }

    const mockSession = {
      accessToken: 'token',
      refreshToken: 'refresh',
      expiresAt: new Date(Date.now() + 1000 * 60 * 60), // 1 hour from now
      user: mockUser
    }

    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'auth_session') {
        return JSON.stringify({
          ...mockSession,
          expiresAt: mockSession.expiresAt.toISOString()
        })
      }
      if (key === 'auth_user') {
        return JSON.stringify({
          ...mockUser,
          createdAt: mockUser.createdAt.toISOString()
        })
      }
      return null
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    // Wait for loading to complete and session to be restored
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading')
    })
    
    expect(screen.getByTestId('authenticated')).toHaveTextContent('Authenticated')
    expect(screen.getByTestId('user')).toHaveTextContent('test@example.com')
  })

  it('should handle expired session', async () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      provider: 'email' as const,
      createdAt: new Date(),
    }

    const mockSession = {
      accessToken: 'token',
      refreshToken: 'refresh',
      expiresAt: new Date(Date.now() - 1000), // Expired
      user: mockUser
    }

    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'auth_session') {
        return JSON.stringify({
          ...mockSession,
          expiresAt: mockSession.expiresAt.toISOString()
        })
      }
      if (key === 'auth_user') {
        return JSON.stringify({
          ...mockUser,
          createdAt: mockUser.createdAt.toISOString()
        })
      }
      return null
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading')
    })
    
    // Should not be authenticated due to expired session
    expect(screen.getByTestId('authenticated')).toHaveTextContent('Not Authenticated')
    expect(screen.getByTestId('user')).toHaveTextContent('No User')
    
    // Should have cleared the expired session
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_session')
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_user')
  })
})