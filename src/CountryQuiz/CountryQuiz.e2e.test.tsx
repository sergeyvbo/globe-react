import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { CountryQuiz } from './CountryQuiz'
import { AuthProvider } from '../Common/Auth/AuthContext'
import AuthContext from '../Common/Auth/AuthContext'
import { AuthContextType } from '../Common/types'

// Mock the auth context for E2E scenarios
const MockAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <AuthProvider>{children}</AuthProvider>
}

const renderWithAuth = (component: React.ReactElement, authContext?: Partial<AuthContextType>) => {
  const defaultAuthContext = {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    login: vi.fn(),
    register: vi.fn(),
    loginWithOAuth: vi.fn(),
    logout: vi.fn(),
    updateProfile: vi.fn()
  }

  const contextValue = authContext || defaultAuthContext

  return render(
    <AuthContext.Provider value={contextValue}>
      {component}
    </AuthContext.Provider>
  )
}

describe('CountryQuiz E2E Tests - Streamlined Auth UX Integration', () => {
  beforeEach(() => {
    // Clear localStorage to ensure clean state
    localStorage.clear()
    // Set English language for consistent testing
    localStorage.setItem('settings', JSON.stringify({ language: 'en' }))
    // Clear any auth decline state
    sessionStorage.clear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('E2E Scenario: Auth Modal Integration with CountryQuiz', () => {
    it('should show auth modal in login mode by default when user is not authenticated (Requirement 1.1)', async () => {
      const mockAuthContext = {
        user: null,
        isAuthenticated: false,
        isLoading: false,
        login: vi.fn(),
        register: vi.fn(),
        loginWithOAuth: vi.fn(),
        logout: vi.fn(),
        updateProfile: vi.fn()
      }

      renderWithAuth(<CountryQuiz />, mockAuthContext)

      // Step 1: Verify auth modal appears automatically
      await waitFor(() => {
        expect(screen.getByText('Login to your account')).toBeInTheDocument()
      })

      // Step 2: Verify modal is in login mode by default (not welcome mode)
      expect(screen.getByTestId('auth-modal-mode')).toHaveTextContent('login')

      // Step 3: Verify all login elements are present
      expect(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument()
      expect(document.getElementById('login-password')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Login with Google' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /continue without login/i })).toBeInTheDocument()
    })

    it('should not show auth modal when user is already authenticated (Requirement 6.1)', async () => {
      const mockAuthContext = {
        user: { id: '1', email: 'test@example.com', name: 'Test User' },
        isAuthenticated: true,
        isLoading: false,
        login: vi.fn(),
        register: vi.fn(),
        loginWithOAuth: vi.fn(),
        logout: vi.fn(),
        updateProfile: vi.fn()
      }

      renderWithAuth(<CountryQuiz />, mockAuthContext)

      // Step 1: Wait for component to render
      await waitFor(() => {
        expect(screen.getByText(/country quiz/i)).toBeInTheDocument()
      })

      // Step 2: Verify auth modal is not shown
      expect(screen.queryByText('Login to your account')).not.toBeInTheDocument()
      expect(screen.queryByText('Create new account')).not.toBeInTheDocument()
    })

    it('should not show auth modal when user has declined auth in current session (Requirement 6.2)', async () => {
      // Set declined auth state
      sessionStorage.setItem('hasDeclinedAuth', 'true')

      const mockAuthContext = {
        user: null,
        isAuthenticated: false,
        isLoading: false,
        login: vi.fn(),
        register: vi.fn(),
        loginWithOAuth: vi.fn(),
        logout: vi.fn(),
        updateProfile: vi.fn()
      }

      renderWithAuth(<CountryQuiz />, mockAuthContext)

      // Step 1: Wait for component to render
      await waitFor(() => {
        expect(screen.getByText(/country quiz/i)).toBeInTheDocument()
      })

      // Step 2: Verify auth modal is not shown
      expect(screen.queryByText('Login to your account')).not.toBeInTheDocument()
    })

    it('should complete full login flow and start quiz (Requirement 1.1)', async () => {
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

      renderWithAuth(<CountryQuiz />, mockAuthContext)

      // Step 1: Wait for auth modal to appear
      await waitFor(() => {
        expect(screen.getByText('Login to your account')).toBeInTheDocument()
      })

      // Step 2: Complete login form
      const emailInput = screen.getByRole('textbox', { name: /email/i })
      const passwordInput = document.getElementById('login-password')
      const loginButton = screen.getByRole('button', { name: 'Login' })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput!, 'Password123')
      await user.click(loginButton)

      // Step 3: Verify login was called
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'Password123')

      // Step 4: Verify modal closes and quiz is accessible
      await waitFor(() => {
        expect(screen.queryByText('Login to your account')).not.toBeInTheDocument()
      })
    })

    it('should complete "Continue without login" flow and start quiz (Requirement 4.1, 4.2)', async () => {
      const user = userEvent.setup()

      const mockAuthContext = {
        user: null,
        isAuthenticated: false,
        isLoading: false,
        login: vi.fn(),
        register: vi.fn(),
        loginWithOAuth: vi.fn(),
        logout: vi.fn(),
        updateProfile: vi.fn()
      }

      renderWithAuth(<CountryQuiz />, mockAuthContext)

      // Step 1: Wait for auth modal to appear
      await waitFor(() => {
        expect(screen.getByText('Login to your account')).toBeInTheDocument()
      })

      // Step 2: Click "Continue without login"
      const continueButton = screen.getByRole('button', { name: /continue without login/i })
      await user.click(continueButton)

      // Step 3: Verify modal closes
      await waitFor(() => {
        expect(screen.queryByText('Login to your account')).not.toBeInTheDocument()
      })

      // Step 4: Verify quiz is accessible
      expect(screen.getByText(/country quiz/i)).toBeInTheDocument()

      // Step 5: Verify declined auth state is saved
      expect(sessionStorage.getItem('hasDeclinedAuth')).toBe('true')
    })

    it('should complete OAuth login flow and start quiz (Requirement 3.1)', async () => {
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

      renderWithAuth(<CountryQuiz />, mockAuthContext)

      // Step 1: Wait for auth modal to appear
      await waitFor(() => {
        expect(screen.getByText('Login to your account')).toBeInTheDocument()
      })

      // Step 2: Click Google OAuth button
      const googleButton = screen.getByRole('button', { name: 'Login with Google' })
      await user.click(googleButton)

      // Step 3: Verify OAuth login was called
      expect(mockLoginWithOAuth).toHaveBeenCalledWith('google')

      // Step 4: Verify modal closes and quiz is accessible
      await waitFor(() => {
        expect(screen.queryByText('Login to your account')).not.toBeInTheDocument()
      })
    })

    it('should switch to registration mode and complete registration flow (Requirement 2.1)', async () => {
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

      renderWithAuth(<CountryQuiz />, mockAuthContext)

      // Step 1: Wait for auth modal to appear in login mode
      await waitFor(() => {
        expect(screen.getByText('Login to your account')).toBeInTheDocument()
      })

      // Step 2: Switch to register mode
      const switchToRegisterButton = screen.getByRole('button', { name: 'Switch to Register form' })
      await user.click(switchToRegisterButton)

      // Step 3: Verify switched to register mode
      expect(screen.getByText('Create new account')).toBeInTheDocument()

      // Step 4: Complete registration form
      const emailInput = screen.getByRole('textbox', { name: /email/i })
      const passwordInput = document.getElementById('register-password')
      const confirmPasswordInput = document.getElementById('register-confirm-password')
      const registerButton = screen.getByRole('button', { name: 'Register' })

      await user.type(emailInput, 'newuser@example.com')
      await user.type(passwordInput!, 'NewPassword123')
      await user.type(confirmPasswordInput!, 'NewPassword123')
      await user.click(registerButton)

      // Step 5: Verify registration was called
      expect(mockRegister).toHaveBeenCalledWith('newuser@example.com', 'NewPassword123', 'NewPassword123')

      // Step 6: Verify modal closes and quiz is accessible
      await waitFor(() => {
        expect(screen.queryByText('Create new account')).not.toBeInTheDocument()
      })
    })

    it('should handle auth loading states properly', async () => {
      const mockAuthContext = {
        user: null,
        isAuthenticated: false,
        isLoading: true, // Auth is loading
        login: vi.fn(),
        register: vi.fn(),
        loginWithOAuth: vi.fn(),
        logout: vi.fn(),
        updateProfile: vi.fn()
      }

      renderWithAuth(<CountryQuiz />, mockAuthContext)

      // Step 1: Verify auth modal is not shown while loading
      expect(screen.queryByText('Login to your account')).not.toBeInTheDocument()

      // Step 2: Verify loading indicator or quiz content is shown
      // (This depends on the actual implementation of CountryQuiz)
      expect(screen.getByText(/country quiz/i)).toBeInTheDocument()
    })

    it('should preserve auth modal state during quiz interactions', async () => {
      const user = userEvent.setup()

      const mockAuthContext = {
        user: null,
        isAuthenticated: false,
        isLoading: false,
        login: vi.fn(),
        register: vi.fn(),
        loginWithOAuth: vi.fn(),
        logout: vi.fn(),
        updateProfile: vi.fn()
      }

      renderWithAuth(<CountryQuiz />, mockAuthContext)

      // Step 1: Wait for auth modal to appear
      await waitFor(() => {
        expect(screen.getByText('Login to your account')).toBeInTheDocument()
      })

      // Step 2: Enter some data in the form
      const emailInput = screen.getByRole('textbox', { name: /email/i })
      await user.type(emailInput, 'test@example.com')

      // Step 3: Switch to register mode
      const switchToRegisterButton = screen.getByRole('button', { name: 'Switch to Register form' })
      await user.click(switchToRegisterButton)

      // Step 4: Verify email is preserved (Requirement 2.4)
      expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument()

      // Step 5: Switch back to login mode
      const switchToLoginButton = screen.getByRole('button', { name: 'Switch to Login form' })
      await user.click(switchToLoginButton)

      // Step 6: Verify email is still preserved
      expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument()
    })
  })

  describe('E2E Scenario: Error Handling in CountryQuiz Context', () => {
    it('should handle authentication errors gracefully without breaking quiz', async () => {
      const user = userEvent.setup()
      const mockLogin = vi.fn().mockRejectedValue(new Error('Network error'))

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

      renderWithAuth(<CountryQuiz />, mockAuthContext)

      // Step 1: Wait for auth modal to appear
      await waitFor(() => {
        expect(screen.getByText('Login to your account')).toBeInTheDocument()
      })

      // Step 2: Attempt login with error
      const emailInput = screen.getByRole('textbox', { name: /email/i })
      const passwordInput = document.getElementById('login-password')
      const loginButton = screen.getByRole('button', { name: 'Login' })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput!, 'password')
      await user.click(loginButton)

      // Step 3: Verify error is shown
      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument()
      })

      // Step 4: Verify user can still continue without login
      const continueButton = screen.getByRole('button', { name: /continue without login/i })
      await user.click(continueButton)

      // Step 5: Verify quiz is still accessible
      await waitFor(() => {
        expect(screen.queryByText('Login to your account')).not.toBeInTheDocument()
      })
      expect(screen.getByText(/country quiz/i)).toBeInTheDocument()
    })

    it('should handle OAuth errors gracefully', async () => {
      const user = userEvent.setup()
      const mockLoginWithOAuth = vi.fn().mockRejectedValue(new Error('OAuth provider unavailable'))

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

      renderWithAuth(<CountryQuiz />, mockAuthContext)

      // Step 1: Wait for auth modal to appear
      await waitFor(() => {
        expect(screen.getByText('Login to your account')).toBeInTheDocument()
      })

      // Step 2: Attempt OAuth login
      const googleButton = screen.getByRole('button', { name: 'Login with Google' })
      await user.click(googleButton)

      // Step 3: Verify error is shown
      await waitFor(() => {
        expect(screen.getByText(/oauth provider unavailable/i)).toBeInTheDocument()
      })

      // Step 4: Verify user can still use email login
      const emailInput = screen.getByRole('textbox', { name: /email/i })
      expect(emailInput).toBeEnabled()
    })
  })

  describe('E2E Scenario: Localization in CountryQuiz Context', () => {
    it('should display Russian auth modal when language is set to Russian', async () => {
      // Set Russian language
      localStorage.setItem('settings', JSON.stringify({ language: 'ru' }))

      const mockAuthContext = {
        user: null,
        isAuthenticated: false,
        isLoading: false,
        login: vi.fn(),
        register: vi.fn(),
        loginWithOAuth: vi.fn(),
        logout: vi.fn(),
        updateProfile: vi.fn()
      }

      renderWithAuth(<CountryQuiz />, mockAuthContext)

      // Step 1: Wait for auth modal to appear
      await waitFor(() => {
        expect(screen.getByText('Вход в аккаунт')).toBeInTheDocument()
      })

      // Step 2: Verify Russian OAuth buttons
      expect(screen.getByRole('button', { name: /войти.*google/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /войти.*yandex/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /войти.*vk/i })).toBeInTheDocument()

      // Step 3: Verify Russian continue button
      expect(screen.getByRole('button', { name: /продолжить без входа/i })).toBeInTheDocument()
    })
  })
})