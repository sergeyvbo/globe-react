import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { AuthModal } from './AuthModal'
import { AuthProvider } from './AuthContext'
import AuthContext from './AuthContext'

// Mock the auth context for E2E scenarios
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

describe('AuthModal E2E Tests - New Streamlined UX', () => {
  const mockOnClose = vi.fn()

  beforeEach(() => {
    mockOnClose.mockClear()
    // Clear localStorage to ensure clean state
    localStorage.clear()
    // Set English language for consistent testing
    localStorage.setItem('settings', JSON.stringify({ language: 'en' }))
  })

  describe('E2E Scenario 1: Complete Login Flow Through New Interface', () => {
    it('should complete full login scenario with email/password', async () => {
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
          <AuthModal open={true} onClose={mockOnClose} />
        </AuthContext.Provider>
      )

      // Step 1: Verify modal opens in login mode by default (Requirement 1.1)
      expect(screen.getByText('Login to your account')).toBeInTheDocument()
      // Verify we're in login mode by checking for login-specific elements
      expect(document.getElementById('login-email')).toBeInTheDocument()
      expect(document.getElementById('login-password')).toBeInTheDocument()

      // Step 2: Verify all required elements are present (Requirements 1.2, 1.3, 1.4, 1.5)
      expect(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument()
      expect(document.getElementById('login-password')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Login with Google' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Login with Yandex' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Login with VK' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /continue without login/i })).toBeInTheDocument()

      // Step 3: Verify OAuth buttons are at the top (Requirement 3.1)
      const oauthSection = screen.getByLabelText('Social login options')
      expect(oauthSection).toBeInTheDocument()

      // Step 4: Verify "or use email" divider is present
      expect(screen.getByText('or use email')).toBeInTheDocument()

      // Step 5: Complete login form
      const emailInput = screen.getByRole('textbox', { name: /email/i })
      const passwordInput = document.getElementById('login-password')
      const loginButton = screen.getByRole('button', { name: 'Login' })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput!, 'Password123')
      await user.click(loginButton)

      // Step 6: Verify login was called with correct parameters
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'Password123')

      // Step 7: Verify modal closes on successful login
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled()
      })
    })

    it('should handle login validation errors gracefully', async () => {
      const user = userEvent.setup()
      renderWithAuth(<AuthModal open={true} onClose={mockOnClose} />)

      // Step 1: Try to submit empty form
      const loginButton = screen.getByRole('button', { name: 'Login' })
      await user.click(loginButton)

      // Step 2: Verify validation errors appear
      expect(screen.getAllByText('Email is required')).toHaveLength(2)
      expect(screen.getAllByText('Password is required')).toHaveLength(2)

      // Step 3: Enter invalid email
      const emailInput = screen.getByRole('textbox', { name: /email/i })
      await user.type(emailInput, 'invalid-email')
      await user.click(loginButton)

      // Step 4: Verify email validation error
      expect(screen.getAllByText('Please enter a valid email address')).toHaveLength(2)

      // Step 5: Fix email and add valid password
      await user.clear(emailInput)
      await user.type(emailInput, 'test@example.com')
      const passwordInput = document.getElementById('login-password')
      await user.type(passwordInput!, 'Password123')

      // Step 6: Verify errors are cleared when valid input is provided
      expect(screen.queryByText('Please enter a valid email address')).not.toBeInTheDocument()
      expect(screen.queryByText('Email is required')).not.toBeInTheDocument()
    })
  })

  describe('E2E Scenario 2: Complete Registration Flow Through New Interface', () => {
    it('should complete full registration scenario', async () => {
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
          <AuthModal open={true} onClose={mockOnClose} />
        </AuthContext.Provider>
      )

      // Step 1: Start in login mode, switch to register (Requirement 2.1)
      expect(screen.getByText('Login to your account')).toBeInTheDocument()
      
      const switchToRegisterButton = screen.getByRole('button', { name: 'Switch to Register form' })
      await user.click(switchToRegisterButton)

      // Step 2: Verify switched to register mode (Requirement 2.1)
      expect(screen.getByText('Create new account')).toBeInTheDocument()

      // Step 3: Verify all register elements are present (Requirements 2.1, 3.2, 3.3, 3.4)
      expect(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument()
      expect(document.getElementById('register-password')).toBeInTheDocument()
      expect(document.getElementById('register-confirm-password')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Register with Google' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Register with Yandex' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Register with VK' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /continue without login/i })).toBeInTheDocument()

      // Step 4: Verify "or create account with email" divider
      expect(screen.getByText('or create account with email')).toBeInTheDocument()

      // Step 5: Complete registration form
      const emailInput = screen.getByRole('textbox', { name: /email/i })
      const passwordInput = document.getElementById('register-password')
      const confirmPasswordInput = document.getElementById('register-confirm-password')
      const registerButton = screen.getByRole('button', { name: 'Register' })

      await user.type(emailInput, 'newuser@example.com')
      await user.type(passwordInput!, 'NewPassword123')
      await user.type(confirmPasswordInput!, 'NewPassword123')
      await user.click(registerButton)

      // Step 6: Verify registration was called with correct parameters
      expect(mockRegister).toHaveBeenCalledWith('newuser@example.com', 'NewPassword123', 'NewPassword123')

      // Step 7: Verify modal closes on successful registration
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled()
      })
    })

    it('should preserve email when switching between modes (Requirement 2.4)', async () => {
      const user = userEvent.setup()
      renderWithAuth(<AuthModal open={true} onClose={mockOnClose} />)

      // Step 1: Enter email in login mode
      const emailInput = screen.getByRole('textbox', { name: /email/i })
      await user.type(emailInput, 'test@example.com')

      // Step 2: Switch to register mode
      const switchToRegisterButton = screen.getByRole('button', { name: 'Switch to Register form' })
      await user.click(switchToRegisterButton)

      // Step 3: Verify email is preserved
      expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument()

      // Step 4: Switch back to login mode
      const switchToLoginButton = screen.getByRole('button', { name: 'Switch to Login form' })
      await user.click(switchToLoginButton)

      // Step 5: Verify email is still preserved
      expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument()
    })
  })

  describe('E2E Scenario 3: Continue Without Login Flow', () => {
    it('should complete "Continue without login" scenario from login mode (Requirement 4.1, 4.2)', async () => {
      const user = userEvent.setup()
      renderWithAuth(<AuthModal open={true} onClose={mockOnClose} />)

      // Step 1: Verify modal opens in login mode
      expect(screen.getByText('Login to your account')).toBeInTheDocument()

      // Step 2: Verify "Continue without login" button is present and visible (Requirement 4.1)
      const continueButton = screen.getByRole('button', { name: /continue without login/i })
      expect(continueButton).toBeInTheDocument()
      expect(continueButton).toBeVisible()

      // Step 3: Click "Continue without login" (Requirement 4.2)
      await user.click(continueButton)

      // Step 4: Verify modal closes (Requirement 4.2)
      expect(mockOnClose).toHaveBeenCalled()
    })

    it('should complete "Continue without login" scenario from register mode (Requirement 4.1, 4.2)', async () => {
      const user = userEvent.setup()
      renderWithAuth(<AuthModal open={true} onClose={mockOnClose} initialMode="register" />)

      // Step 1: Verify modal opens in register mode
      expect(screen.getByText('Create new account')).toBeInTheDocument()

      // Step 2: Verify "Continue without login" button is present (Requirement 4.1)
      const continueButton = screen.getByRole('button', { name: /continue without login/i })
      expect(continueButton).toBeInTheDocument()

      // Step 3: Click "Continue without login" (Requirement 4.2)
      await user.click(continueButton)

      // Step 4: Verify modal closes (Requirement 4.2)
      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  describe('E2E Scenario 4: OAuth Authentication Flows', () => {
    it('should complete Google OAuth login scenario (Requirement 3.2)', async () => {
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
          <AuthModal open={true} onClose={mockOnClose} />
        </AuthContext.Provider>
      )

      // Step 1: Verify Google OAuth button is present at the top
      const googleButton = screen.getByRole('button', { name: 'Login with Google' })
      expect(googleButton).toBeInTheDocument()

      // Step 2: Click Google OAuth button
      await user.click(googleButton)

      // Step 3: Verify OAuth login was initiated
      expect(mockLoginWithOAuth).toHaveBeenCalledWith('google')

      // Step 4: Verify modal closes on successful OAuth
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled()
      })
    })

    it('should complete Yandex OAuth login scenario (Requirement 3.3)', async () => {
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
          <AuthModal open={true} onClose={mockOnClose} />
        </AuthContext.Provider>
      )

      // Step 1: Click Yandex OAuth button
      const yandexButton = screen.getByRole('button', { name: 'Login with Yandex' })
      await user.click(yandexButton)

      // Step 2: Verify OAuth login was initiated
      expect(mockLoginWithOAuth).toHaveBeenCalledWith('yandex')

      // Step 3: Verify modal closes on successful OAuth
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled()
      })
    })

    it('should complete VK OAuth login scenario (Requirement 3.4)', async () => {
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
          <AuthModal open={true} onClose={mockOnClose} />
        </AuthContext.Provider>
      )

      // Step 1: Click VK OAuth button
      const vkButton = screen.getByRole('button', { name: 'Login with VK' })
      await user.click(vkButton)

      // Step 2: Verify OAuth login was initiated
      expect(mockLoginWithOAuth).toHaveBeenCalledWith('vk')

      // Step 3: Verify modal closes on successful OAuth
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled()
      })
    })

    it('should complete OAuth registration scenarios for all providers', async () => {
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

      // Step 1: Verify we're in register mode
      expect(screen.getByText('Create new account')).toBeInTheDocument()

      // Step 2: Test Google OAuth registration
      const googleRegisterButton = screen.getByRole('button', { name: 'Register with Google' })
      await user.click(googleRegisterButton)
      expect(mockLoginWithOAuth).toHaveBeenCalledWith('google')

      // Reset mock for next test
      mockLoginWithOAuth.mockClear()

      // Step 3: Test Yandex OAuth registration
      const yandexRegisterButton = screen.getByRole('button', { name: 'Register with Yandex' })
      await user.click(yandexRegisterButton)
      expect(mockLoginWithOAuth).toHaveBeenCalledWith('yandex')

      // Reset mock for next test
      mockLoginWithOAuth.mockClear()

      // Step 4: Test VK OAuth registration
      const vkRegisterButton = screen.getByRole('button', { name: 'Register with VK' })
      await user.click(vkRegisterButton)
      expect(mockLoginWithOAuth).toHaveBeenCalledWith('vk')
    })

    it('should show loading states during OAuth authentication', async () => {
      const user = userEvent.setup()
      
      // Mock OAuth to simulate loading state
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
          <AuthModal open={true} onClose={mockOnClose} />
        </AuthContext.Provider>
      )

      // Step 1: Click Google OAuth button
      const googleButton = screen.getByRole('button', { name: 'Login with Google' })
      await user.click(googleButton)

      // Step 2: Verify loading indicator appears
      expect(screen.getByRole('progressbar')).toBeInTheDocument()

      // Step 3: Verify all OAuth buttons are disabled during loading
      expect(screen.getByRole('button', { name: /login with google/i })).toBeDisabled()
      expect(screen.getByRole('button', { name: /login with yandex/i })).toBeDisabled()
      expect(screen.getByRole('button', { name: /login with vk/i })).toBeDisabled()

      // Step 4: Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
      }, { timeout: 200 })
    })
  })

  describe('E2E Scenario 5: Localization Testing', () => {
    it('should display Russian interface when language is set to Russian', async () => {
      // Set Russian language
      localStorage.setItem('settings', JSON.stringify({ language: 'ru' }))

      renderWithAuth(<AuthModal open={true} onClose={mockOnClose} />)

      // Step 1: Verify Russian login title
      expect(screen.getByText('Вход в аккаунт')).toBeInTheDocument()

      // Step 2: Verify Russian OAuth button text
      expect(screen.getByRole('button', { name: /войти.*google/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /войти.*yandex/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /войти.*vk/i })).toBeInTheDocument()

      // Step 3: Verify Russian divider text
      expect(screen.getByText('или используйте email')).toBeInTheDocument()

      // Step 4: Verify Russian "Continue without login" button
      expect(screen.getByRole('button', { name: /продолжить без входа/i })).toBeInTheDocument()

      // Step 5: Verify Russian register link
      expect(screen.getByRole('button', { name: /регистрация/i })).toBeInTheDocument()
    })

    it('should display Russian registration interface', async () => {
      const user = userEvent.setup()
      
      // Set Russian language
      localStorage.setItem('settings', JSON.stringify({ language: 'ru' }))

      renderWithAuth(<AuthModal open={true} onClose={mockOnClose} />)

      // Step 1: Switch to register mode
      const switchToRegisterButton = screen.getByRole('button', { name: /регистрация/i })
      await user.click(switchToRegisterButton)

      // Step 2: Verify Russian register title
      expect(screen.getByText('Создание аккаунта')).toBeInTheDocument()

      // Step 3: Verify Russian OAuth registration buttons (check by button text content)
      expect(screen.getByText('Зарегистрироваться через Google')).toBeInTheDocument()
      expect(screen.getByText('Зарегистрироваться через Yandex')).toBeInTheDocument()
      expect(screen.getByText('Зарегистрироваться через VK')).toBeInTheDocument()

      // Step 4: Verify Russian divider text for registration
      expect(screen.getByText('или создайте аккаунт с email')).toBeInTheDocument()
    })
  })

  describe('E2E Scenario 6: Error Handling and Recovery', () => {
    it('should handle and recover from authentication errors', async () => {
      const user = userEvent.setup()
      const mockLogin = vi.fn()
        .mockRejectedValueOnce(new Error('Invalid credentials'))
        .mockResolvedValueOnce(undefined)

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
          <AuthModal open={true} onClose={mockOnClose} />
        </AuthContext.Provider>
      )

      // Step 1: Attempt login with wrong credentials
      const emailInput = screen.getByRole('textbox', { name: /email/i })
      const passwordInput = document.getElementById('login-password')
      const loginButton = screen.getByRole('button', { name: 'Login' })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput!, 'wrongpassword')
      await user.click(loginButton)

      // Step 2: Verify error message appears (check for any error display)
      await waitFor(() => {
        // The error might be displayed in different ways, so check for error role or text
        const errorElement = screen.queryByRole('alert') || screen.queryByText(/error/i) || screen.queryByText(/invalid/i)
        expect(errorElement).toBeInTheDocument()
      })

      // Step 3: Verify user can still continue without login after error
      const continueButton = screen.getByRole('button', { name: /continue without login/i })
      await user.click(continueButton)

      // Step 4: Verify modal closes
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled()
      })
    })

    it('should handle OAuth errors gracefully', async () => {
      const user = userEvent.setup()
      const mockLoginWithOAuth = vi.fn().mockRejectedValue(new Error('OAuth failed'))

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
          <AuthModal open={true} onClose={mockOnClose} />
        </AuthContext.Provider>
      )

      // Step 1: Attempt OAuth login
      const googleButton = screen.getByRole('button', { name: 'Login with Google' })
      await user.click(googleButton)

      // Step 2: Verify error message appears
      await waitFor(() => {
        expect(screen.getByText(/oauth failed/i)).toBeInTheDocument()
      })

      // Step 3: Verify user can still interact with the form
      expect(screen.getByRole('textbox', { name: /email/i })).toBeEnabled()
      expect(document.getElementById('login-password')).toBeEnabled()
    })
  })

  describe('E2E Scenario 7: Accessibility and Keyboard Navigation', () => {
    it('should support full keyboard navigation through the interface', async () => {
      const user = userEvent.setup()
      renderWithAuth(<AuthModal open={true} onClose={mockOnClose} />)

      // Step 1: Tab through OAuth buttons (first tab goes to close button)
      await user.tab()
      expect(screen.getByRole('button', { name: /close.*dialog/i })).toHaveFocus()

      await user.tab()
      expect(screen.getByRole('button', { name: /login.*google/i })).toHaveFocus()

      await user.tab()
      expect(screen.getByRole('button', { name: /login.*yandex/i })).toHaveFocus()

      await user.tab()
      expect(screen.getByRole('button', { name: /login.*vk/i })).toHaveFocus()

      // Step 2: Tab to form fields
      await user.tab()
      expect(screen.getByRole('textbox', { name: /email/i })).toHaveFocus()

      await user.tab()
      expect(document.getElementById('login-password')).toHaveFocus()

      // Step 3: Tab to login button
      await user.tab()
      expect(screen.getByRole('button', { name: 'Login' })).toHaveFocus()

      // Step 4: Tab to register link
      await user.tab()
      expect(screen.getByRole('button', { name: 'Switch to Register form' })).toHaveFocus()

      // Step 5: Tab to continue without login button
      await user.tab()
      expect(screen.getByRole('button', { name: /continue without login/i })).toHaveFocus()
    })

    it('should provide proper ARIA labels and descriptions', () => {
      renderWithAuth(<AuthModal open={true} onClose={mockOnClose} />)

      // Step 1: Verify main form has proper ARIA labels
      expect(screen.getByRole('main')).toHaveAttribute('aria-labelledby', 'login-title')

      // Step 2: Verify OAuth section has proper label
      expect(screen.getByLabelText('Social login options')).toBeInTheDocument()

      // Step 3: Verify form fields have proper ARIA attributes
      const emailInput = screen.getByRole('textbox', { name: /email/i })
      expect(emailInput).toHaveAttribute('required')
      expect(emailInput).toHaveAttribute('aria-invalid', 'false')

      const passwordInput = document.getElementById('login-password')
      expect(passwordInput).toHaveAttribute('required')
    })
  })
})