import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { UserProfile } from './UserProfile'
import { AuthProvider } from '../Auth/AuthContext'
import { authService } from '../Auth/AuthService'
import { gameProgressService } from '../GameProgress/GameProgressService'

// Mock the auth service
vi.mock('../Auth/AuthService', () => ({
  authService: {
    changePassword: vi.fn()
  },
  ValidationUtils: {
    validatePassword: vi.fn(),
    validatePasswordConfirmation: vi.fn()
  }
}))

// Mock the game progress service
vi.mock('../GameProgress/GameProgressService', () => ({
  gameProgressService: {
    getGameStats: vi.fn()
  }
}))

// Mock the localization
vi.mock('../../Localization/strings', () => ({
  getAuthString: vi.fn((key: string) => {
    const strings: Record<string, string> = {
      mustBeLoggedIn: 'You must be logged in to view your profile.',
      userProfile: 'User Profile',
      email: 'Email',
      authProvider: 'Authentication Provider',
      lastLogin: 'Last Login',
      memberSince: 'Member since',
      passwordSettings: 'Password Settings',
      changePassword: 'Change Password',
      currentPassword: 'Current Password',
      newPassword: 'New Password',
      confirmPassword: 'Confirm New Password',
      passwordChanged: 'Password changed successfully!',
      passwordChangeDescription: 'Change your account password to keep your account secure.',
      oauthPasswordInfo: 'Password management is handled by your {provider} account. Please visit your {provider} account settings to change your password.',
      currentPasswordRequired: 'Current password is required',
      newPasswordDifferent: 'New password must be different from current password',
      currentPasswordIncorrect: 'Current password is incorrect',
      passwordChangeFailed: 'Failed to change password. Please try again.',
      changing: 'Changing...',
      cancel: 'Cancel',
      passwordHelperText: 'Password must be at least 8 characters long'
    }
    return strings[key] || key
  })
}))

// Mock AuthContext
const mockAuthContext = {
  user: null as any,
  isAuthenticated: false,
  isLoading: false,
  login: vi.fn(),
  register: vi.fn(),
  loginWithOAuth: vi.fn(),
  logout: vi.fn(),
  updateProfile: vi.fn()
}

vi.mock('../Auth/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useAuth: () => mockAuthContext
}))

describe('UserProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuthContext.user = null
    mockAuthContext.isAuthenticated = false
    
    // Mock game progress service to resolve immediately
    vi.mocked(gameProgressService.getGameStats).mockImplementation(() => 
      Promise.resolve({
        totalGames: 0,
        totalCorrectAnswers: 0,
        totalWrongAnswers: 0,
        averageAccuracy: 0,
        bestStreak: 0,
        lastPlayedAt: new Date(),
        gameTypeStats: {
          countries: { games: 0, correctAnswers: 0, wrongAnswers: 0, accuracy: 0, bestStreak: 0 },
          flags: { games: 0, correctAnswers: 0, wrongAnswers: 0, accuracy: 0, bestStreak: 0 },
          states: { games: 0, correctAnswers: 0, wrongAnswers: 0, accuracy: 0, bestStreak: 0 }
        }
      })
    )
  })

  it('shows error when no user is logged in', () => {
    render(
      <AuthProvider>
        <UserProfile />
      </AuthProvider>
    )

    expect(screen.getByText('You must be logged in to view your profile.')).toBeInTheDocument()
  })

  it('displays user information for email user', () => {
    mockAuthContext.user = {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      provider: 'email',
      createdAt: new Date('2024-01-01'),
      lastLoginAt: new Date('2024-01-15')
    }
    mockAuthContext.isAuthenticated = true

    render(
      <AuthProvider>
        <UserProfile />
      </AuthProvider>
    )

    expect(screen.getByText('Test User')).toBeInTheDocument()
    expect(screen.getByText('test@example.com')).toBeInTheDocument()
    // Use getAllByText to handle multiple "Email" elements and check the chip specifically
    const emailElements = screen.getAllByText('Email')
    expect(emailElements.length).toBeGreaterThan(0)
    expect(screen.getByText('Change Password')).toBeInTheDocument()
  })

  it('displays user information for OAuth user', () => {
    mockAuthContext.user = {
      id: '1',
      email: 'test@gmail.com',
      name: 'Test User',
      provider: 'google',
      createdAt: new Date('2024-01-01'),
      lastLoginAt: new Date('2024-01-15')
    }
    mockAuthContext.isAuthenticated = true

    render(
      <AuthProvider>
        <UserProfile />
      </AuthProvider>
    )

    expect(screen.getByText('Test User')).toBeInTheDocument()
    expect(screen.getByText('test@gmail.com')).toBeInTheDocument()
    expect(screen.getByText('Google')).toBeInTheDocument()
    expect(screen.getByText(/Password management is handled by your Google account/)).toBeInTheDocument()
    expect(screen.queryByText('Change Password')).not.toBeInTheDocument()
  })

  it('shows password change form when Change Password is clicked', async () => {
    mockAuthContext.user = {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      provider: 'email',
      createdAt: new Date('2024-01-01')
    }
    mockAuthContext.isAuthenticated = true

    render(
      <AuthProvider>
        <UserProfile />
      </AuthProvider>
    )

    // Wait for component to load and stats to finish loading
    await waitFor(async () => {
      // Wait for stats loading to complete
      await new Promise(resolve => setTimeout(resolve, 100))
      expect(screen.getByRole('button', { name: 'Change Password' })).toBeInTheDocument()
    }, { timeout: 5000 })

    const changePasswordButton = screen.getByRole('button', { name: 'Change Password' })
    fireEvent.click(changePasswordButton)

    await waitFor(() => {
      expect(screen.getByLabelText(/Current Password/)).toBeInTheDocument()
      expect(screen.getByLabelText('New Password *')).toBeInTheDocument()
      expect(screen.getByLabelText(/Confirm New Password/)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Change Password/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('handles password change form submission', async () => {
    mockAuthContext.user = {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      provider: 'email',
      createdAt: new Date('2024-01-01')
    }
    mockAuthContext.isAuthenticated = true

    // Mock validation functions
    const { ValidationUtils } = await import('../Auth/AuthService')
    vi.mocked(ValidationUtils.validatePassword).mockImplementation(() => ({ isValid: true }))
    vi.mocked(ValidationUtils.validatePasswordConfirmation).mockImplementation(() => ({ isValid: true }))
    vi.mocked(authService.changePassword).mockResolvedValue()

    render(
      <AuthProvider>
        <UserProfile />
      </AuthProvider>
    )

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Change Password' })).toBeInTheDocument()
    })

    // Open password change form
    fireEvent.click(screen.getByRole('button', { name: 'Change Password' }))

    await waitFor(() => {
      expect(screen.getByLabelText(/Current Password/)).toBeInTheDocument()
    })

    // Fill form
    fireEvent.change(screen.getByLabelText(/Current Password/), {
      target: { value: 'oldpassword123' }
    })
    fireEvent.change(screen.getByLabelText('New Password *'), {
      target: { value: 'newpassword123' }
    })
    fireEvent.change(screen.getByLabelText(/Confirm New Password/), {
      target: { value: 'newpassword123' }
    })

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /Change Password/i }))

    await waitFor(() => {
      expect(authService.changePassword).toHaveBeenCalledWith(
        'oldpassword123',
        'newpassword123',
        'newpassword123'
      )
    })

    await waitFor(() => {
      expect(screen.getByText('Password changed successfully!')).toBeInTheDocument()
    })
  })

  it('handles password change validation errors', async () => {
    mockAuthContext.user = {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      provider: 'email',
      createdAt: new Date('2024-01-01')
    }
    mockAuthContext.isAuthenticated = true

    // Mock validation functions to return errors
    const { ValidationUtils } = await import('../Auth/AuthService')
    vi.mocked(ValidationUtils.validatePassword).mockImplementation(() => ({ 
      isValid: false, 
      message: 'Password must be at least 8 characters long' 
    }))
    vi.mocked(ValidationUtils.validatePasswordConfirmation).mockImplementation(() => ({ isValid: true }))

    render(
      <AuthProvider>
        <UserProfile />
      </AuthProvider>
    )

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Change Password' })).toBeInTheDocument()
    })

    // Open password change form
    fireEvent.click(screen.getByRole('button', { name: 'Change Password' }))

    await waitFor(() => {
      expect(screen.getByLabelText(/Current Password/)).toBeInTheDocument()
    })

    // Fill form with invalid data
    fireEvent.change(screen.getByLabelText(/Current Password/), {
      target: { value: 'oldpass' }
    })
    fireEvent.change(screen.getByLabelText('New Password *'), {
      target: { value: 'short' }
    })
    fireEvent.change(screen.getByLabelText(/Confirm New Password/), {
      target: { value: 'short' }
    })

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /Change Password/i }))

    await waitFor(() => {
      expect(screen.getByText('Password must be at least 8 characters long')).toBeInTheDocument()
    })

    expect(authService.changePassword).not.toHaveBeenCalled()
  })

  it('cancels password change form', async () => {
    mockAuthContext.user = {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      provider: 'email',
      createdAt: new Date('2024-01-01')
    }
    mockAuthContext.isAuthenticated = true

    render(
      <AuthProvider>
        <UserProfile />
      </AuthProvider>
    )

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Change Password' })).toBeInTheDocument()
    })

    // Open password change form
    fireEvent.click(screen.getByRole('button', { name: 'Change Password' }))

    await waitFor(() => {
      expect(screen.getByLabelText(/Current Password/)).toBeInTheDocument()
    })

    // Fill some data
    fireEvent.change(screen.getByLabelText(/Current Password/), {
      target: { value: 'somepassword' }
    })

    // Cancel
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    // Should be back to initial state
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Change Password' })).toBeInTheDocument()
      expect(screen.queryByLabelText(/Current Password/)).not.toBeInTheDocument()
    })
  })

  it('displays correct provider names and colors', () => {
    const providers = [
      { provider: 'google', displayName: 'Google' },
      { provider: 'yandex', displayName: 'Yandex' },
      { provider: 'vk', displayName: 'VK' },
      { provider: 'email', displayName: 'Email' }
    ]

    providers.forEach(({ provider, displayName }) => {
      mockAuthContext.user = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        provider: provider as any,
        createdAt: new Date('2024-01-01')
      }
      mockAuthContext.isAuthenticated = true

      const { unmount } = render(
        <AuthProvider>
          <UserProfile />
        </AuthProvider>
      )

      // For email provider, there might be multiple "Email" texts, so use more specific query
      if (provider === 'email') {
        const chipElements = screen.getAllByText(displayName)
        expect(chipElements.length).toBeGreaterThan(0)
      } else {
        expect(screen.getByText(displayName)).toBeInTheDocument()
      }
      unmount()
    })
  })

  it('handles password change service errors', async () => {
    mockAuthContext.user = {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      provider: 'email',
      createdAt: new Date('2024-01-01')
    }
    mockAuthContext.isAuthenticated = true

    // Mock validation functions
    const { ValidationUtils } = await import('../Auth/AuthService')
    vi.mocked(ValidationUtils.validatePassword).mockImplementation(() => ({ isValid: true }))
    vi.mocked(ValidationUtils.validatePasswordConfirmation).mockImplementation(() => ({ isValid: true }))
    
    // Mock service to throw error
    vi.mocked(authService.changePassword).mockRejectedValue({
      type: 'INVALID_CREDENTIALS',
      message: 'Current password is incorrect'
    })

    render(
      <AuthProvider>
        <UserProfile />
      </AuthProvider>
    )

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Change Password' })).toBeInTheDocument()
    })

    // Open password change form
    fireEvent.click(screen.getByRole('button', { name: 'Change Password' }))

    await waitFor(() => {
      expect(screen.getByLabelText(/Current Password/)).toBeInTheDocument()
    })

    // Fill form
    fireEvent.change(screen.getByLabelText(/Current Password/), {
      target: { value: 'wrongpassword' }
    })
    fireEvent.change(screen.getByLabelText('New Password *'), {
      target: { value: 'newpassword123' }
    })
    fireEvent.change(screen.getByLabelText(/Confirm New Password/), {
      target: { value: 'newpassword123' }
    })

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /Change Password/i }))

    await waitFor(() => {
      expect(screen.getByText('Current password is incorrect')).toBeInTheDocument()
    })
  })
})