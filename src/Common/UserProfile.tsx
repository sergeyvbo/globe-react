import React, { useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  Avatar,
  Chip,
  CircularProgress,
  Stack
} from '@mui/material'
import {
  Person as PersonIcon,
  Email as EmailIcon,
  Lock as LockIcon,
  Security as SecurityIcon
} from '@mui/icons-material'
import { useAuth } from './AuthContext'
import { authService, ValidationUtils } from './AuthService'
import { getAuthString } from '../Localization/strings'

interface PasswordChangeForm {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

interface FormErrors {
  currentPassword?: string
  newPassword?: string
  confirmPassword?: string
  general?: string
}

export const UserProfile: React.FC = () => {
  const { user } = useAuth()
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [passwordForm, setPasswordForm] = useState<PasswordChangeForm>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [successMessage, setSuccessMessage] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)

  // If no user is logged in, show error
  if (!user) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Alert severity="error">
          {getAuthString('mustBeLoggedIn')}
        </Alert>
      </Box>
    )
  }

  const isOAuthUser = user.provider !== 'email'

  const getProviderDisplayName = (provider: string): string => {
    switch (provider) {
      case 'google':
        return 'Google'
      case 'yandex':
        return 'Yandex'
      case 'vk':
        return 'VK'
      case 'email':
        return 'Email'
      default:
        return provider
    }
  }

  const getProviderColor = (provider: string): 'primary' | 'secondary' | 'success' | 'warning' | 'info' => {
    switch (provider) {
      case 'google':
        return 'warning'
      case 'yandex':
        return 'warning'
      case 'vk':
        return 'info'
      case 'email':
        return 'primary'
      default:
        return 'secondary'
    }
  }

  const handlePasswordFormChange = (field: keyof PasswordChangeForm) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.value
    setPasswordForm(prev => ({ ...prev, [field]: value }))
    
    // Clear field-specific error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
    
    // Clear success message when form is modified
    if (successMessage) {
      setSuccessMessage('')
    }
  }

  const validatePasswordForm = (): boolean => {
    const newErrors: FormErrors = {}

    // Validate current password
    if (!passwordForm.currentPassword.trim()) {
      newErrors.currentPassword = getAuthString('currentPasswordRequired')
    }

    // Validate new password
    const passwordValidation = ValidationUtils.validatePassword(passwordForm.newPassword)
    if (!passwordValidation.isValid) {
      newErrors.newPassword = passwordValidation.message
    }

    // Validate password confirmation
    const confirmValidation = ValidationUtils.validatePasswordConfirmation(
      passwordForm.newPassword,
      passwordForm.confirmPassword
    )
    if (!confirmValidation.isValid) {
      newErrors.confirmPassword = confirmValidation.message
    }

    // Check if new password is different from current
    if (passwordForm.currentPassword === passwordForm.newPassword) {
      newErrors.newPassword = getAuthString('newPasswordDifferent')
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handlePasswordChange = async (event: React.FormEvent) => {
    event.preventDefault()
    
    if (!validatePasswordForm()) {
      return
    }

    setIsLoading(true)
    setErrors({})
    setSuccessMessage('')

    try {
      await authService.changePassword(
        passwordForm.currentPassword,
        passwordForm.newPassword,
        passwordForm.confirmPassword
      )

      // Clear form and show success message
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
      setSuccessMessage(getAuthString('passwordChanged'))
      setIsChangingPassword(false)

    } catch (error: any) {
      console.error('Password change error:', error)
      
      if (error.type === 'INVALID_CREDENTIALS') {
        setErrors({ currentPassword: getAuthString('currentPasswordIncorrect') })
      } else if (error.type === 'VALIDATION_ERROR') {
        setErrors({ general: error.message })
      } else {
        setErrors({ general: getAuthString('passwordChangeFailed') })
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancelPasswordChange = () => {
    setIsChangingPassword(false)
    setPasswordForm({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    })
    setErrors({})
    setSuccessMessage('')
  }

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 3 }}>
        {getAuthString('userProfile')}
      </Typography>

      {/* User Information Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Avatar sx={{ width: 64, height: 64, mr: 2, bgcolor: 'primary.main' }}>
              {user.avatar ? (
                <img src={user.avatar} alt="Profile" style={{ width: '100%', height: '100%' }} />
              ) : (
                <PersonIcon sx={{ fontSize: 32 }} />
              )}
            </Avatar>
            <Box>
              <Typography variant="h6" component="h2">
                {user.name || 'User'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {getAuthString('memberSince')} {new Date(user.createdAt).toLocaleDateString()}
              </Typography>
            </Box>
          </Box>

          <Stack spacing={2}>
            {/* Email */}
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <EmailIcon sx={{ mr: 2, color: 'text.secondary' }} />
              <Box>
                <Typography variant="body2" color="text.secondary">
                  {getAuthString('email')}
                </Typography>
                <Typography variant="body1">
                  {user.email}
                </Typography>
              </Box>
            </Box>

            {/* Authentication Provider */}
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <SecurityIcon sx={{ mr: 2, color: 'text.secondary' }} />
              <Box>
                <Typography variant="body2" color="text.secondary">
                  {getAuthString('authProvider')}
                </Typography>
                <Chip
                  label={getProviderDisplayName(user.provider)}
                  color={getProviderColor(user.provider)}
                  size="small"
                  sx={{ mt: 0.5 }}
                />
              </Box>
            </Box>

            {/* Last Login */}
            {user.lastLoginAt && (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <PersonIcon sx={{ mr: 2, color: 'text.secondary' }} />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    {getAuthString('lastLogin')}
                  </Typography>
                  <Typography variant="body1">
                    {new Date(user.lastLoginAt).toLocaleString()}
                  </Typography>
                </Box>
              </Box>
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* Password Change Section - Only for email users */}
      {!isOAuthUser && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <LockIcon sx={{ mr: 2, color: 'text.secondary' }} />
              <Typography variant="h6" component="h3">
                {getAuthString('passwordSettings')}
              </Typography>
            </Box>

            {successMessage && (
              <Alert severity="success" sx={{ mb: 2 }}>
                {successMessage}
              </Alert>
            )}

            {errors.general && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {errors.general}
              </Alert>
            )}

            {!isChangingPassword ? (
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {getAuthString('passwordChangeDescription')}
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<LockIcon />}
                  onClick={() => setIsChangingPassword(true)}
                >
                  {getAuthString('changePassword')}
                </Button>
              </Box>
            ) : (
              <Box component="form" onSubmit={handlePasswordChange}>
                <Stack spacing={2}>
                  <TextField
                    type="password"
                    label={getAuthString('currentPassword')}
                    value={passwordForm.currentPassword}
                    onChange={handlePasswordFormChange('currentPassword')}
                    error={!!errors.currentPassword}
                    helperText={errors.currentPassword}
                    fullWidth
                    required
                    disabled={isLoading}
                  />

                  <TextField
                    type="password"
                    label={getAuthString('newPassword')}
                    value={passwordForm.newPassword}
                    onChange={handlePasswordFormChange('newPassword')}
                    error={!!errors.newPassword}
                    helperText={errors.newPassword || 'Password must be at least 8 characters with letters and numbers'}
                    fullWidth
                    required
                    disabled={isLoading}
                  />

                  <TextField
                    type="password"
                    label={getAuthString('confirmPassword')}
                    value={passwordForm.confirmPassword}
                    onChange={handlePasswordFormChange('confirmPassword')}
                    error={!!errors.confirmPassword}
                    helperText={errors.confirmPassword}
                    fullWidth
                    required
                    disabled={isLoading}
                  />

                  <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={isLoading}
                      startIcon={isLoading ? <CircularProgress size={16} /> : <LockIcon />}
                    >
                      {isLoading ? getAuthString('changing') : getAuthString('changePassword')}
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={handleCancelPasswordChange}
                      disabled={isLoading}
                    >
                      {getAuthString('cancel')}
                    </Button>
                  </Box>
                </Stack>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {/* OAuth2 Users - Password Change Not Available */}
      {isOAuthUser && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <LockIcon sx={{ mr: 2, color: 'text.secondary' }} />
              <Typography variant="h6" component="h3">
                {getAuthString('passwordSettings')}
              </Typography>
            </Box>
            <Alert severity="info">
              {getAuthString('oauthPasswordInfo')
                .replace('{provider}', getProviderDisplayName(user.provider))
                .replace('{provider}', getProviderDisplayName(user.provider))}
            </Alert>
          </CardContent>
        </Card>
      )}
    </Box>
  )
}

export default UserProfile