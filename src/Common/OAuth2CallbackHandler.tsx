import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CircularProgress, Box, Typography, Alert } from '@mui/material'
import { authService } from './AuthService'
import { AuthServiceError } from './AuthService'

interface OAuth2CallbackHandlerProps {
  onSuccess?: () => void
  onError?: (error: AuthServiceError) => void
  redirectTo?: string
}

/**
 * OAuth2CallbackHandler component handles OAuth2 callback redirects
 * This component should be rendered on OAuth2 callback routes like /auth/callback/:provider
 */
export const OAuth2CallbackHandler: React.FC<OAuth2CallbackHandlerProps> = ({
  onSuccess,
  onError,
  redirectTo = '/'
}) => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const handleCallback = async () => {
      try {
        setLoading(true)
        setError(null)

        // Check if this is an OAuth2 callback URL
        if (!authService.isOAuthCallback()) {
          throw new Error('Not an OAuth2 callback URL')
        }

        // Process the OAuth2 callback
        const authResponse = await authService.handleOAuthCallback()
        
        // Call success callback if provided
        if (onSuccess) {
          onSuccess()
        }

        // Redirect to the specified route
        navigate(redirectTo, { replace: true })

      } catch (err) {
        console.error('OAuth2 callback error:', err)
        
        const authError = err instanceof AuthServiceError ? err : new AuthServiceError({
          type: 'OAUTH_ERROR' as any,
          message: err instanceof Error ? err.message : 'OAuth2 authentication failed'
        })

        setError(authError.message)
        
        // Call error callback if provided
        if (onError) {
          onError(authError)
        }

        // Redirect to home page after a delay
        setTimeout(() => {
          navigate('/', { replace: true })
        }, 3000)
      } finally {
        setLoading(false)
      }
    }

    handleCallback()
  }, [navigate, onSuccess, onError, redirectTo])

  if (loading) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="100vh"
        gap={2}
      >
        <CircularProgress size={48} />
        <Typography variant="h6" color="textSecondary">
          Completing authentication...
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Please wait while we process your login.
        </Typography>
      </Box>
    )
  }

  if (error) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="100vh"
        gap={2}
        px={2}
      >
        <Alert severity="error" sx={{ maxWidth: 400 }}>
          <Typography variant="h6" gutterBottom>
            Authentication Failed
          </Typography>
          <Typography variant="body2">
            {error}
          </Typography>
        </Alert>
        <Typography variant="body2" color="textSecondary">
          Redirecting to home page...
        </Typography>
      </Box>
    )
  }

  return null
}

export default OAuth2CallbackHandler