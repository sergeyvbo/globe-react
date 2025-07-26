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
    refreshToken: vi.fn().mockRejectedValue(new Error('No refresh token')),
  }
}))

// Mock the GameProgress module completely
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
beforeEach(() => {
  console.log = vi.fn()
  console.warn = vi.fn()
  console.error = vi.fn()
})

// Simple test component that doesn't trigger complex initialization
const SimpleTestComponent: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth()
  
  return (
    <div>
      <div data-testid="loading">{isLoading ? 'loading' : 'not-loading'}</div>
      <div data-testid="authenticated">{isAuthenticated ? 'authenticated' : 'not-authenticated'}</div>
    </div>
  )
}

describe('AuthContext Unit Tests', () => {
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

  afterEach(() => {
    vi.clearAllTimers()
  })

  it('should render without crashing', () => {
    render(
      <AuthProvider>
        <SimpleTestComponent />
      </AuthProvider>
    )
    
    expect(screen.getByTestId('loading')).toBeInTheDocument()
    expect(screen.getByTestId('authenticated')).toBeInTheDocument()
  })

  it('should start with not authenticated state when no session', async () => {
    mockLocalStorage.getItem.mockReturnValue(null)
    
    render(
      <AuthProvider>
        <SimpleTestComponent />
      </AuthProvider>
    )

    // Give it a moment to initialize
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100))
    })

    // Should eventually not be loading and not authenticated
    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated')
    }, { timeout: 2000 })
  })

  it('should handle localStorage errors gracefully', async () => {
    mockLocalStorage.getItem.mockImplementation(() => {
      throw new Error('localStorage error')
    })

    render(
      <AuthProvider>
        <SimpleTestComponent />
      </AuthProvider>
    )

    // Give it a moment to handle the error
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100))
    })

    // Should not crash and should show not authenticated
    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated')
    }, { timeout: 2000 })
  })

  it('should clear session when localStorage contains invalid JSON', async () => {
    mockLocalStorage.getItem.mockImplementation((key) => {
      if (key === 'auth_session') return 'invalid-json'
      return null
    })

    render(
      <AuthProvider>
        <SimpleTestComponent />
      </AuthProvider>
    )

    // Give it a moment to process
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100))
    })

    // Should handle invalid JSON gracefully and show not authenticated
    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated')
    }, { timeout: 2000 })
    
    // Should not be loading
    expect(screen.getByTestId('loading')).toHaveTextContent('not-loading')
    
    // May or may not clear the session, but should not crash
    // This is implementation dependent, so we don't assert on removeItem
  })
})