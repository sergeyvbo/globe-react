import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
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

    it('handles successful login submission', async () => {
      const user = userEvent.setup()
      const mockLogin = vi.fn().mockResolvedValue(undefined)
      
      const mockAuthContext = {
        user: null,
        isAuthenticated: false,
        isLoading: false,
        login: mockLogin,
        register: vi.fn(),
        loginWithOAuth: vi.fn(),
        logout: vi.fn(),
        updateProfile: vi.fn()
      }

      render(
        <AuthContext.Provider value={mockAuthContext}>
          <AuthModal open={true} onClose={mockOnClose} initialMode="login" />
        </AuthContext.Provider>
      )

      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Password')
      const loginButton = screen.getByRole('button', { name: 'Login' })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'Password123')
      await user.click(loginButton)

      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'Password123')
    })

    it('handles login error', async () => {
      const user = userEvent.setup()
      const mockLogin = vi.fn().mockRejectedValue(new Error('Invalid credentials'))
      
      const mockAuthContext = {
        user: null,
        isAuthenticated: false,
        isLoading: false,
        login: mockLogin,
        register: vi.fn(),
        loginWithOAuth: vi.fn(),
        logout: vi.fn(),
        updateProfile: vi.fn()
      }

      render(
        <AuthContext.Provider value={mockAuthContext}>
          <AuthModal open={true} onClose={mockOnClose} initialMode="login" />
        </AuthContext.Provider>
      )

      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Password')
      const loginButton = screen.getByRole('button', { name: 'Login' })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'wrongPassword123')
      await user.click(loginButton)

      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
      })
    })

    it('disables form during submission', async () => {
      const user = userEvent.setup()
      const mockLogin = vi.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      )
      
      const mockAuthContext = {
        user: null,
        isAuthenticated: false,
        isLoading: true,
        login: mockLogin,
        register: vi.fn(),
        loginWithOAuth: vi.fn(),
        logout: vi.fn(),
        updateProfile: vi.fn()
      }

      render(
        <AuthContext.Provider value={mockAuthContext}>
          <AuthModal open={true} onClose={mockOnClose} initialMode="login" />
        </AuthContext.Provider>
      )

      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Password')
      const loginButton = screen.getByRole('button', { name: 'Login' })

      expect(emailInput).toBeDisabled()
      expect(passwordInput).toBeDisabled()
      expect(loginButton).toBeDisabled()
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

    it('validates all required fields', async () => {
      const user = userEvent.setup()
      renderWithAuth(
        <AuthModal open={true} onClose={mockOnClose} initialMode="register" />
      )

      const registerButton = screen.getByRole('button', { name: 'Register' })
      await user.click(registerButton)

      expect(screen.getByText('Email is required')).toBeInTheDocument()
      expect(screen.getByText('Password is required')).toBeInTheDocument()
    })

    it('validates email format', async () => {
      const user = userEvent.setup()
      renderWithAuth(
        <AuthModal open={true} onClose={mockOnClose} initialMode="register" />
      )

      const emailInput = screen.getByLabelText('Email')
      await user.type(emailInput, 'invalid-email')

      const registerButton = screen.getByRole('button', { name: 'Register' })
      await user.click(registerButton)

      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument()
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

    it('validates password complexity', async () => {
      const user = userEvent.setup()
      renderWithAuth(
        <AuthModal open={true} onClose={mockOnClose} initialMode="register" />
      )

      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Password')
      
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'onlyletters')

      const registerButton = screen.getByRole('button', { name: 'Register' })
      await user.click(registerButton)

      expect(screen.getByText('Password must contain at least one letter and one number')).toBeInTheDocument()
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
      await user.type(passwordInput, 'Password123')
      await user.type(confirmPasswordInput, 'different123')

      const registerButton = screen.getByRole('button', { name: 'Register' })
      await user.click(registerButton)

      expect(screen.getByText('Passwords do not match')).toBeInTheDocument()
    })

    it('handles successful registration submission', async () => {
      const user = userEvent.setup()
      const mockRegister = vi.fn().mockResolvedValue(undefined)
      
      const mockAuthContext = {
        user: null,
        isAuthenticated: false,
        isLoading: false,
        login: vi.fn(),
        register: mockRegister,
        loginWithOAuth: vi.fn(),
        logout: vi.fn(),
        updateProfile: vi.fn()
      }

      render(
        <AuthContext.Provider value={mockAuthContext}>
          <AuthModal open={true} onClose={mockOnClose} initialMode="register" />
        </AuthContext.Provider>
      )

      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Password')
      const confirmPasswordInput = screen.getByLabelText('Confirm Password')
      const registerButton = screen.getByRole('button', { name: 'Register' })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'Password123')
      await user.type(confirmPasswordInput, 'Password123')
      await user.click(registerButton)

      expect(mockRegister).toHaveBeenCalledWith('test@example.com', 'Password123', 'Password123')
    })

    it('handles registration error', async () => {
      const user = userEvent.setup()
      const mockRegister = vi.fn().mockRejectedValue(new Error('User already exists'))
      
      const mockAuthContext = {
        user: null,
        isAuthenticated: false,
        isLoading: false,
        login: vi.fn(),
        register: mockRegister,
        loginWithOAuth: vi.fn(),
        logout: vi.fn(),
        updateProfile: vi.fn()
      }

      render(
        <AuthContext.Provider value={mockAuthContext}>
          <AuthModal open={true} onClose={mockOnClose} initialMode="register" />
        </AuthContext.Provider>
      )

      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Password')
      const confirmPasswordInput = screen.getByLabelText('Confirm Password')
      const registerButton = screen.getByRole('button', { name: 'Register' })

      await user.type(emailInput, 'existing@example.com')
      await user.type(passwordInput, 'Password123')
      await user.type(confirmPasswordInput, 'Password123')
      await user.click(registerButton)

      await waitFor(() => {
        expect(screen.getByText('User already exists')).toBeInTheDocument()
      })
    })

    it('disables form during submission', async () => {
      const user = userEvent.setup()
      const mockRegister = vi.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      )
      
      const mockAuthContext = {
        user: null,
        isAuthenticated: false,
        isLoading: true,
        login: vi.fn(),
        register: mockRegister,
        loginWithOAuth: vi.fn(),
        logout: vi.fn(),
        updateProfile: vi.fn()
      }

      render(
        <AuthContext.Provider value={mockAuthContext}>
          <AuthModal open={true} onClose={mockOnClose} initialMode="register" />
        </AuthContext.Provider>
      )

      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Password')
      const confirmPasswordInput = screen.getByLabelText('Confirm Password')
      const registerButton = screen.getByRole('button', { name: 'Register' })

      expect(emailInput).toBeDisabled()
      expect(passwordInput).toBeDisabled()
      expect(confirmPasswordInput).toBeDisabled()
      expect(registerButton).toBeDisabled()
    })

    it('shows OAuth registration buttons', () => {
      renderWithAuth(
        <AuthModal open={true} onClose={mockOnClose} initialMode="register" />
      )

      expect(screen.getByRole('button', { name: 'Register with Google' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Register with Yandex' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Register with VK' })).toBeInTheDocument()
    })

    it('handles OAuth registration', async () => {
      const user = userEvent.setup()
      const mockLoginWithOAuth = vi.fn().mockResolvedValue(undefined)
      
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
          <AuthModal open={true} onClose={mockOnClose} initialMode="register" />
        </AuthContext.Provider>
      )

      const googleButton = screen.getByRole('button', { name: 'Register with Google' })
      await user.click(googleButton)

      expect(mockLoginWithOAuth).toHaveBeenCalledWith('google')
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

  describe('RFC 9457 Error Handling', () => {
    it('handles RFC 9457 validation errors in registration form', async () => {
      const user = userEvent.setup()
      
      // Mock the register function to throw RFC 9457 validation error
      const mockRegister = vi.fn().mockRejectedValue({
        type: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: {
          errors: {
            email: ['Invalid email format'],
            password: ['Password must be at least 8 characters long']
          }
        }
      })

      // Create a custom auth context with the mocked register function
      const mockAuthContextValue = {
        user: null,
        isAuthenticated: false,
        isLoading: false,
        login: vi.fn(),
        register: mockRegister,
        loginWithOAuth: vi.fn(),
        logout: vi.fn(),
        refreshToken: vi.fn(),
        clearAuthData: vi.fn()
      }

      render(
        <AuthContext.Provider value={mockAuthContextValue}>
          <AuthModal open={true} onClose={mockOnClose} initialMode="register" />
        </AuthContext.Provider>
      )

      // Fill in the form with data that passes client validation but will trigger server validation errors
      await user.type(screen.getByLabelText('Email'), 'test@example.com')
      await user.type(screen.getByLabelText('Password'), 'Password123')
      await user.type(screen.getByLabelText('Confirm Password'), 'Password123')

      // Submit the form
      await user.click(screen.getByRole('button', { name: 'Register' }))

      // Wait for the error handling
      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalled()
      })

      // Check that field-specific validation errors are displayed
      await waitFor(() => {
        expect(screen.getByText('Invalid email format')).toBeInTheDocument()
        expect(screen.getByText('Password must be at least 8 characters long')).toBeInTheDocument()
      })

      // Ensure no general error message is shown when validation errors are present
      expect(screen.queryByText('Registration failed')).not.toBeInTheDocument()
    })

    it('handles RFC 9457 validation errors with capitalized field names from server', async () => {
      const user = userEvent.setup()
      
      // Mock the register function to throw RFC 9457 validation error with capitalized field names (like from real API)
      const mockRegister = vi.fn().mockRejectedValue({
        type: 'VALIDATION_ERROR',
        message: 'One or more validation errors occurred.',
        details: {
          status: 400,
          type: 'https://geoquiz.sergeivbo.ru/problems/validation-error',
          title: 'One or more validation errors occurred.',
          detail: 'One or more validation errors occurred.',
          instance: '/api/auth/register',
          errors: {
            Password: ['Password must contain at least one lowercase letter, one uppercase letter, and one digit'],
            Email: ['Invalid email format']
          },
          timestamp: '2025-07-29T18:52:16.4525601Z',
          traceId: '0HNEEQ1A1RIEM:00000002'
        }
      })

      // Create a custom auth context with the mocked register function
      const mockAuthContextValue = {
        user: null,
        isAuthenticated: false,
        isLoading: false,
        login: vi.fn(),
        register: mockRegister,
        loginWithOAuth: vi.fn(),
        logout: vi.fn(),
        refreshToken: vi.fn(),
        clearAuthData: vi.fn()
      }

      render(
        <AuthContext.Provider value={mockAuthContextValue}>
          <AuthModal open={true} onClose={mockOnClose} initialMode="register" />
        </AuthContext.Provider>
      )

      // Fill in the form with data that passes client validation but will trigger server validation errors
      await user.type(screen.getByLabelText('Email'), 'test@example.com')
      await user.type(screen.getByLabelText('Password'), 'Password123')
      await user.type(screen.getByLabelText('Confirm Password'), 'Password123')

      // Submit the form
      await user.click(screen.getByRole('button', { name: 'Register' }))

      // Wait for the error handling
      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalled()
      })

      // Check that field-specific validation errors are displayed (should work even with capitalized field names from server)
      await waitFor(() => {
        expect(screen.getByText('Password must contain at least one lowercase letter, one uppercase letter, and one digit')).toBeInTheDocument()
        expect(screen.getByText('Invalid email format')).toBeInTheDocument()
      })

      // Ensure no general error message is shown when validation errors are present
      expect(screen.queryByText('Registration failed')).not.toBeInTheDocument()
    })

    it('handles RFC 9457 authentication errors', async () => {
      const user = userEvent.setup()
      
      // Mock the login function to throw RFC 9457 authentication error
      const mockLogin = vi.fn().mockRejectedValue({
        type: 'INVALID_CREDENTIALS',
        message: 'Invalid credentials',
        details: {
          type: 'http://localhost:5000/problems/authentication-error',
          title: 'Authentication Error',
          status: 400,
          detail: 'Invalid credentials'
        }
      })

      // Create a custom auth context with the mocked login function
      const mockAuthContextValue = {
        user: null,
        isAuthenticated: false,
        isLoading: false,
        login: mockLogin,
        register: vi.fn(),
        loginWithOAuth: vi.fn(),
        logout: vi.fn(),
        refreshToken: vi.fn(),
        clearAuthData: vi.fn()
      }

      render(
        <AuthContext.Provider value={mockAuthContextValue}>
          <AuthModal open={true} onClose={mockOnClose} initialMode="login" />
        </AuthContext.Provider>
      )

      // Fill in the form
      await user.type(screen.getByLabelText('Email'), 'test@example.com')
      await user.type(screen.getByLabelText('Password'), 'wrongPassword123')

      // Submit the form
      await user.click(screen.getByText('Login'))

      // Wait for the error handling
      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalled()
      })

      // Check that general error message is displayed
      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
      })
    })

    it('handles RFC 9457 validation errors with mixed case and underscore field names', async () => {
      const user = userEvent.setup()
      
      // Mock the register function to throw RFC 9457 validation error with various field name formats
      const mockRegister = vi.fn().mockRejectedValue({
        type: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: {
          errors: {
            'Email': ['Email is already in use'],
            'PASSWORD': ['Password is too weak'],
            'confirm_password': ['Passwords do not match']
          }
        }
      })

      // Create a custom auth context with the mocked register function
      const mockAuthContextValue = {
        user: null,
        isAuthenticated: false,
        isLoading: false,
        login: vi.fn(),
        register: mockRegister,
        loginWithOAuth: vi.fn(),
        logout: vi.fn(),
        refreshToken: vi.fn(),
        clearAuthData: vi.fn()
      }

      render(
        <AuthContext.Provider value={mockAuthContextValue}>
          <AuthModal open={true} onClose={mockOnClose} initialMode="register" />
        </AuthContext.Provider>
      )

      // Fill in the form with data that passes client validation
      await user.type(screen.getByLabelText('Email'), 'test@example.com')
      await user.type(screen.getByLabelText('Password'), 'Password123')
      await user.type(screen.getByLabelText('Confirm Password'), 'Password123')

      // Submit the form
      await user.click(screen.getByRole('button', { name: 'Register' }))

      // Wait for the error handling
      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalled()
      })

      // Check that field-specific validation errors are displayed correctly
      await waitFor(() => {
        expect(screen.getByText('Email is already in use')).toBeInTheDocument()
        expect(screen.getByText('Password is too weak')).toBeInTheDocument()
        expect(screen.getByText('Passwords do not match')).toBeInTheDocument()
      })

      // Ensure no general error message is shown when validation errors are present
      expect(screen.queryByText('Registration failed')).not.toBeInTheDocument()
    })

    it('handles empty validation errors gracefully', async () => {
      const user = userEvent.setup()
      
      // Mock the register function to throw RFC 9457 validation error with empty errors
      const mockRegister = vi.fn().mockRejectedValue({
        type: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: {
          errors: {}
        }
      })

      // Create a custom auth context with the mocked register function
      const mockAuthContextValue = {
        user: null,
        isAuthenticated: false,
        isLoading: false,
        login: vi.fn(),
        register: mockRegister,
        loginWithOAuth: vi.fn(),
        logout: vi.fn(),
        refreshToken: vi.fn(),
        clearAuthData: vi.fn()
      }

      render(
        <AuthContext.Provider value={mockAuthContextValue}>
          <AuthModal open={true} onClose={mockOnClose} initialMode="register" />
        </AuthContext.Provider>
      )

      // Fill in the form with data that passes client validation
      await user.type(screen.getByLabelText('Email'), 'test@example.com')
      await user.type(screen.getByLabelText('Password'), 'Password123')
      await user.type(screen.getByLabelText('Confirm Password'), 'Password123')

      // Submit the form
      await user.click(screen.getByRole('button', { name: 'Register' }))

      // Wait for the error handling
      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalled()
      })

      // Check that general error message is shown when no specific validation errors are present
      await waitFor(() => {
        expect(screen.getByText('Validation failed')).toBeInTheDocument()
      })
    })
  })
})
