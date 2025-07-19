import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { OAuth2Service, oauth2Service } from './OAuth2Service'
import { AuthServiceError } from './AuthService'
import { AuthErrorType, OAuthProvider } from '../types'

// Mock window.location
const mockLocation = {
  href: 'http://localhost:3000',
  origin: 'http://localhost:3000'
}

// Mock sessionStorage
const mockSessionStorage = {
  store: {} as Record<string, string>,
  getItem: vi.fn((key: string) => mockSessionStorage.store[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    mockSessionStorage.store[key] = value
  }),
  removeItem: vi.fn((key: string) => {
    delete mockSessionStorage.store[key]
  }),
  clear: vi.fn(() => {
    mockSessionStorage.store = {}
  })
}

// Mock localStorage
const mockLocalStorage = {
  store: {} as Record<string, string>,
  getItem: vi.fn((key: string) => mockLocalStorage.store[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    mockLocalStorage.store[key] = value
  }),
  removeItem: vi.fn((key: string) => {
    delete mockLocalStorage.store[key]
  }),
  clear: vi.fn(() => {
    mockLocalStorage.store = {}
  })
}

// Mock fetch
const mockFetch = vi.fn()

describe('OAuth2Service', () => {
  let service: OAuth2Service

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks()
    mockSessionStorage.clear()
    mockLocalStorage.clear()
    
    // Setup environment variables
    process.env.REACT_APP_GOOGLE_CLIENT_ID = 'test-google-client-id'
    process.env.REACT_APP_YANDEX_CLIENT_ID = 'test-yandex-client-id'
    process.env.REACT_APP_VK_CLIENT_ID = 'test-vk-client-id'
    process.env.REACT_APP_API_URL = 'http://localhost:3001/api'
    
    // Setup global mocks
    Object.defineProperty(window, 'location', {
      value: mockLocation,
      writable: true
    })
    
    Object.defineProperty(window, 'sessionStorage', {
      value: mockSessionStorage,
      writable: true
    })
    
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true
    })
    
    global.fetch = mockFetch
    
    // Get service instance
    service = OAuth2Service.getInstance()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = OAuth2Service.getInstance()
      const instance2 = OAuth2Service.getInstance()
      expect(instance1).toBe(instance2)
    })
  })

  describe('getAuthUrl', () => {
    it('should generate correct Google OAuth2 URL', () => {
      const url = service.getAuthUrl('google')
      
      expect(url).toContain('https://accounts.google.com/o/oauth2/v2/auth')
      expect(url).toContain('client_id=test-google-client-id')
      expect(url).toMatch(/scope=openid(\+|%20)email(\+|%20)profile/)
      expect(url).toContain('response_type=code')
      expect(url).toContain('access_type=offline')
      expect(url).toContain('prompt=consent')
      expect(url).toContain('state=')
    })

    it('should generate correct Yandex OAuth2 URL', () => {
      const url = service.getAuthUrl('yandex')
      
      expect(url).toContain('https://oauth.yandex.ru/authorize')
      expect(url).toContain('client_id=test-yandex-client-id')
      expect(url).toMatch(/scope=login%3Aemail(\+|%20)login%3Ainfo/)
      expect(url).toContain('response_type=code')
      expect(url).toContain('state=')
    })

    it('should generate correct VK OAuth2 URL', () => {
      const url = service.getAuthUrl('vk')
      
      expect(url).toContain('https://oauth.vk.com/authorize')
      expect(url).toContain('client_id=test-vk-client-id')
      expect(url).toContain('scope=email')
      expect(url).toContain('response_type=code')
      expect(url).toContain('v=5.131')
      expect(url).toContain('display=popup')
      expect(url).toContain('state=')
    })

    it('should throw error if client ID not configured', () => {
      // Clear environment variable
      delete process.env.REACT_APP_GOOGLE_CLIENT_ID
      
      expect(() => service.getAuthUrl('google')).toThrow(AuthServiceError)
      expect(() => service.getAuthUrl('google')).toThrow('OAuth2 client ID not configured for google')
    })

    it('should save state to sessionStorage', () => {
      service.getAuthUrl('google')
      
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith('oauth2_state', expect.any(String))
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith('oauth2_state_expiry', expect.any(String))
    })
  })

  describe('parseCallbackUrl', () => {
    it('should parse successful callback URL', () => {
      const url = 'http://localhost:3000/auth/callback/google?code=test-code&state=test-state'
      const result = service.parseCallbackUrl(url)
      
      expect(result).toEqual({
        code: 'test-code',
        state: 'test-state',
        error: undefined,
        error_description: undefined
      })
    })

    it('should parse error callback URL', () => {
      const url = 'http://localhost:3000/auth/callback/google?error=access_denied&error_description=User%20denied%20access'
      const result = service.parseCallbackUrl(url)
      
      expect(result).toEqual({
        code: '',
        state: undefined,
        error: 'access_denied',
        error_description: 'User denied access'
      })
    })
  })

  describe('isCallbackUrl', () => {
    it('should return true for callback URLs with code', () => {
      const url = 'http://localhost:3000?code=test-code'
      expect(service.isCallbackUrl(url)).toBe(true)
    })

    it('should return true for callback URLs with error', () => {
      const url = 'http://localhost:3000?error=access_denied'
      expect(service.isCallbackUrl(url)).toBe(true)
    })

    it('should return true for callback path URLs', () => {
      const url = 'http://localhost:3000/auth/callback/google'
      expect(service.isCallbackUrl(url)).toBe(true)
    })

    it('should return false for regular URLs', () => {
      const url = 'http://localhost:3000/home'
      expect(service.isCallbackUrl(url)).toBe(false)
    })
  })

  describe('getProviderFromCallback', () => {
    it('should extract provider from callback path', () => {
      const url = 'http://localhost:3000/auth/callback/google?code=test-code'
      const provider = service.getProviderFromCallback(url)
      
      expect(provider).toBe('google')
    })

    it('should get provider from sessionStorage if not in URL', () => {
      mockSessionStorage.store['oauth2_provider'] = 'yandex'
      
      const url = 'http://localhost:3000?code=test-code'
      const provider = service.getProviderFromCallback(url)
      
      expect(provider).toBe('yandex')
    })

    it('should return null if provider not found', () => {
      const url = 'http://localhost:3000?code=test-code'
      const provider = service.getProviderFromCallback(url)
      
      expect(provider).toBe(null)
    })
  })

  describe('handleCallbackError', () => {
    it('should throw AuthServiceError for access_denied', () => {
      expect(() => service.handleCallbackError('access_denied')).toThrow(AuthServiceError)
      expect(() => service.handleCallbackError('access_denied')).toThrow('Access denied. You cancelled the authorization.')
    })

    it('should throw AuthServiceError with custom description', () => {
      expect(() => service.handleCallbackError('custom_error', 'Custom error description')).toThrow(AuthServiceError)
      expect(() => service.handleCallbackError('custom_error', 'Custom error description')).toThrow('Custom error description')
    })
  })

  describe('handleCallback', () => {
    beforeEach(() => {
      // Mock successful API response
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          user: { id: '1', email: 'test@example.com', provider: 'google' },
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
          expiresIn: 3600
        })
      })
    })

    it('should handle successful callback', async () => {
      // Setup valid state
      mockSessionStorage.store['oauth2_state'] = 'test-state'
      mockSessionStorage.store['oauth2_state_expiry'] = (Date.now() + 600000).toString()
      
      const result = await service.handleCallback('test-code', 'google', 'test-state')
      
      expect(result).toEqual({
        user: { id: '1', email: 'test@example.com', provider: 'google' },
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 3600
      })
      
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/auth/oauth2/google',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: 'test-code',
            redirectUri: 'http://localhost:3000/auth/callback/google'
          })
        })
      )
    })

    it('should throw error for invalid state', async () => {
      await expect(service.handleCallback('test-code', 'google', 'invalid-state')).rejects.toThrow(AuthServiceError)
      await expect(service.handleCallback('test-code', 'google', 'invalid-state')).rejects.toThrow('Invalid OAuth2 state parameter')
    })

    it('should handle API error response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: vi.fn().mockResolvedValue({ message: 'Invalid authorization code' })
      })

      await expect(service.handleCallback('invalid-code', 'google')).rejects.toThrow(AuthServiceError)
      await expect(service.handleCallback('invalid-code', 'google')).rejects.toThrow('Invalid authorization code')
    })
  })

  describe('getProviderDisplayName', () => {
    it('should return correct display names', () => {
      expect(service.getProviderDisplayName('google')).toBe('Google')
      expect(service.getProviderDisplayName('yandex')).toBe('Yandex')
      expect(service.getProviderDisplayName('vk')).toBe('VKontakte')
    })
  })

  describe('getProviderTheme', () => {
    it('should return correct themes', () => {
      expect(service.getProviderTheme('google')).toEqual({ color: '#4285f4', icon: 'google' })
      expect(service.getProviderTheme('yandex')).toEqual({ color: '#fc3f1d', icon: 'yandex' })
      expect(service.getProviderTheme('vk')).toEqual({ color: '#4c75a3', icon: 'vk' })
    })
  })

  describe('isProviderConfigured', () => {
    it('should return true for configured providers', () => {
      expect(service.isProviderConfigured('google')).toBe(true)
      expect(service.isProviderConfigured('yandex')).toBe(true)
      expect(service.isProviderConfigured('vk')).toBe(true)
    })

    it('should return false for unconfigured providers', () => {
      delete process.env.REACT_APP_GOOGLE_CLIENT_ID
      expect(service.isProviderConfigured('google')).toBe(false)
    })
  })

  describe('getConfiguredProviders', () => {
    it('should return list of configured providers', () => {
      const providers = service.getConfiguredProviders()
      expect(providers).toEqual(['google', 'yandex', 'vk'])
    })

    it('should exclude unconfigured providers', () => {
      delete process.env.REACT_APP_VK_CLIENT_ID
      const providers = service.getConfiguredProviders()
      expect(providers).toEqual(['google', 'yandex'])
    })
  })

  describe('initiateLogin', () => {
    it('should redirect to OAuth provider URL', async () => {
      const originalLocation = window.location
      delete (window as any).location
      window.location = { ...originalLocation, href: '' } as any

      await service.initiateLogin('google')

      expect(window.location.href).toContain('https://accounts.google.com/o/oauth2/v2/auth')
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith('oauth2_provider', 'google')
    })

    it('should throw error for unconfigured provider', async () => {
      delete process.env.REACT_APP_GOOGLE_CLIENT_ID

      await expect(service.initiateLogin('google')).rejects.toThrow(AuthServiceError)
      await expect(service.initiateLogin('google')).rejects.toThrow('OAuth2 client ID not configured for google')
    })
  })



  describe('Error Handling', () => {
    it('should handle network errors during callback', async () => {
      mockSessionStorage.store['oauth2_state'] = 'test-state'
      mockSessionStorage.store['oauth2_state_expiry'] = (Date.now() + 600000).toString()

      mockFetch.mockRejectedValue(new Error('Network error'))

      await expect(service.handleCallback('test-code', 'google', 'test-state')).rejects.toThrow(AuthServiceError)

      try {
        await service.handleCallback('test-code', 'google', 'test-state')
      } catch (error) {
        expect(error).toBeInstanceOf(AuthServiceError)
        expect((error as AuthServiceError).type).toBe(AuthErrorType.NETWORK_ERROR)
      }
    })

    it('should handle malformed API response', async () => {
      mockSessionStorage.store['oauth2_state'] = 'test-state'
      mockSessionStorage.store['oauth2_state_expiry'] = (Date.now() + 600000).toString()

      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockRejectedValue(new Error('Invalid JSON'))
      })

      await expect(service.handleCallback('test-code', 'google', 'test-state')).rejects.toThrow(AuthServiceError)
    })

    it('should handle sessionStorage access errors', () => {
      mockSessionStorage.getItem.mockImplementation(() => {
        throw new Error('Storage error')
      })

      expect(() => service.getAuthUrl('google')).toThrow()
    })
  })

  describe('URL Generation Edge Cases', () => {
    it('should handle special characters in redirect URI', () => {
      const originalLocation = window.location
      Object.defineProperty(window, 'location', {
        value: { ...originalLocation, origin: 'http://localhost:3000/special-path' },
        writable: true
      })

      const url = service.getAuthUrl('google')
      expect(url).toContain(encodeURIComponent('http://localhost:3000/special-path/auth/callback/google'))
    })

    it('should generate unique state parameters', () => {
      const url1 = service.getAuthUrl('google')
      const url2 = service.getAuthUrl('google')

      const state1 = new URL(url1).searchParams.get('state')
      const state2 = new URL(url2).searchParams.get('state')

      expect(state1).not.toBe(state2)
      expect(state1).toBeTruthy()
      expect(state2).toBeTruthy()
    })
  })

  describe('Provider-Specific Configurations', () => {
    it('should handle Google-specific parameters', () => {
      const url = service.getAuthUrl('google')
      
      expect(url).toContain('access_type=offline')
      expect(url).toContain('prompt=consent')
    })

    it('should handle VK-specific parameters', () => {
      const url = service.getAuthUrl('vk')
      
      expect(url).toContain('v=5.131')
      expect(url).toContain('display=popup')
    })

    it('should handle Yandex-specific scopes', () => {
      const url = service.getAuthUrl('yandex')
      
      expect(url).toMatch(/scope=.*login%3Aemail.*login%3Ainfo/)
    })
  })
})