import { 
  AuthResponse, 
  OAuthProvider,
  AuthErrorType 
} from '../types'
import { AuthServiceError } from './AuthService'
import { API_CONFIG, OAUTH_CONFIG } from '../config/api'

// OAuth2 configuration for different providers
interface OAuth2Config {
  clientId: string
  redirectUri: string
  scope: string
  authUrl: string
  responseType: string
}

// Function to get OAuth2 configurations (allows for easier testing)
const getOAuth2Configs = (): Record<OAuthProvider, OAuth2Config> => ({
  google: {
    clientId: OAUTH_CONFIG.GOOGLE_CLIENT_ID,
    redirectUri: OAUTH_CONFIG.GOOGLE_REDIRECT_URI,
    scope: 'openid email profile',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    responseType: 'code'
  },
  yandex: {
    clientId: OAUTH_CONFIG.YANDEX_CLIENT_ID,
    redirectUri: OAUTH_CONFIG.YANDEX_REDIRECT_URI,
    scope: 'login:email login:info',
    authUrl: 'https://oauth.yandex.ru/authorize',
    responseType: 'code'
  },
  vk: {
    clientId: OAUTH_CONFIG.VK_CLIENT_ID,
    redirectUri: OAUTH_CONFIG.VK_REDIRECT_URI,
    scope: 'email',
    authUrl: 'https://oauth.vk.com/authorize',
    responseType: 'code'
  }
})



// OAuth2 callback data interface
interface OAuth2CallbackData {
  code: string
  state?: string
  error?: string
  error_description?: string
}

// OAuth2 state management for CSRF protection
class OAuth2StateManager {
  private static readonly STATE_KEY = 'oauth2_state'
  private static readonly STATE_EXPIRY_KEY = 'oauth2_state_expiry'
  private static readonly STATE_EXPIRY_TIME = 10 * 60 * 1000 // 10 minutes

  static generateState(): string {
    const state = Math.random().toString(36).substring(2, 15) + 
                  Math.random().toString(36).substring(2, 15)
    
    const expiryTime = Date.now() + this.STATE_EXPIRY_TIME
    
    try {
      sessionStorage.setItem(this.STATE_KEY, state)
      sessionStorage.setItem(this.STATE_EXPIRY_KEY, expiryTime.toString())
    } catch (error) {
      console.error('Failed to save OAuth2 state:', error)
    }
    
    return state
  }

  static validateState(receivedState: string): boolean {
    try {
      const storedState = sessionStorage.getItem(this.STATE_KEY)
      const expiryTime = sessionStorage.getItem(this.STATE_EXPIRY_KEY)
      
      // Clear state after validation attempt
      this.clearState()
      
      if (!storedState || !expiryTime) {
        return false
      }
      
      // Check if state has expired
      if (Date.now() >= parseInt(expiryTime)) {
        return false
      }
      
      return storedState === receivedState
    } catch (error) {
      console.error('Failed to validate OAuth2 state:', error)
      return false
    }
  }

  static clearState(): void {
    try {
      sessionStorage.removeItem(this.STATE_KEY)
      sessionStorage.removeItem(this.STATE_EXPIRY_KEY)
    } catch (error) {
      console.error('Failed to clear OAuth2 state:', error)
    }
  }
}

// Main OAuth2Service class
export class OAuth2Service {
  private static instance: OAuth2Service
  
  private constructor() {}
  
  static getInstance(): OAuth2Service {
    if (!OAuth2Service.instance) {
      OAuth2Service.instance = new OAuth2Service()
    }
    return OAuth2Service.instance
  }

  /**
   * Generate OAuth2 authorization URL for the specified provider
   */
  getAuthUrl(provider: OAuthProvider): string {
    const configs = getOAuth2Configs()
    const config = configs[provider]
    
    if (!config.clientId) {
      throw new AuthServiceError({
        type: AuthErrorType.OAUTH_ERROR,
        message: `OAuth2 client ID not configured for ${provider}`
      })
    }

    const state = OAuth2StateManager.generateState()
    
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      scope: config.scope,
      response_type: config.responseType,
      state: state
    })

    // Add provider-specific parameters
    if (provider === 'google') {
      params.append('access_type', 'offline')
      params.append('prompt', 'consent')
    } else if (provider === 'vk') {
      params.append('v', '5.131') // VK API version
      params.append('display', 'popup')
    }

    return `${config.authUrl}?${params.toString()}`
  }

  /**
   * Initiate OAuth2 login by redirecting to provider's authorization page
   */
  async initiateLogin(provider: OAuthProvider): Promise<void> {
    try {
      const authUrl = this.getAuthUrl(provider)
      
      // Store the provider for callback handling
      sessionStorage.setItem('oauth2_provider', provider)
      
      // Redirect to OAuth2 provider
      window.location.href = authUrl
    } catch (error) {
      if (error instanceof AuthServiceError) {
        throw error
      }
      
      throw new AuthServiceError({
        type: AuthErrorType.OAUTH_ERROR,
        message: `Failed to initiate OAuth2 login for ${provider}`,
        details: error
      })
    }
  }

  /**
   * Handle OAuth2 callback and exchange authorization code for tokens
   */
  async handleCallback(code: string, provider: OAuthProvider, state?: string): Promise<AuthResponse> {
    try {
      // Validate state parameter for CSRF protection
      if (state && !OAuth2StateManager.validateState(state)) {
        throw new AuthServiceError({
          type: AuthErrorType.OAUTH_ERROR,
          message: 'Invalid OAuth2 state parameter. Possible CSRF attack.'
        })
      }

      // Clear OAuth2 provider from session storage
      sessionStorage.removeItem('oauth2_provider')

      // Exchange authorization code for tokens via backend
      const response = await this.exchangeCodeForTokens(code, provider)
      
      return response
    } catch (error) {
      // Clear any stored OAuth2 state on error
      OAuth2StateManager.clearState()
      sessionStorage.removeItem('oauth2_provider')
      
      if (error instanceof AuthServiceError) {
        throw error
      }
      
      throw new AuthServiceError({
        type: AuthErrorType.OAUTH_ERROR,
        message: `OAuth2 callback handling failed for ${provider}`,
        details: error
      })
    }
  }

  /**
   * Exchange authorization code for access tokens via backend API
   */
  private async exchangeCodeForTokens(code: string, provider: OAuthProvider): Promise<AuthResponse> {
    const configs = getOAuth2Configs()
    const config = configs[provider]
    
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/auth/oauth2/${provider}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          redirectUri: config.redirectUri
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new AuthServiceError({
          type: AuthErrorType.OAUTH_ERROR,
          message: errorData.message || `OAuth2 token exchange failed for ${provider}`,
          details: { status: response.status, ...errorData }
        })
      }

      const authResponse: AuthResponse = await response.json()
      
      // Save tokens to localStorage (same as regular login)
      this.saveTokens(authResponse.accessToken, authResponse.refreshToken, authResponse.expiresIn)
      
      return authResponse
    } catch (error) {
      if (error instanceof AuthServiceError) {
        throw error
      }
      
      throw new AuthServiceError({
        type: AuthErrorType.NETWORK_ERROR,
        message: 'Network error during OAuth2 token exchange',
        details: error
      })
    }
  }

  /**
   * Parse OAuth2 callback URL parameters
   */
  parseCallbackUrl(url: string = window.location.href): OAuth2CallbackData {
    const urlObj = new URL(url)
    const params = urlObj.searchParams
    
    const callbackData: OAuth2CallbackData = {
      code: params.get('code') || '',
      state: params.get('state') || undefined,
      error: params.get('error') || undefined,
      error_description: params.get('error_description') || undefined
    }

    return callbackData
  }

  /**
   * Check if current URL is an OAuth2 callback
   */
  isCallbackUrl(url: string = window.location.href): boolean {
    const urlObj = new URL(url)
    return urlObj.pathname.includes('/auth/callback/') || 
           urlObj.searchParams.has('code') || 
           urlObj.searchParams.has('error')
  }

  /**
   * Get the OAuth2 provider from callback URL or session storage
   */
  getProviderFromCallback(url: string = window.location.href): OAuthProvider | null {
    // First try to get from URL path
    const urlObj = new URL(url)
    const pathMatch = urlObj.pathname.match(/\/auth\/callback\/(\w+)/)
    if (pathMatch) {
      const provider = pathMatch[1] as OAuthProvider
      if (this.isValidProvider(provider)) {
        return provider
      }
    }

    // Fallback to session storage
    const storedProvider = sessionStorage.getItem('oauth2_provider') as OAuthProvider
    if (storedProvider && this.isValidProvider(storedProvider)) {
      return storedProvider
    }

    return null
  }

  /**
   * Handle OAuth2 errors from callback
   */
  handleCallbackError(error: string, errorDescription?: string): never {
    let message = 'OAuth2 authentication failed'
    
    switch (error) {
      case 'access_denied':
        message = 'Access denied. You cancelled the authorization.'
        break
      case 'invalid_request':
        message = 'Invalid OAuth2 request.'
        break
      case 'unauthorized_client':
        message = 'Unauthorized OAuth2 client.'
        break
      case 'unsupported_response_type':
        message = 'Unsupported OAuth2 response type.'
        break
      case 'invalid_scope':
        message = 'Invalid OAuth2 scope.'
        break
      case 'server_error':
        message = 'OAuth2 server error occurred.'
        break
      case 'temporarily_unavailable':
        message = 'OAuth2 service is temporarily unavailable.'
        break
      default:
        message = errorDescription || `OAuth2 error: ${error}`
    }

    throw new AuthServiceError({
      type: AuthErrorType.OAUTH_ERROR,
      message,
      details: { error, errorDescription }
    })
  }

  /**
   * Process OAuth2 callback from URL
   */
  async processCallback(url: string = window.location.href): Promise<AuthResponse> {
    const callbackData = this.parseCallbackUrl(url)
    const provider = this.getProviderFromCallback(url)

    if (!provider) {
      throw new AuthServiceError({
        type: AuthErrorType.OAUTH_ERROR,
        message: 'Unable to determine OAuth2 provider from callback'
      })
    }

    // Handle OAuth2 errors
    if (callbackData.error) {
      this.handleCallbackError(callbackData.error, callbackData.error_description)
    }

    // Handle successful callback
    if (!callbackData.code) {
      throw new AuthServiceError({
        type: AuthErrorType.OAUTH_ERROR,
        message: 'No authorization code received from OAuth2 provider'
      })
    }

    return this.handleCallback(callbackData.code, provider, callbackData.state)
  }

  /**
   * Open OAuth2 login in popup window
   */
  async loginWithPopup(provider: OAuthProvider): Promise<AuthResponse> {
    return new Promise((resolve, reject) => {
      try {
        const authUrl = this.getAuthUrl(provider)
        
        // Open popup window
        const popup = window.open(
          authUrl,
          `oauth2_${provider}`,
          'width=500,height=600,scrollbars=yes,resizable=yes'
        )

        if (!popup) {
          throw new AuthServiceError({
            type: AuthErrorType.OAUTH_ERROR,
            message: 'Failed to open OAuth2 popup. Please allow popups for this site.'
          })
        }

        // Poll for popup completion
        const pollTimer = setInterval(() => {
          try {
            if (popup.closed) {
              clearInterval(pollTimer)
              reject(new AuthServiceError({
                type: AuthErrorType.OAUTH_ERROR,
                message: 'OAuth2 popup was closed before completion'
              }))
              return
            }

            // Check if popup URL has changed to callback URL
            if (popup.location && this.isCallbackUrl(popup.location.href)) {
              clearInterval(pollTimer)
              
              this.processCallback(popup.location.href)
                .then(resolve)
                .catch(reject)
                .finally(() => {
                  popup.close()
                })
            }
          } catch (error) {
            // Cross-origin error is expected until callback
            // Continue polling
          }
        }, 1000)

        // Timeout after 5 minutes
        setTimeout(() => {
          clearInterval(pollTimer)
          if (!popup.closed) {
            popup.close()
          }
          reject(new AuthServiceError({
            type: AuthErrorType.OAUTH_ERROR,
            message: 'OAuth2 authentication timed out'
          }))
        }, 5 * 60 * 1000)

      } catch (error) {
        if (error instanceof AuthServiceError) {
          reject(error)
        } else {
          reject(new AuthServiceError({
            type: AuthErrorType.OAUTH_ERROR,
            message: `Failed to initiate OAuth2 popup for ${provider}`,
            details: error
          }))
        }
      }
    })
  }

  /**
   * Validate if provider is supported
   */
  private isValidProvider(provider: string): provider is OAuthProvider {
    return ['google', 'yandex', 'vk'].includes(provider)
  }

  /**
   * Save tokens to localStorage (reusing AuthService token management)
   */
  private saveTokens(accessToken: string, refreshToken: string, expiresIn: number): void {
    try {
      const expiryTime = Date.now() + (expiresIn * 1000)
      
      localStorage.setItem('auth_access_token', accessToken)
      localStorage.setItem('auth_refresh_token', refreshToken)
      localStorage.setItem('auth_token_expiry', expiryTime.toString())
    } catch (error) {
      console.error('Failed to save OAuth2 tokens:', error)
    }
  }

  /**
   * Get provider display name for UI
   */
  getProviderDisplayName(provider: OAuthProvider): string {
    const displayNames: Record<OAuthProvider, string> = {
      google: 'Google',
      yandex: 'Yandex',
      vk: 'VKontakte'
    }
    
    return displayNames[provider] || provider
  }

  /**
   * Get provider icon/color for UI
   */
  getProviderTheme(provider: OAuthProvider): { color: string; icon: string } {
    const themes: Record<OAuthProvider, { color: string; icon: string }> = {
      google: { color: '#4285f4', icon: 'google' },
      yandex: { color: '#fc3f1d', icon: 'yandex' },
      vk: { color: '#4c75a3', icon: 'vk' }
    }
    
    return themes[provider] || { color: '#666', icon: 'oauth' }
  }

  /**
   * Check if OAuth2 is properly configured for a provider
   */
  isProviderConfigured(provider: OAuthProvider): boolean {
    const configs = getOAuth2Configs()
    const config = configs[provider]
    return !!config.clientId
  }

  /**
   * Get list of configured OAuth2 providers
   */
  getConfiguredProviders(): OAuthProvider[] {
    const configs = getOAuth2Configs()
    return (Object.keys(configs) as OAuthProvider[])
      .filter(provider => this.isProviderConfigured(provider))
  }
}

// Export singleton instance
export const oauth2Service = OAuth2Service.getInstance()
export default oauth2Service