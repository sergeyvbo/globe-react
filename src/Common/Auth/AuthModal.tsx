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



  // Render OAuth buttons with mode parameter
  const renderOAuthButtons = (buttonMode: AuthModalMode = mode) => (
    <Stack spacing={1}>
      {(['google', 'yandex', 'vk'] as OAuthProvider[]).map((provider) => {
        const isProviderLoading = oauthLoading === provider
        const isAnyLoading = isLoading || oauthLoading !== null

        // Get the appropriate text based on mode
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
              py: 1.5, // Increased height for better UX
              '&:hover': {
                borderColor: getOAuthColor(provider),
                backgroundColor: `${getOAuthColor(provider)}10`
              },
              '&:disabled': {
                borderColor: isProviderLoading ? getOAuthColor(provider) : undefined,
                color: isProviderLoading ? getOAuthColor(provider) : undefined,
                opacity: isProviderLoading ? 0.8 : 0.5
              }
            }}
          >
            {getButtonText()}
          </Button>
        )
      })}
    </Stack>
  )

  // Render Login mode
  const renderLogin = () => (
    <Box sx={{ py: 2 }}>
      <Typography variant="h5" gutterBottom sx={{ textAlign: 'center' }}>
        {getAuthString('loginTitle')}
      </Typography>

      {authError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {authError}
        </Alert>
      )}

      {/* OAuth buttons at the top */}
      <Stack spacing={1} sx={{ mb: 3 }}>
        {(['google', 'yandex', 'vk'] as OAuthProvider[]).map((provider) => {
          const isProviderLoading = oauthLoading === provider
          const isAnyLoading = isLoading || oauthLoading !== null

          const getButtonText = () => {
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
                py: 1.5, // Increased height for better UX
                '&:hover': {
                  borderColor: getOAuthColor(provider),
                  backgroundColor: `${getOAuthColor(provider)}10`
                },
                '&:disabled': {
                  borderColor: isProviderLoading ? getOAuthColor(provider) : undefined,
                  color: isProviderLoading ? getOAuthColor(provider) : undefined,
                  opacity: isProviderLoading ? 0.8 : 0.5
                }
              }}
            >
              {getButtonText()}
            </Button>
          )
        })}
      </Stack>

      {/* Divider with "or use email" */}
      <Divider sx={{ my: 2 }}>
        <Typography variant="body2" color="text.secondary">
          {getAuthString('orUseEmail')}
        </Typography>
      </Divider>

      {/* Email/Password form */}
      <Stack spacing={2}>
        <TextField
          label={getAuthString('email')}
          type="email"
          value={formData.email}
          onChange={handleInputChange('email')}
          onKeyPress={handleKeyPress}
          error={!!validationErrors.email}
          helperText={validationErrors.email}
          disabled={isLoading}
          fullWidth
          autoComplete="email"
        />

        <TextField
          label={getAuthString('password')}
          type="password"
          value={formData.password}
          onChange={handleInputChange('password')}
          onKeyPress={handleKeyPress}
          error={!!validationErrors.password}
          helperText={validationErrors.password}
          disabled={isLoading}
          fullWidth
          autoComplete="current-password"
        />

        <Button
          variant="contained"
          size="large"
          onClick={handleLogin}
          disabled={isLoading}
          fullWidth
          sx={{ mt: 2 }}
        >
          {isLoading ? (
            <>
              <CircularProgress size={20} sx={{ mr: 1 }} />
              {getAuthString('loginButton')}
            </>
          ) : (
            getAuthString('loginButton')
          )}
        </Button>
      </Stack>

      {/* Link to register */}
      <Box sx={{ textAlign: 'center', mt: 2 }}>
        <Typography variant="body2" color="text.secondary">
          {getAuthString('dontHaveAccount')}{' '}
          <Button
            variant="text"
            size="small"
            onClick={() => setMode('register')}
            disabled={isLoading}
            sx={{ textTransform: 'none' }}
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
          py: 1.5, // Increased height for better visibility
          color: 'text.secondary',
          '&:hover': {
            backgroundColor: 'action.hover'
          }
        }}
      >
        {getAuthString('continueWithoutLogin')}
      </Button>
    </Box>
  )

  // Render Register mode
  const renderRegister = () => (
    <Box sx={{ py: 2 }}>
      <Typography variant="h5" gutterBottom sx={{ textAlign: 'center' }}>
        {getAuthString('registerTitle')}
      </Typography>

      {authError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {authError}
        </Alert>
      )}

      {/* OAuth buttons at the top */}
      <Box sx={{ mb: 3 }}>
        {renderOAuthButtons('register')}
      </Box>

      {/* Divider with "or create account with email" */}
      <Divider sx={{ my: 2 }}>
        <Typography variant="body2" color="text.secondary">
          {getAuthString('orCreateWithEmail')}
        </Typography>
      </Divider>

      {/* Registration form */}
      <Stack spacing={2}>
        <TextField
          label={getAuthString('email')}
          type="email"
          value={formData.email}
          onChange={handleInputChange('email')}
          onKeyPress={handleKeyPress}
          error={!!validationErrors.email}
          helperText={validationErrors.email}
          disabled={isLoading}
          fullWidth
          autoComplete="email"
        />

        <TextField
          label={getAuthString('password')}
          type="password"
          value={formData.password}
          onChange={handleInputChange('password')}
          onKeyPress={handleKeyPress}
          error={!!validationErrors.password}
          helperText={validationErrors.password}
          disabled={isLoading}
          fullWidth
          autoComplete="new-password"
        />

        <TextField
          label={getAuthString('confirmPasswordRegister')}
          type="password"
          value={formData.confirmPassword}
          onChange={handleInputChange('confirmPassword')}
          onKeyPress={handleKeyPress}
          error={!!validationErrors.confirmPassword}
          helperText={validationErrors.confirmPassword}
          disabled={isLoading}
          fullWidth
          autoComplete="new-password"
        />

        <Button
          variant="contained"
          size="large"
          onClick={handleRegister}
          disabled={isLoading}
          fullWidth
          sx={{ mt: 2 }}
        >
          {isLoading ? (
            <>
              <CircularProgress size={20} sx={{ mr: 1 }} />
              {getAuthString('registerButton')}
            </>
          ) : (
            getAuthString('registerButton')
          )}
        </Button>
      </Stack>

      {/* Link to login */}
      <Box sx={{ textAlign: 'center', mt: 2 }}>
        <Typography variant="body2" color="text.secondary">
          {getAuthString('alreadyHaveAccount')}{' '}
          <Button
            variant="text"
            size="small"
            onClick={() => setMode('login')}
            disabled={isLoading}
            sx={{ textTransform: 'none' }}
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
          py: 1.5, // Increased height for better visibility
          color: 'text.secondary',
          '&:hover': {
            backgroundColor: 'action.hover'
          }
        }}
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
      PaperProps={{
        sx: {
          borderRadius: 2,
          minHeight: '400px'
        }
      }}
    >
      <DialogTitle sx={{ m: 0, p: 2, position: 'relative' }}>
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: (theme) => theme.palette.grey[500],
          }}
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