import React from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
import { vi, beforeEach, afterEach, describe, it, expect } from 'vitest'
import { AuthProvider, useAuth } from './Auth/AuthContext'

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

// Mock console to avoid noise
beforeEach(() => {
  console.log = vi.fn()
  console.warn = vi.fn()
  console.error = vi.fn()
})

// Simple test component
const SessionTestComponent: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth()
  
  return (
    <div>
      <div data-testid="loading-state">{isLoading ? 'loading' : 'loaded'}</div>
      <div data-testid="auth-state">{isAuthenticated ? 'authenticated' : 'not-authenticated'}</div>
    </div>
  )
}

describe('Session Management Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLocalStorage.getItem.mockReturnValue(null)
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  it('should initialize with loading state', async () => {
    render(
      <AuthProvider>
        <SessionTestComponent />
      </AuthProvider>
    )

    // Should eventually finish loading
    await waitFor(() => {
      expect(screen.getByTestId('loading-state')).toHaveTextContent('loaded')
    }, { timeout: 1000 })
    
    // Should not be authenticated without session
    expect(screen.getByTestId('auth-state')).toHaveTextContent('not-authenticated')
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
            id: '1',
            email: 'test@example.com',
            provider: 'email',
            createdAt: new Date().toISOString(),
            lastLoginAt: new Date().toISOString()
          })
        case 'auth_last_activity':
          return Date.now().toString()
        default:
          return null
      }
    })

    render(
      <AuthProvider>
        <SessionTestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading-state')).toHaveTextContent('loaded')
      expect(screen.getByTestId('auth-state')).toHaveTextContent('authenticated')
    }, { timeout: 10000 })
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
            id: '1',
            email: 'test@example.com',
            provider: 'email',
            createdAt: new Date().toISOString()
          })
        default:
          return null
      }
    })

    render(
      <AuthProvider>
        <SessionTestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading-state')).toHaveTextContent('loaded')
      expect(screen.getByTestId('auth-state')).toHaveTextContent('not-authenticated')
    }, { timeout: 10000 })

    // Should have cleared the expired session
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth_session')
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth_user')
  })

  it('should handle inactive user session', async () => {
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
            id: '1',
            email: 'test@example.com',
            provider: 'email',
            createdAt: new Date().toISOString(),
            lastLoginAt: new Date().toISOString()
          })
        case 'auth_last_activity':
          return oldActivity.toString()
        default:
          return null
      }
    })

    render(
      <AuthProvider>
        <SessionTestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading-state')).toHaveTextContent('loaded')
      expect(screen.getByTestId('auth-state')).toHaveTextContent('not-authenticated')
    }, { timeout: 10000 })

    // Should have cleared the inactive session
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth_session')
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth_user')
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth_last_activity')
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
            id: '1',
            email: 'test@example.com',
            provider: 'email',
            createdAt: new Date().toISOString(),
            lastLoginAt: new Date().toISOString()
          })
        case 'auth_last_activity':
          return Date.now().toString()
        default:
          return null
      }
    })

    render(
      <AuthProvider>
        <SessionTestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('auth-state')).toHaveTextContent('authenticated')
    }, { timeout: 10000 })

    // Simulate user activity
    act(() => {
      document.dispatchEvent(new Event('mousedown'))
    })

    // Should update activity timestamp
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'auth_last_activity',
      expect.any(String)
    )
  })
})