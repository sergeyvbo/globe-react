import React, { useState, useEffect } from 'react'
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
  Stack,
  Grid,
  LinearProgress,
  Divider
} from '@mui/material'
import {
  Person as PersonIcon,
  Email as EmailIcon,
  Lock as LockIcon,
  Security as SecurityIcon,
  TrendingUp as TrendingUpIcon,
  EmojiEvents as TrophyIcon,
  Quiz as QuizIcon,
  Flag as FlagIcon,
  Public as PublicIcon,
  LocationOn as LocationIcon
} from '@mui/icons-material'
import { useAuth } from './AuthContext'
import { authService, ValidationUtils } from './AuthService'
import { gameProgressService, GameStats } from './GameProgressService'
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
  
  // Game statistics state
  const [gameStats, setGameStats] = useState<GameStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)

  // Load game statistics when component mounts
  useEffect(() => {
    const loadGameStats = async () => {
      if (!user) return
      
      try {
        setStatsLoading(true)
        const stats = await gameProgressService.getGameStats(user.id)
        setGameStats(stats)
      } catch (error) {
        console.error('Failed to load game statistics:', error)
      } finally {
        setStatsLoading(false)
      }
    }

    loadGameStats()
  }, [user])

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

      {/* Game Statistics Section */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <TrendingUpIcon sx={{ mr: 2, color: 'text.secondary' }} />
            <Typography variant="h6" component="h3">
              Game Statistics
            </Typography>
          </Box>

          {statsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : gameStats && gameStats.totalGames > 0 ? (
            <Box>
              {/* Overall Statistics */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="primary">
                      {gameStats.totalGames}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Games
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="success.main">
                      {Math.round(gameStats.averageAccuracy)}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Accuracy
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="warning.main">
                      {gameStats.bestStreak}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Best Streak
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="info.main">
                      {gameStats.totalCorrectAnswers}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Correct Answers
                    </Typography>
                  </Box>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              {/* Game Type Statistics */}
              <Typography variant="h6" sx={{ mb: 2 }}>
                By Game Type
              </Typography>
              
              <Stack spacing={2}>
                {/* Countries Quiz */}
                {gameStats.gameTypeStats.countries.games > 0 && (
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <PublicIcon sx={{ mr: 1, color: 'primary.main' }} />
                      <Typography variant="subtitle1">
                        Countries Quiz
                      </Typography>
                      <Chip 
                        label={`${gameStats.gameTypeStats.countries.games} games`}
                        size="small"
                        sx={{ ml: 'auto' }}
                      />
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Typography variant="body2" sx={{ minWidth: 80 }}>
                        Accuracy: {Math.round(gameStats.gameTypeStats.countries.accuracy)}%
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={gameStats.gameTypeStats.countries.accuracy}
                        sx={{ flexGrow: 1, mx: 2 }}
                      />
                      <Typography variant="body2">
                        Best: {gameStats.gameTypeStats.countries.bestStreak}
                      </Typography>
                    </Box>
                  </Box>
                )}

                {/* Flags Quiz */}
                {gameStats.gameTypeStats.flags.games > 0 && (
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <FlagIcon sx={{ mr: 1, color: 'success.main' }} />
                      <Typography variant="subtitle1">
                        Flags Quiz
                      </Typography>
                      <Chip 
                        label={`${gameStats.gameTypeStats.flags.games} games`}
                        size="small"
                        sx={{ ml: 'auto' }}
                      />
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Typography variant="body2" sx={{ minWidth: 80 }}>
                        Accuracy: {Math.round(gameStats.gameTypeStats.flags.accuracy)}%
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={gameStats.gameTypeStats.flags.accuracy}
                        sx={{ flexGrow: 1, mx: 2 }}
                      />
                      <Typography variant="body2">
                        Best: {gameStats.gameTypeStats.flags.bestStreak}
                      </Typography>
                    </Box>
                  </Box>
                )}

                {/* States Quiz */}
                {gameStats.gameTypeStats.states.games > 0 && (
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <LocationIcon sx={{ mr: 1, color: 'warning.main' }} />
                      <Typography variant="subtitle1">
                        States Quiz
                      </Typography>
                      <Chip 
                        label={`${gameStats.gameTypeStats.states.games} games`}
                        size="small"
                        sx={{ ml: 'auto' }}
                      />
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Typography variant="body2" sx={{ minWidth: 80 }}>
                        Accuracy: {Math.round(gameStats.gameTypeStats.states.accuracy)}%
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={gameStats.gameTypeStats.states.accuracy}
                        sx={{ flexGrow: 1, mx: 2 }}
                      />
                      <Typography variant="body2">
                        Best: {gameStats.gameTypeStats.states.bestStreak}
                      </Typography>
                    </Box>
                  </Box>
                )}
              </Stack>

              {/* Last Played */}
              <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                <Typography variant="body2" color="text.secondary">
                  Last played: {gameStats.lastPlayedAt.toLocaleString()}
                </Typography>
              </Box>
            </Box>
          ) : (
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <QuizIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No Game History Yet
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Start playing quizzes to see your statistics here!
              </Typography>
            </Box>
          )}
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
                    helperText={errors.newPassword || getAuthString('passwordHelperText')}
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