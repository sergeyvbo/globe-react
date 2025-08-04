import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MainMenu } from './MainMenu'
import { AuthProvider } from '../Common/Auth/AuthContext'
import AuthContext from '../Common/Auth/AuthContext'
import { ModalProvider } from '../Common/Modals/ModalProvider'

// Mock the auth context for E2E scenarios
const MockAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <AuthProvider>{children}</AuthProvider>
}

const renderWithAuth = (component: React.ReactElement, authContext?: any) => {
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
    <ModalProvider>
      <AuthContext.Provider value={contextValue}>
        {component}
      </AuthContext.Provider>
    </ModalProvider>
  )
}

describe('MainMenu E2E Tests - Streamlined Auth UX Integration', () => {
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

  describe('E2E Scenario: Auth Modal Integration with MainMenu', () => {
    it('should open auth modal in login mode when login button is clicked (Requirement 1.1, 2.1)', async () => {
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

      renderWithAuth(<MainMenu />, mockAuthContext)

      // Step 1: Find and click the login button
      const loginButton = screen.getByRole('button', { name: /login/i })
      await user.click(loginButton)

      // Step 2: Verify auth modal opens in login mode (not welcome mode)
      await waitFor(() => {
        expect(screen.getByText('Login to your account')).toBeInTheDocument()
      })

      // Step 3: Verify modal is in login mode by default
      expect(screen.getByTestId('auth-modal-mode')).toHaveTextContent('login')

      // Step 4: Verify all login elements are present
      expect(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument()
      expect(document.getElementById('login-password')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Login with Google' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /continue without login/i })).toBeInTheDocument()
    })

    it('should complete full login flow from MainMenu (Requirement 1.1)', async () => {
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

      renderWithAuth(<MainMenu />, mockAuthContext)

      // Step 1: Click login button to open modal
      const loginButton = screen.getByRole('button', { name: /login/i })
      await user.click(loginButton)

      // Step 2: Wait for auth modal to appear
      await waitFor(() => {
        expect(screen.getByText('Login to your account')).toBeInTheDocument()
      })

      // Step 3: Complete login form
      const emailInput = screen.getByRole('textbox', { name: /email/i })
      const passwordInput = document.getElementById('login-password')
      const submitButton = screen.getByRole('button', { name: 'Login' })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput!, 'Password123')
      await user.click(submitButton)

      // Step 4: Verify login was called
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'Password123')

      // Step 5: Verify modal closes
      await waitFor(() => {
        expect(screen.queryByText('Login to your account')).not.toBeInTheDocument()
      })
    })

    it('should switch to registration mode and complete registration flow (Requirement 2.1, 2.2)', async () => {
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

      renderWithAuth(<MainMenu />, mockAuthContext)

      // Step 1: Click login button to open modal
      const loginButton = screen.getByRole('button', { name: /login/i })
      await user.click(loginButton)

      // Step 2: Wait for auth modal to appear in login mode
      await waitFor(() => {
        expect(screen.getByText('Login to your account')).toBeInTheDocument()
      })

      // Step 3: Switch to register mode
      const switchToRegisterButton = screen.getByRole('button', { name: 'Switch to Register form' })
      await user.click(switchToRegisterButton)

      // Step 4: Verify switched to register mode
      expect(screen.getByText('Create new account')).toBeInTheDocument()

      // Step 5: Verify all register elements are present
      expect(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument()
      expect(document.getElementById('register-password')).toBeInTheDocument()
      expect(document.getElementById('register-confirm-password')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Register with Google' })).toBeInTheDocument()

      // Step 6: Complete registration form
      const emailInput = screen.getByRole('textbox', { name: /email/i })
      const passwordInput = document.getElementById('register-password')
      const confirmPasswordInput = document.getElementById('register-confirm-password')
      const registerButton = screen.getByRole('button', { name: 'Register' })

      await user.type(emailInput, 'newuser@example.com')
      await user.type(passwordInput!, 'NewPassword123')
      await user.type(confirmPasswordInput!, 'NewPassword123')
      await user.click(registerButton)

      // Step 7: Verify registration was called
      expect(mockRegister).toHaveBeenCalledWith('newuser@example.com', 'NewPassword123', 'NewPassword123')

      // Step 8: Verify modal closes
      await waitFor(() => {
        expect(screen.queryByText('Create new account')).not.toBeInTheDocument()
      })
    })

    it('should complete OAuth login flows for all providers (Requirement 3.1, 3.2, 3.3, 3.4)', async () => {
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

      renderWithAuth(<MainMenu />, mockAuthContext)

      // Step 1: Open auth modal
      const loginButton = screen.getByRole('button', { name: /login/i })
      await user.click(loginButton)

      await waitFor(() => {
        expect(screen.getByText('Login to your account')).toBeInTheDocument()
      })

      // Step 2: Test Google OAuth
      const googleButton = screen.getByRole('button', { name: 'Login with Google' })
      await user.click(googleButton)
      expect(mockLoginWithOAuth).toHaveBeenCalledWith('google')

      // Reset mock for next test
      mockLoginWithOAuth.mockClear()

      // Step 3: Test Yandex OAuth
      const yandexButton = screen.getByRole('button', { name: 'Login with Yandex' })
      await user.click(yandexButton)
      expect(mockLoginWithOAuth).toHaveBeenCalledWith('yandex')

      // Reset mock for next test
      mockLoginWithOAuth.mockClear()

      // Step 4: Test VK OAuth
      const vkButton = screen.getByRole('button', { name: 'Login with VK' })
      await user.click(vkButton)
      expect(mockLoginWithOAuth).toHaveBeenCalledWith('vk')
    })

    it('should complete "Continue without login" flow (Requirement 4.1, 4.2)', async () => {
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

      renderWithAuth(<MainMenu />, mockAuthContext)

      // Step 1: Open auth modal
      const loginButton = screen.getByRole('button', { name: /login/i })
      await user.click(loginButton)

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

      // Step 4: Verify main menu is still accessible
      expect(screen.getByText(/main menu/i)).toBeInTheDocument()
    })

    it('should not show login button when user is authenticated', async () => {
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

      renderWithAuth(<MainMenu />, mockAuthContext)

      // Step 1: Verify login button is not shown
      expect(screen.queryByRole('button', { name: /login/i })).not.toBeInTheDocument()

      // Step 2: Verify user profile or logout button is shown instead
      expect(screen.getByText('Test User')).toBeInTheDocument()
    })

    it('should preserve modal state during mode switching (Requirement 2.4)', async () => {
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

      renderWithAuth(<MainMenu />, mockAuthContext)

      // Step 1: Open auth modal
      const loginButton = screen.getByRole('button', { name: /login/i })
      await user.click(loginButton)

      await waitFor(() => {
        expect(screen.getByText('Login to your account')).toBeInTheDocument()
      })

      // Step 2: Enter email in login mode
      const emailInput = screen.getByRole('textbox', { name: /email/i })
      await user.type(emailInput, 'test@example.com')

      // Step 3: Switch to register mode
      const switchToRegisterButton = screen.getByRole('button', { name: 'Switch to Register form' })
      await user.click(switchToRegisterButton)

      // Step 4: Verify email is preserved
      expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument()

      // Step 5: Switch back to login mode
      const switchToLoginButton = screen.getByRole('button', { name: 'Switch to Login form' })
      await user.click(switchToLoginButton)

      // Step 6: Verify email is still preserved
      expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument()
    })
  })

  describe('E2E Scenario: Error Handling in MainMenu Context', () => {
    it('should handle authentication errors gracefully', async () => {
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

      renderWithAuth(<MainMenu />, mockAuthContext)

      // Step 1: Open auth modal and attempt login
      const loginButton = screen.getByRole('button', { name: /login/i })
      await user.click(loginButton)

      await waitFor(() => {
        expect(screen.getByText('Login to your account')).toBeInTheDocument()
      })

      const emailInput = screen.getByRole('textbox', { name: /email/i })
      const passwordInput = document.getElementById('login-password')
      const submitButton = screen.getByRole('button', { name: 'Login' })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput!, 'wrongpassword')
      await user.click(submitButton)

      // Step 2: Verify error is shown
      await waitFor(() => {
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument()
      })

      // Step 3: Verify user can still close modal and access main menu
      const continueButton = screen.getByRole('button', { name: /continue without login/i })
      await user.click(continueButton)

      await waitFor(() => {
        expect(screen.queryByText('Login to your account')).not.toBeInTheDocument()
      })
      expect(screen.getByText(/main menu/i)).toBeInTheDocument()
    })

    it('should handle OAuth errors gracefully', async () => {
      const user = userEvent.setup()
      const mockLoginWithOAuth = vi.fn().mockRejectedValue(new Error('OAuth service unavailable'))

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

      renderWithAuth(<MainMenu />, mockAuthContext)

      // Step 1: Open auth modal and attempt OAuth login
      const loginButton = screen.getByRole('button', { name: /login/i })
      await user.click(loginButton)

      await waitFor(() => {
        expect(screen.getByText('Login to your account')).toBeInTheDocument()
      })

      const googleButton = screen.getByRole('button', { name: 'Login with Google' })
      await user.click(googleButton)

      // Step 2: Verify error is shown
      await waitFor(() => {
        expect(screen.getByText(/oauth service unavailable/i)).toBeInTheDocument()
      })

      // Step 3: Verify user can still use email login
      const emailInput = screen.getByRole('textbox', { name: /email/i })
      expect(emailInput).toBeEnabled()
    })
  })

  describe('E2E Scenario: Localization in MainMenu Context', () => {
    it('should display Russian auth modal when opened from Russian MainMenu', async () => {
      const user = userEvent.setup()
      
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

      renderWithAuth(<MainMenu />, mockAuthContext)

      // Step 1: Click login button (should be in Russian)
      const loginButton = screen.getByRole('button', { name: /войти/i })
      await user.click(loginButton)

      // Step 2: Verify auth modal appears in Russian
      await waitFor(() => {
        expect(screen.getByText('Вход в аккаунт')).toBeInTheDocument()
      })

      // Step 3: Verify Russian OAuth buttons
      expect(screen.getByRole('button', { name: /войти.*google/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /войти.*yandex/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /войти.*vk/i })).toBeInTheDocument()

      // Step 4: Verify Russian continue button
      expect(screen.getByRole('button', { name: /продолжить без входа/i })).toBeInTheDocument()
    })
  })

  describe('E2E Scenario: Accessibility and Keyboard Navigation', () => {
    it('should support keyboard navigation from MainMenu to auth modal', async () => {
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

      renderWithAuth(<MainMenu />, mockAuthContext)

      // Step 1: Navigate to login button using keyboard
      await user.tab()
      const loginButton = screen.getByRole('button', { name: /login/i })
      expect(loginButton).toHaveFocus()

      // Step 2: Press Enter to open auth modal
      await user.keyboard('{Enter}')

      // Step 3: Verify auth modal opens and focus moves to first interactive element
      await waitFor(() => {
        expect(screen.getByText('Login to your account')).toBeInTheDocument()
      })

      // Step 4: Verify first OAuth button has focus
      expect(screen.getByRole('button', { name: 'Login with Google' })).toHaveFocus()
    })

    it('should provide proper ARIA labels for auth modal opened from MainMenu', async () => {
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

      renderWithAuth(<MainMenu />, mockAuthContext)

      // Step 1: Open auth modal
      const loginButton = screen.getByRole('button', { name: /login/i })
      await user.click(loginButton)

      await waitFor(() => {
        expect(screen.getByText('Login to your account')).toBeInTheDocument()
      })

      // Step 2: Verify proper ARIA labels
      expect(screen.getByRole('main')).toHaveAttribute('aria-labelledby', 'login-title')
      expect(screen.getByLabelText('Social login options')).toBeInTheDocument()

      // Step 3: Verify form fields have proper ARIA attributes
      const emailInput = screen.getByRole('textbox', { name: /email/i })
      expect(emailInput).toHaveAttribute('required')
    })
  })
})