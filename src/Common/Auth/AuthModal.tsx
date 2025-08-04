import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Button,
  TextField,
  Box,
  Typography,
  IconButton,
  Alert,
  CircularProgress,
  Divider,
  Stack
} from '@mui/material'
import {
  Close as CloseIcon,
  Google as GoogleIcon,
  AccountCircle as YandexIcon,
  Facebook as VKIcon
} from '@mui/icons-material'
import { useAuth } from './AuthContext'
import { OAuthProvider, AuthError, ValidationErrors } from '../types'
import { getAuthString } from '../../Localization/strings'

// Modal modes - supports login and register modes for streamlined UX
type AuthModalMode = 'login' | 'register'

interface AuthModalProps {
  open: boolean
  onClose: () => void
  /** Initial mode for the auth modal. Defaults to 'login' for streamlined user experience */
  initialMode?: AuthModalMode
}

// Validation functions
const validateEmail = (email: string): { isValid: boolean; message?: string } => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!email) {
    return { isValid: false, message: getAuthString('emailRequired') }
  }
  if (!emailRegex.test(email)) {
    return { isValid: false, message: getAuthString('emailInvalid') }
  }
  return { isValid: true }
}

const validatePassword = (password: string): { isValid: boolean; message?: string } => {
  if (!password) {
    return { isValid: false, message: getAuthString('passwordRequired') }
  }
  if (password.length < 8) {
    return { isValid: false, message: getAuthString('passwordTooShort') }
  }
  // Check if password contains at least one lowercase letter, one uppercase letter, and one digit
  const hasLowercase = /[a-z]/.test(password)
  const hasUppercase = /[A-Z]/.test(password)
  const hasNumber = /\d/.test(password)

  if (!hasLowercase || !hasUppercase || !hasNumber) {
    return { isValid: false, message: getAuthString('passwordMustContainLetterAndNumber') }
  }
  return { isValid: true }
}

const validateConfirmPassword = (password: string, confirmPassword: string): { isValid: boolean; message?: string } => {
  if (!confirmPassword) {
    return { isValid: false, message: getAuthString('confirmPasswordRequired') }
  }
  if (password !== confirmPassword) {
    return { isValid: false, message: getAuthString('passwordsDoNotMatch') }
  }
  return { isValid: true }
}



export const AuthModal: React.FC<AuthModalProps> = ({
  open,
  onClose,
  initialMode = 'login'
}) => {
  const { login, register, loginWithOAuth, isLoading } = useAuth()
  const [mode, setMode] = useState<AuthModalMode>(initialMode)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({})
  const [authError, setAuthError] = useState<string | null>(null)
  const [oauthLoading, setOauthLoading] = useState<OAuthProvider | null>(null)

  // Reset form when modal opens/closes or mode changes
  useEffect(() => {
    if (open) {
      setMode(initialMode)
      setFormData({ email: '', password: '', confirmPassword: '' })
      setValidationErrors({})
      setAuthError(null)
      setOauthLoading(null)
    }
  }, [open, initialMode])

  // Handle form input changes
  const handleInputChange = (field: keyof typeof formData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.value
    setFormData(prev => ({ ...prev, [field]: value }))

    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }))
    }

    // Clear auth error when user starts typing
    if (authError) {
      setAuthError(null)
    }
  }

  // Validate form
  const validateForm = (isRegister: boolean = false): boolean => {
    const errors: ValidationErrors = {}

    const emailValidation = validateEmail(formData.email)
    if (!emailValidation.isValid) {
      errors.email = emailValidation.message || ''
    }

    const passwordValidation = validatePassword(formData.password)
    if (!passwordValidation.isValid) {
      errors.password = passwordValidation.message || ''
    }

    if (isRegister) {
      const confirmPasswordValidation = validateConfirmPassword(
        formData.password,
        formData.confirmPassword
      )
      if (!confirmPasswordValidation.isValid) {
        errors.confirmPassword = confirmPasswordValidation.message || ''
      }
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Handle login
  const handleLogin = async () => {
    if (!validateForm()) return

    try {
      await login(formData.email, formData.password)
      onClose()
    } catch (error: any) {
      handleAuthError(error)
    }
  }

  // Handle register
  const handleRegister = async () => {
    if (!validateForm(true)) return

    try {
      await register(formData.email, formData.password, formData.confirmPassword)
      onClose()
    } catch (error: any) {
      handleAuthError(error)
    }
  }

  // Handle OAuth login
  const handleOAuthLogin = async (provider: OAuthProvider) => {
    try {
      setOauthLoading(provider)
      setAuthError(null)
      await loginWithOAuth(provider)
      onClose()
    } catch (error: any) {
      handleAuthError(error)
    } finally {
      setOauthLoading(null)
    }
  }

  // Handle authentication errors including RFC 9457 validation errors
  const handleAuthError = (error: any) => {
    // Clear previous validation errors
    setValidationErrors({})
    setAuthError(null)

    // Handle RFC 9457 validation errors
    if (error?.type === 'VALIDATION_ERROR' && error?.details?.errors) {
      const serverValidationErrors: ValidationErrors = {}

      // Map server validation errors to form fields
      Object.entries(error.details.errors).forEach(([field, messages]) => {
        if (Array.isArray(messages) && messages.length > 0) {
          // Normalize field names to lowercase for case-insensitive matching
          const normalizedField = field.toLowerCase()

          // Map server field names to form field names with improved mapping
          let formFieldName: string

          if (normalizedField === 'password') {
            formFieldName = 'password'
          } else if (normalizedField === 'email') {
            formFieldName = 'email'
          } else if (normalizedField === 'confirmpassword' || normalizedField === 'confirm_password') {
            formFieldName = 'confirmPassword'
          } else {
            // For any other field, try to match it directly or use the normalized version
            formFieldName = normalizedField
          }

          // Use the first error message for each field
          serverValidationErrors[formFieldName] = messages[0]
        }
      })

      setValidationErrors(serverValidationErrors)

      // If there are validation errors, don't show a general error message
      if (Object.keys(serverValidationErrors).length > 0) {
        return
      }
    }

    // For non-validation errors, show general error message
    setAuthError(getErrorMessage(error))
  }

  // Get error message based on error type
  const getErrorMessage = (error: any): string => {
    // If error has a message property, use it directly (for simple Error objects)
    if (error?.message && typeof error.message === 'string') {
      return error.message
    }

    // If error has a type property, use it to get localized message
    if (error?.type) {
      switch (error.type) {
        case 'INVALID_CREDENTIALS':
          return getAuthString('loginError')
        case 'USER_EXISTS':
          return getAuthString('userExistsError')
        case 'NETWORK_ERROR':
          return getAuthString('networkError')
        case 'VALIDATION_ERROR':
          return getAuthString('validationError')
        case 'OAUTH_ERROR':
          return getAuthString('oauthError')
        default:
          return mode === 'login' ? getAuthString('loginError') : getAuthString('registerError')
      }
    }

    // If error is a string, use it directly
    if (typeof error === 'string') {
      return error
    }

    // Fallback to default error message
    return mode === 'login' ? getAuthString('loginError') : getAuthString('registerError')
  }

  // Handle Enter key press
  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      if (mode === 'login') {
        handleLogin()
      } else if (mode === 'register') {
        handleRegister()
      }
    }
  }

  // OAuth provider icons
  const getOAuthIcon = (provider: OAuthProvider) => {
    switch (provider) {
      case 'google':
        return <GoogleIcon />
      case 'yandex':
        return <YandexIcon />
      case 'vk':
        return <VKIcon />
      default:
        return null
    }
  }

  // OAuth provider colors
  const getOAuthColor = (provider: OAuthProvider) => {
    switch (provider) {
      case 'google':
        return '#4285f4'
      case 'yandex':
        return '#fc3f1d'
      case 'vk':
        return '#4c75a3'
      default:
        return 'primary'
    }
  }



  // Render OAuth buttons with mode parameter for correct button text display
  const renderOAuthButtons = (buttonMode: AuthModalMode = mode) => (
    <Stack spacing={1} role="group" aria-label={`${buttonMode === 'register' ? getAuthString('register') : getAuthString('login')} options`}>
      {(['google', 'yandex', 'vk'] as OAuthProvider[]).map((provider) => {
        const isProviderLoading = oauthLoading === provider
        const isAnyLoading = isLoading || oauthLoading !== null

        // Get the appropriate text based on mode for login/register scenarios
        const getButtonText = () => {
          if (buttonMode === 'register') {
            switch (provider) {
              case 'google':
                return getAuthString('registerWithGoogle')
              case 'yandex':
                return getAuthString('registerWithYandex')
              case 'vk':
                return getAuthString('registerWithVK')
              default:
                return ''
            }
          } else {
            // Default to login mode
            switch (provider) {
              case 'google':
                return getAuthString('loginWithGoogle')
              case 'yandex':
                return getAuthString('loginWithYandex')
              case 'vk':
                return getAuthString('loginWithVK')
              default:
                return ''
            }
          }
        }

        // Get provider display name for ARIA labels
        const getProviderDisplayName = () => {
          switch (provider) {
            case 'google':
              return 'Google'
            case 'yandex':
              return 'Yandex'
            case 'vk':
              return 'VK'
          }
        }

        // Create comprehensive ARIA label
        const ariaLabel = isProviderLoading
          ? `${buttonMode === 'register' ? getAuthString('register') : getAuthString('login')} with ${getProviderDisplayName()}, ${getAuthString('loading')}`
          : `${buttonMode === 'register' ? getAuthString('register') : getAuthString('login')} with ${getProviderDisplayName()}`

        return (
          <Button
            key={provider}
            variant="outlined"
            startIcon={isProviderLoading ? <CircularProgress size={20} /> : getOAuthIcon(provider)}
            onClick={() => handleOAuthLogin(provider)}
            disabled={isAnyLoading}
            fullWidth
            size="large"
            sx={{
              borderColor: getOAuthColor(provider),
              color: getOAuthColor(provider),
              py: 1.5, // Increased height for better UX as per requirements
              fontSize: '0.95rem', // Slightly larger text for better readability
              fontWeight: 500, // Medium weight for better visibility
              '&:hover': {
                borderColor: getOAuthColor(provider),
                backgroundColor: `${getOAuthColor(provider)}10`,
                transform: 'translateY(-1px)', // Subtle lift effect for better UX
                boxShadow: `0 2px 8px ${getOAuthColor(provider)}20`
              },
              '&:disabled': {
                borderColor: isProviderLoading ? getOAuthColor(provider) : undefined,
                color: isProviderLoading ? getOAuthColor(provider) : undefined,
                opacity: isProviderLoading ? 0.8 : 0.5
              },
              transition: 'all 0.2s ease-in-out' // Smooth transitions for better UX
            }}
            aria-label={ariaLabel}
            aria-describedby={isProviderLoading ? `${provider}-loading-status` : undefined}
            tabIndex={0}
          >
            {getButtonText()}
            {/* Hidden status for screen readers when loading */}
            {isProviderLoading && (
              <span
                id={`${provider}-loading-status`}
                className="sr-only"
                aria-live="polite"
                style={{ position: 'absolute', left: '-10000px', width: '1px', height: '1px', overflow: 'hidden' }}
              >
                {getAuthString('loading')}
              </span>
            )}
          </Button>
        )
      })}
    </Stack>
  )

  // Render Login mode
  const renderLogin = () => (
    <Box sx={{ py: 2 }} role="main" aria-labelledby="login-title">
      <Typography
        id="login-title"
        variant="h5"
        gutterBottom
        sx={{ textAlign: 'center' }}
        component="h1"
      >
        {getAuthString('loginTitle')}
      </Typography>

      {authError && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          role="alert"
          aria-live="polite"
        >
          {authError}
        </Alert>
      )}

      {/* OAuth buttons at the top */}
      <Box sx={{ mb: 3 }} aria-label="Social login options">
        {renderOAuthButtons('login')}
      </Box>

      {/* Divider with "or use email" */}
      <Divider sx={{ my: 2 }} role="separator" aria-label={getAuthString('orUseEmail')}>
        <Typography variant="body2" color="text.secondary">
          {getAuthString('orUseEmail')}
        </Typography>
      </Divider>

      {/* Email/Password form */}
      <Box
        component="form"
        role="form"
        aria-labelledby="login-title"
        aria-describedby="login-form-description"
        onSubmit={(e) => {
          e.preventDefault()
          handleLogin()
        }}
      >
        {/* Hidden description for screen readers */}
        <div
          id="login-form-description"
          style={{ position: 'absolute', left: '-10000px', width: '1px', height: '1px', overflow: 'hidden' }}
        >
          Enter your email and password to login to your account
        </div>

        <Stack spacing={2}>
          <TextField
            id="login-email"
            label={getAuthString('email')}
            type="email"
            value={formData.email}
            onChange={handleInputChange('email')}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleLogin()
              }
            }}
            error={!!validationErrors.email}
            helperText={validationErrors.email}
            disabled={isLoading}
            fullWidth
            autoComplete="email"
            required
            aria-required="true"
            aria-invalid={!!validationErrors.email}
            aria-describedby={validationErrors.email ? 'login-email-error' : undefined}
            inputProps={{
              'aria-label': `${getAuthString('email')} field, required`,
              tabIndex: 0
            }}
          />
          {validationErrors.email && (
            <div
              id="login-email-error"
              role="alert"
              aria-live="polite"
              style={{ position: 'absolute', left: '-10000px', width: '1px', height: '1px', overflow: 'hidden' }}
            >
              {validationErrors.email}
            </div>
          )}

          <TextField
            id="login-password"
            label={getAuthString('password')}
            type="password"
            value={formData.password}
            onChange={handleInputChange('password')}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleLogin()
              }
            }}
            error={!!validationErrors.password}
            helperText={validationErrors.password}
            disabled={isLoading}
            fullWidth
            autoComplete="current-password"
            required
            aria-required="true"
            aria-invalid={!!validationErrors.password}
            aria-describedby={validationErrors.password ? 'login-password-error' : undefined}
            inputProps={{
              'aria-label': `${getAuthString('password')} field, required`,
              tabIndex: 0
            }}
          />
          {validationErrors.password && (
            <div
              id="login-password-error"
              role="alert"
              aria-live="polite"
              style={{ position: 'absolute', left: '-10000px', width: '1px', height: '1px', overflow: 'hidden' }}
            >
              {validationErrors.password}
            </div>
          )}

          <Button
            type="submit"
            variant="contained"
            size="large"
            onClick={handleLogin}
            disabled={isLoading}
            fullWidth
            sx={{ mt: 2 }}
            aria-label={isLoading ? `${getAuthString('loginButton')}, ${getAuthString('loading')}` : getAuthString('loginButton')}
            aria-describedby={isLoading ? 'login-loading-status' : undefined}
            tabIndex={0}
          >
            {isLoading ? (
              <>
                <CircularProgress size={20} sx={{ mr: 1 }} />
                {getAuthString('loginButton')}
              </>
            ) : (
              getAuthString('loginButton')
            )}
            {/* Hidden loading status for screen readers */}
            {isLoading && (
              <span
                id="login-loading-status"
                className="sr-only"
                aria-live="polite"
                style={{ position: 'absolute', left: '-10000px', width: '1px', height: '1px', overflow: 'hidden' }}
              >
                {getAuthString('loading')}
              </span>
            )}
          </Button>
        </Stack>
      </Box>

      {/* Link to register */}
      <Box sx={{ textAlign: 'center', mt: 2 }} role="navigation" aria-label="Switch to registration">
        <Typography variant="body2" color="text.secondary">
          {getAuthString('dontHaveAccount')}{' '}
          <Button
            variant="text"
            size="small"
            onClick={() => setMode('register')}
            disabled={isLoading}
            sx={{ textTransform: 'none' }}
            aria-label={`Switch to ${getAuthString('register')} form`}
            tabIndex={0}
          >
            {getAuthString('register')}
          </Button>
        </Typography>
      </Box>

      {/* Continue without login button at the bottom */}
      <Button
        variant="text"
        onClick={onClose}
        fullWidth
        size="large"
        sx={{
          mt: 2,
          py: 1.5, // Increased height for better visibility as per requirements
          px: 2, // Added horizontal padding for better touch targets
          color: 'text.primary', // Changed to primary text color for better visibility
          fontSize: '0.95rem', // Slightly larger text for better readability
          fontWeight: 500, // Medium weight for better visibility
          textTransform: 'none', // Preserve natural casing for better readability
          border: '1px solid transparent', // Invisible border for consistent sizing
          borderRadius: 1, // Subtle border radius for modern look
          '&:hover': {
            backgroundColor: 'action.hover',
            borderColor: 'divider', // Subtle border on hover for better definition
            transform: 'translateY(-1px)', // Subtle lift effect for better UX
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)', // Subtle shadow for depth
            color: 'text.primary' // Ensure text remains visible on hover
          },
          '&:focus-visible': {
            outline: '2px solid',
            outlineColor: 'primary.main',
            outlineOffset: '2px',
            backgroundColor: 'action.hover'
          },
          '&:active': {
            transform: 'translateY(0)', // Reset transform on click for tactile feedback
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
          },
          transition: 'all 0.2s ease-in-out' // Smooth transitions for all effects
        }}
        aria-label={`${getAuthString('continueWithoutLogin')} - Skip authentication and start using the application`}
        tabIndex={0}
      >
        {getAuthString('continueWithoutLogin')}
      </Button>
    </Box>
  )

  // Render Register mode
  const renderRegister = () => (
    <Box sx={{ py: 2 }} role="main" aria-labelledby="register-title">
      <Typography
        id="register-title"
        variant="h5"
        gutterBottom
        sx={{ textAlign: 'center' }}
        component="h1"
      >
        {getAuthString('registerTitle')}
      </Typography>

      {authError && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          role="alert"
          aria-live="polite"
        >
          {authError}
        </Alert>
      )}

      {/* OAuth buttons at the top */}
      <Box sx={{ mb: 3 }} aria-label="Social registration options">
        {renderOAuthButtons('register')}
      </Box>

      {/* Divider with "or create account with email" */}
      <Divider sx={{ my: 2 }} role="separator" aria-label={getAuthString('orCreateWithEmail')}>
        <Typography variant="body2" color="text.secondary">
          {getAuthString('orCreateWithEmail')}
        </Typography>
      </Divider>

      {/* Registration form */}
      <Box
        component="form"
        role="form"
        aria-labelledby="register-title"
        aria-describedby="register-form-description"
        onSubmit={(e) => {
          e.preventDefault()
          handleRegister()
        }}
      >
        {/* Hidden description for screen readers */}
        <div
          id="register-form-description"
          style={{ position: 'absolute', left: '-10000px', width: '1px', height: '1px', overflow: 'hidden' }}
        >
          Create a new account by entering your email and password. Password must be at least 8 characters with letters and numbers.
        </div>

        <Stack spacing={2}>
          <TextField
            id="register-email"
            label={getAuthString('email')}
            type="email"
            value={formData.email}
            onChange={handleInputChange('email')}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleRegister()
              }
            }}
            error={!!validationErrors.email}
            helperText={validationErrors.email}
            disabled={isLoading}
            fullWidth
            autoComplete="email"
            required
            aria-required="true"
            aria-invalid={!!validationErrors.email}
            aria-describedby={validationErrors.email ? 'register-email-error' : undefined}
            inputProps={{
              'aria-label': `${getAuthString('email')} field, required`,
              tabIndex: 0
            }}
          />
          {validationErrors.email && (
            <div
              id="register-email-error"
              role="alert"
              aria-live="polite"
              style={{ position: 'absolute', left: '-10000px', width: '1px', height: '1px', overflow: 'hidden' }}
            >
              {validationErrors.email}
            </div>
          )}

          <TextField
            id="register-password"
            label={getAuthString('password')}
            type="password"
            value={formData.password}
            onChange={handleInputChange('password')}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleRegister()
              }
            }}
            error={!!validationErrors.password}
            helperText={validationErrors.password || getAuthString('passwordHelperText')}
            disabled={isLoading}
            fullWidth
            autoComplete="new-password"
            required
            aria-required="true"
            aria-invalid={!!validationErrors.password}
            aria-describedby="register-password-help register-password-error"
            inputProps={{
              'aria-label': `${getAuthString('password')} field, required. ${getAuthString('passwordHelperText')}`,
              tabIndex: 0
            }}
          />
          <div
            id="register-password-help"
            style={{ position: 'absolute', left: '-10000px', width: '1px', height: '1px', overflow: 'hidden' }}
          >
            {getAuthString('passwordHelperText')}
          </div>
          {validationErrors.password && (
            <div
              id="register-password-error"
              role="alert"
              aria-live="polite"
              style={{ position: 'absolute', left: '-10000px', width: '1px', height: '1px', overflow: 'hidden' }}
            >
              {validationErrors.password}
            </div>
          )}

          <TextField
            id="register-confirm-password"
            label={getAuthString('confirmPasswordRegister')}
            type="password"
            value={formData.confirmPassword}
            onChange={handleInputChange('confirmPassword')}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleRegister()
              }
            }}
            error={!!validationErrors.confirmPassword}
            helperText={validationErrors.confirmPassword}
            disabled={isLoading}
            fullWidth
            autoComplete="new-password"
            required
            aria-required="true"
            aria-invalid={!!validationErrors.confirmPassword}
            aria-describedby={validationErrors.confirmPassword ? 'register-confirm-password-error' : undefined}
            inputProps={{
              'aria-label': `${getAuthString('confirmPasswordRegister')} field, required. Must match the password above`,
              tabIndex: 0
            }}
          />
          {validationErrors.confirmPassword && (
            <div
              id="register-confirm-password-error"
              role="alert"
              aria-live="polite"
              style={{ position: 'absolute', left: '-10000px', width: '1px', height: '1px', overflow: 'hidden' }}
            >
              {validationErrors.confirmPassword}
            </div>
          )}

          <Button
            type="submit"
            variant="contained"
            size="large"
            onClick={handleRegister}
            disabled={isLoading}
            fullWidth
            sx={{ mt: 2 }}
            aria-label={isLoading ? `${getAuthString('registerButton')}, ${getAuthString('loading')}` : getAuthString('registerButton')}
            aria-describedby={isLoading ? 'register-loading-status' : undefined}
            tabIndex={0}
          >
            {isLoading ? (
              <>
                <CircularProgress size={20} sx={{ mr: 1 }} />
                {getAuthString('registerButton')}
              </>
            ) : (
              getAuthString('registerButton')
            )}
            {/* Hidden loading status for screen readers */}
            {isLoading && (
              <span
                id="register-loading-status"
                className="sr-only"
                aria-live="polite"
                style={{ position: 'absolute', left: '-10000px', width: '1px', height: '1px', overflow: 'hidden' }}
              >
                {getAuthString('loading')}
              </span>
            )}
          </Button>
        </Stack>
      </Box>

      {/* Link to login */}
      <Box sx={{ textAlign: 'center', mt: 2 }} role="navigation" aria-label="Switch to login">
        <Typography variant="body2" color="text.secondary">
          {getAuthString('alreadyHaveAccount')}{' '}
          <Button
            variant="text"
            size="small"
            onClick={() => setMode('login')}
            disabled={isLoading}
            sx={{ textTransform: 'none' }}
            aria-label={`Switch to ${getAuthString('login')} form`}
            tabIndex={0}
          >
            {getAuthString('login')}
          </Button>
        </Typography>
      </Box>

      {/* Continue without login button at the bottom */}
      <Button
        variant="text"
        onClick={onClose}
        fullWidth
        size="large"
        sx={{
          mt: 2,
          py: 1.5, // Increased height for better visibility as per requirements
          px: 2, // Added horizontal padding for better touch targets
          color: 'text.primary', // Changed to primary text color for better visibility
          fontSize: '0.95rem', // Slightly larger text for better readability
          fontWeight: 500, // Medium weight for better visibility
          textTransform: 'none', // Preserve natural casing for better readability
          border: '1px solid transparent', // Invisible border for consistent sizing
          borderRadius: 1, // Subtle border radius for modern look
          '&:hover': {
            backgroundColor: 'action.hover',
            borderColor: 'divider', // Subtle border on hover for better definition
            transform: 'translateY(-1px)', // Subtle lift effect for better UX
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)', // Subtle shadow for depth
            color: 'text.primary' // Ensure text remains visible on hover
          },
          '&:focus-visible': {
            outline: '2px solid',
            outlineColor: 'primary.main',
            outlineOffset: '2px',
            backgroundColor: 'action.hover'
          },
          '&:active': {
            transform: 'translateY(0)', // Reset transform on click for tactile feedback
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
          },
          transition: 'all 0.2s ease-in-out' // Smooth transitions for all effects
        }}
        aria-label={`${getAuthString('continueWithoutLogin')} - Skip authentication and start using the application`}
        tabIndex={0}
      >
        {getAuthString('continueWithoutLogin')}
      </Button>
    </Box>
  )

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 2,
            minHeight: '400px'
          }
        }
      }}
      aria-labelledby={mode === 'login' ? 'login-title' : 'register-title'}
      aria-describedby={mode === 'login' ? 'login-form-description' : 'register-form-description'}
      role="dialog"
      aria-modal="true"
    >
      <DialogTitle sx={{ m: 0, p: 2, position: 'relative' }}>
        <IconButton
          aria-label={`Close ${mode === 'login' ? getAuthString('login') : getAuthString('register')} dialog`}
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: (theme) => theme.palette.grey[500],
          }}
          tabIndex={0}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 3, pb: 3 }}>
        {mode === 'login' && renderLogin()}
        {mode === 'register' && renderRegister()}
      </DialogContent>
    </Dialog>
  )
}

export default AuthModal