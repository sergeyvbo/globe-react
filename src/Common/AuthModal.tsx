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
import { OAuthProvider, AuthError, ValidationErrors } from './types'

// Modal modes
type AuthModalMode = 'welcome' | 'login' | 'register'

interface AuthModalProps {
  open: boolean
  onClose: () => void
  initialMode?: AuthModalMode
}

// Validation functions
const validateEmail = (email: string): { isValid: boolean; message?: string } => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!email) {
    return { isValid: false, message: 'Email is required' }
  }
  if (!emailRegex.test(email)) {
    return { isValid: false, message: 'Please enter a valid email address' }
  }
  return { isValid: true }
}

const validatePassword = (password: string): { isValid: boolean; message?: string } => {
  if (!password) {
    return { isValid: false, message: 'Password is required' }
  }
  if (password.length < 8) {
    return { isValid: false, message: 'Password must be at least 8 characters long' }
  }
  return { isValid: true }
}

const validateConfirmPassword = (password: string, confirmPassword: string): { isValid: boolean; message?: string } => {
  if (!confirmPassword) {
    return { isValid: false, message: 'Please confirm your password' }
  }
  if (password !== confirmPassword) {
    return { isValid: false, message: 'Passwords do not match' }
  }
  return { isValid: true }
}

// Localization strings
const getAuthStrings = () => {
  const settings = JSON.parse(localStorage.getItem('settings') || '{}')
  const language = settings.language || 'en'

  const strings = {
    en: {
      welcome: 'Welcome!',
      welcomeMessage: 'Choose how you want to continue',
      login: 'Login',
      register: 'Register',
      continueWithoutLogin: 'Continue without login',
      loginWithGoogle: 'Login with Google',
      loginWithYandex: 'Login with Yandex',
      loginWithVK: 'Login with VK',
      email: 'Email',
      password: 'Password',
      confirmPassword: 'Confirm Password',
      loginButton: 'Login',
      registerButton: 'Register',
      backToWelcome: 'Back',
      alreadyHaveAccount: 'Already have an account?',
      dontHaveAccount: "Don't have an account?",
      or: 'or',
      loginTitle: 'Login to your account',
      registerTitle: 'Create new account',
      loginError: 'Login failed. Please check your credentials.',
      registerError: 'Registration failed. Please try again.',
      networkError: 'Network error. Please check your connection.',
      validationError: 'Please check your input.',
      userExistsError: 'User with this email already exists.',
      oauthError: 'OAuth login failed. Please try again.'
    },
    ru: {
      welcome: 'Добро пожаловать!',
      welcomeMessage: 'Выберите, как вы хотите продолжить',
      login: 'Войти',
      register: 'Регистрация',
      continueWithoutLogin: 'Продолжить без входа',
      loginWithGoogle: 'Войти через Google',
      loginWithYandex: 'Войти через Yandex',
      loginWithVK: 'Войти через VK',
      email: 'Email',
      password: 'Пароль',
      confirmPassword: 'Подтвердите пароль',
      loginButton: 'Войти',
      registerButton: 'Зарегистрироваться',
      backToWelcome: 'Назад',
      alreadyHaveAccount: 'Уже есть аккаунт?',
      dontHaveAccount: 'Нет аккаунта?',
      or: 'или',
      loginTitle: 'Вход в аккаунт',
      registerTitle: 'Создание аккаунта',
      loginError: 'Ошибка входа. Проверьте учетные данные.',
      registerError: 'Ошибка регистрации. Попробуйте еще раз.',
      networkError: 'Ошибка сети. Проверьте подключение.',
      validationError: 'Проверьте введенные данные.',
      userExistsError: 'Пользователь с таким email уже существует.',
      oauthError: 'Ошибка OAuth авторизации. Попробуйте еще раз.'
    }
  }

  return strings[language as keyof typeof strings]
}

export const AuthModal: React.FC<AuthModalProps> = ({
  open,
  onClose,
  initialMode = 'welcome'
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
  const strings = getAuthStrings()

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
      setAuthError(getErrorMessage(error))
    }
  }

  // Handle register
  const handleRegister = async () => {
    if (!validateForm(true)) return

    try {
      await register(formData.email, formData.password, formData.confirmPassword)
      onClose()
    } catch (error: any) {
      setAuthError(getErrorMessage(error))
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
      setAuthError(getErrorMessage(error))
    } finally {
      setOauthLoading(null)
    }
  }

  // Get error message based on error type
  const getErrorMessage = (error: AuthError): string => {
    switch (error.type) {
      case 'INVALID_CREDENTIALS':
        return strings.loginError
      case 'USER_EXISTS':
        return strings.userExistsError
      case 'NETWORK_ERROR':
        return strings.networkError
      case 'VALIDATION_ERROR':
        return strings.validationError
      case 'OAUTH_ERROR':
        return strings.oauthError
      default:
        return mode === 'login' ? strings.loginError : strings.registerError
    }
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

  // Render Welcome mode
  const renderWelcome = () => (
    <Box sx={{ textAlign: 'center', py: 2 }}>
      <Typography variant="h5" gutterBottom>
        {strings.welcome}
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        {strings.welcomeMessage}
      </Typography>

      <Stack spacing={2}>
        <Button
          variant="contained"
          size="large"
          onClick={() => setMode('login')}
          fullWidth
        >
          {strings.login}
        </Button>

        <Button
          variant="outlined"
          size="large"
          onClick={() => setMode('register')}
          fullWidth
        >
          {strings.register}
        </Button>

        <Button
          variant="text"
          size="large"
          onClick={onClose}
          fullWidth
        >
          {strings.continueWithoutLogin}
        </Button>
      </Stack>
    </Box>
  )

  // Render OAuth buttons
  const renderOAuthButtons = () => (
    <Box sx={{ mt: 2 }}>
      <Divider sx={{ my: 2 }}>
        <Typography variant="body2" color="text.secondary">
          {strings.or}
        </Typography>
      </Divider>

      <Stack spacing={1}>
        {(['google', 'yandex', 'vk'] as OAuthProvider[]).map((provider) => {
          const isProviderLoading = oauthLoading === provider
          const isAnyLoading = isLoading || oauthLoading !== null

          return (
            <Button
              key={provider}
              variant="outlined"
              startIcon={isProviderLoading ? <CircularProgress size={20} /> : getOAuthIcon(provider)}
              onClick={() => handleOAuthLogin(provider)}
              disabled={isAnyLoading}
              fullWidth
              sx={{
                borderColor: getOAuthColor(provider),
                color: getOAuthColor(provider),
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
              {provider === 'google' && strings.loginWithGoogle}
              {provider === 'yandex' && strings.loginWithYandex}
              {provider === 'vk' && strings.loginWithVK}
            </Button>
          )
        })}
      </Stack>
    </Box>
  )

  // Render Login mode
  const renderLogin = () => (
    <Box sx={{ py: 2 }}>
      <Typography variant="h5" gutterBottom sx={{ textAlign: 'center' }}>
        {strings.loginTitle}
      </Typography>

      {authError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {authError}
        </Alert>
      )}

      <Stack spacing={2}>
        <TextField
          label={strings.email}
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
          label={strings.password}
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
          {isLoading ? <CircularProgress size={24} /> : strings.loginButton}
        </Button>

        <Button
          variant="text"
          onClick={() => setMode('welcome')}
          disabled={isLoading}
          fullWidth
        >
          {strings.backToWelcome}
        </Button>
      </Stack>

      {renderOAuthButtons()}

      <Box sx={{ textAlign: 'center', mt: 2 }}>
        <Typography variant="body2" color="text.secondary">
          {strings.dontHaveAccount}{' '}
          <Button
            variant="text"
            size="small"
            onClick={() => setMode('register')}
            disabled={isLoading}
            sx={{ textTransform: 'none' }}
          >
            {strings.register}
          </Button>
        </Typography>
      </Box>
    </Box>
  )

  // Render Register mode
  const renderRegister = () => (
    <Box sx={{ py: 2 }}>
      <Typography variant="h5" gutterBottom sx={{ textAlign: 'center' }}>
        {strings.registerTitle}
      </Typography>

      {authError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {authError}
        </Alert>
      )}

      <Stack spacing={2}>
        <TextField
          label={strings.email}
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
          label={strings.password}
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
          label={strings.confirmPassword}
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
          {isLoading ? <CircularProgress size={24} /> : strings.registerButton}
        </Button>

        <Button
          variant="text"
          onClick={() => setMode('welcome')}
          disabled={isLoading}
          fullWidth
        >
          {strings.backToWelcome}
        </Button>
      </Stack>

      {renderOAuthButtons()}

      <Box sx={{ textAlign: 'center', mt: 2 }}>
        <Typography variant="body2" color="text.secondary">
          {strings.alreadyHaveAccount}{' '}
          <Button
            variant="text"
            size="small"
            onClick={() => setMode('login')}
            disabled={isLoading}
            sx={{ textTransform: 'none' }}
          >
            {strings.login}
          </Button>
        </Typography>
      </Box>
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
        {mode === 'welcome' && renderWelcome()}
        {mode === 'login' && renderLogin()}
        {mode === 'register' && renderRegister()}
      </DialogContent>
    </Dialog>
  )
}

export default AuthModal