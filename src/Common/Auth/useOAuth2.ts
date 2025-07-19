import { useState, useCallback } from 'react'
import { OAuthProvider } from '../types'
import { oauth2Service } from './OAuth2Service'
import { authService, AuthServiceError } from './AuthService'

interface UseOAuth2Return {
  loginWithOAuth: (provider: OAuthProvider) => Promise<void>
  isLoading: boolean
  error: string | null
  clearError: () => void
  availableProviders: OAuthProvider[]
  getProviderDisplayName: (provider: OAuthProvider) => string
  getProviderTheme: (provider: OAuthProvider) => { color: string; icon: string }
  isProviderConfigured: (provider: OAuthProvider) => boolean
}

/**
 * Custom hook for OAuth2 authentication
 * Provides methods and state for OAuth2 login flows
 */
export const useOAuth2 = (): UseOAuth2Return => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const loginWithOAuth = useCallback(async (provider: OAuthProvider) => {
    try {
      setIsLoading(true)
      setError(null)

      // Check if provider is configured
      if (!oauth2Service.isProviderConfigured(provider)) {
        throw new AuthServiceError({
          type: 'OAUTH_ERROR' as any,
          message: `${oauth2Service.getProviderDisplayName(provider)} authentication is not configured`
        })
      }

      // Initiate OAuth2 login (this will redirect or open popup)
      await authService.loginWithOAuth(provider)

    } catch (err) {
      console.error('OAuth2 login error:', err)
      
      const errorMessage = err instanceof AuthServiceError 
        ? err.message 
        : `Failed to login with ${oauth2Service.getProviderDisplayName(provider)}`
      
      setError(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const availableProviders = oauth2Service.getConfiguredProviders()

  const getProviderDisplayName = useCallback((provider: OAuthProvider) => {
    return oauth2Service.getProviderDisplayName(provider)
  }, [])

  const getProviderTheme = useCallback((provider: OAuthProvider) => {
    return oauth2Service.getProviderTheme(provider)
  }, [])

  const isProviderConfigured = useCallback((provider: OAuthProvider) => {
    return oauth2Service.isProviderConfigured(provider)
  }, [])

  return {
    loginWithOAuth,
    isLoading,
    error,
    clearError,
    availableProviders,
    getProviderDisplayName,
    getProviderTheme,
    isProviderConfigured
  }
}

export default useOAuth2