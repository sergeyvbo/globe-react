import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { AuthModal } from './AuthModal'
import { AuthProvider } from './AuthContext'
import AuthContext from './AuthContext'

// Mock the auth context
const MockAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <AuthProvider>{children}</AuthProvider>
}

const renderWithAuth = (component: React.ReactElement) => {
  return render(
    <MockAuthProvider>
      {component}
    </MockAuthProvider>
  )
}

describe('AuthModal', () => {
  const mockOnClose = vi.fn()

  beforeEach(() => {
    mockOnClose.mockClear()
    // Clear localStorage
    localStorage.clear()
  })

  describe('Welcome Mode', () => {
    it('renders welcome screen with three options', () => {
      renderWithAuth(
        <AuthModal open={true} onClose={mockOnClose} initialMode="welcome" />
      )

      expect(screen.getByText('Welcome!')).toBeInTheDocument()
      expect(screen.getByText('Choose how you want to continue')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Register' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Continue without login' })).toBeInTheDocument()
    })

    it('switches to login mode when login button is clicked', async () => {
      const user = userEvent.setup()
      renderWithAuth(
        <AuthModal open={true} onClose={mockOnClose} initialMode="welcome" />
      )

      await user.click(screen.getByRole('button', { name: 'Login' }))
      
      expect(screen.getByText('Login to your account')).toBeInTheDocument()
    })

    it('switches to register mode when register button is clicked', async () => {
      const user = userEvent.setup()
      renderWithAuth(
        <AuthModal open={true} onClose={mockOnClose} initialMode="welcome" />
      )

      await user.click(screen.getByRole('button', { name: 'Register' }))
      
      expect(screen.getByText('Create new account')).toBeInTheDocument()
    })

    it('closes modal when continue without login is clicked', async () => {
      const user = userEvent.setup()
      renderWithAuth(
        <AuthModal open={true} onClose={mockOnClose} initialMode="welcome" />
      )

      await user.click(screen.getByRole('button', { name: 'Continue without login' }))
      
      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  describe('Login Mode', () => {
    it('renders login form with email and password fields', () => {
      renderWithAuth(
        <AuthModal open={true} onClose={mockOnClose} initialMode="login" />
      )

      expect(screen.getByText('Login to your account')).toBeInTheDocument()
      expect(screen.getByLabelText('Email')).toBeInTheDocument()
      expect(screen.getByLabelText('Password')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument()
    })

    it('shows OAuth login buttons', () => {
      renderWithAuth(
        <AuthModal open={true} onClose={mockOnClose} initialMode="login" />
      )

      expect(screen.getByRole('button', { name: 'Login with Google' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Login with Yandex' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Login with VK' })).toBeInTheDocument()
    })

    it('shows loading state for OAuth buttons during authentication', async () => {
      const user = userEvent.setup()
      
      // Mock loginWithOAuth to simulate loading state
      const mockLoginWithOAuth = vi.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      )
      
      const mockAuthContext = {
        user: null,
        isAuthenticated: false,
        isLoading: false,
        login: vi.fn(),
        register: vi.fn(),
        loginWithOAuth: mockLoginWithOAuth,
        logout: vi.fn(),
        updateProfile: vi.fn()
      }

      render(
        <AuthContext.Provider value={mockAuthContext}>
          <AuthModal open={true} onClose={mockOnClose} initialMode="login" />
        </AuthContext.Provider>
      )

      const googleButton = screen.getByRole('button', { name: 'Login with Google' })
      
      // Click the Google OAuth button
      await user.click(googleButton)
      
      // Check that loading indicator appears
      expect(screen.getByRole('progressbar')).toBeInTheDocument()
      
      // Check that all OAuth buttons are disabled during loading
      expect(screen.getByRole('button', { name: 'Login with Google' })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Login with Yandex' })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Login with VK' })).toBeDisabled()
    })

    it('validates email field', async () => {
      const user = userEvent.setup()
      renderWithAuth(
        <AuthModal open={true} onClose={mockOnClose} initialMode="login" />
      )

      const loginButton = screen.getByRole('button', { name: 'Login' })
      await user.click(loginButton)

      expect(screen.getByText('Email is required')).toBeInTheDocument()
    })

    it('validates password field', async () => {
      const user = userEvent.setup()
      renderWithAuth(
        <AuthModal open={true} onClose={mockOnClose} initialMode="login" />
      )

      const emailInput = screen.getByLabelText('Email')
      await user.type(emailInput, 'test@example.com')

      const loginButton = screen.getByRole('button', { name: 'Login' })
      await user.click(loginButton)

      expect(screen.getByText('Password is required')).toBeInTheDocument()
    })

    it('validates email format', async () => {
      const user = userEvent.setup()
      renderWithAuth(
        <AuthModal open={true} onClose={mockOnClose} initialMode="login" />
      )

      const emailInput = screen.getByLabelText('Email')
      await user.type(emailInput, 'invalid-email')

      const loginButton = screen.getByRole('button', { name: 'Login' })
      await user.click(loginButton)

      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument()
    })

    it('goes back to welcome when back button is clicked', async () => {
      const user = userEvent.setup()
      renderWithAuth(
        <AuthModal open={true} onClose={mockOnClose} initialMode="login" />
      )

      await user.click(screen.getByRole('button', { name: 'Back' }))
      
      expect(screen.getByText('Welcome!')).toBeInTheDocument()
    })
  })

  describe('Register Mode', () => {
    it('renders register form with email, password, and confirm password fields', () => {
      renderWithAuth(
        <AuthModal open={true} onClose={mockOnClose} initialMode="register" />
      )

      expect(screen.getByText('Create new account')).toBeInTheDocument()
      expect(screen.getByLabelText('Email')).toBeInTheDocument()
      expect(screen.getByLabelText('Password')).toBeInTheDocument()
      expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Register' })).toBeInTheDocument()
    })

    it('validates password length', async () => {
      const user = userEvent.setup()
      renderWithAuth(
        <AuthModal open={true} onClose={mockOnClose} initialMode="register" />
      )

      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Password')
      
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, '123')

      const registerButton = screen.getByRole('button', { name: 'Register' })
      await user.click(registerButton)

      expect(screen.getByText('Password must be at least 8 characters long')).toBeInTheDocument()
    })

    it('validates password confirmation', async () => {
      const user = userEvent.setup()
      renderWithAuth(
        <AuthModal open={true} onClose={mockOnClose} initialMode="register" />
      )

      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Password')
      const confirmPasswordInput = screen.getByLabelText('Confirm Password')
      
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.type(confirmPasswordInput, 'different123')

      const registerButton = screen.getByRole('button', { name: 'Register' })
      await user.click(registerButton)

      expect(screen.getByText('Passwords do not match')).toBeInTheDocument()
    })

    it('goes back to welcome when back button is clicked', async () => {
      const user = userEvent.setup()
      renderWithAuth(
        <AuthModal open={true} onClose={mockOnClose} initialMode="register" />
      )

      await user.click(screen.getByRole('button', { name: 'Back' }))
      
      expect(screen.getByText('Welcome!')).toBeInTheDocument()
    })
  })

  describe('Localization', () => {
    it('renders in Russian when language is set to ru', () => {
      // Set Russian language in localStorage
      localStorage.setItem('settings', JSON.stringify({ language: 'ru' }))
      
      renderWithAuth(
        <AuthModal open={true} onClose={mockOnClose} initialMode="welcome" />
      )

      expect(screen.getByText('Добро пожаловать!')).toBeInTheDocument()
      expect(screen.getByText('Выберите, как вы хотите продолжить')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Войти' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Регистрация' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Продолжить без входа' })).toBeInTheDocument()
    })
  })

  describe('Modal Behavior', () => {
    it('closes when close button is clicked', async () => {
      const user = userEvent.setup()
      renderWithAuth(
        <AuthModal open={true} onClose={mockOnClose} initialMode="welcome" />
      )

      const closeButton = screen.getByLabelText('close')
      await user.click(closeButton)

      expect(mockOnClose).toHaveBeenCalled()
    })

    it('does not render when open is false', () => {
      renderWithAuth(
        <AuthModal open={false} onClose={mockOnClose} initialMode="welcome" />
      )

      expect(screen.queryByText('Welcome!')).not.toBeInTheDocument()
    })
  })
})