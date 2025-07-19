import { 
  AuthResponse, 
  User, 
  AuthErrorType,
  AuthSession,
  OAuthProvider 
} from './types'
import { oauth2Service } from './OAuth2Service'
import { getAuthString } from '../Localization/strings'

// API configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api'

// Custom AuthError class
export class AuthServiceError extends Error {
  public type: AuthErrorType
  public details?: any
  
  constructor({ type, message, details }: { type: AuthErrorType; message: string; details?: any }) {
    super(message)
    this.name = 'AuthServiceError'
    this.type = type
    this.details = details
  }
}

// Client-side validation utilities
export class ValidationUtils {
  static validateEmail(email: string): { isValid: boolean; message?: string } {
    if (!email) {
      return { isValid: false, message: getAuthString('emailRequired') }
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return { isValid: false, message: getAuthString('emailInvalid') }
    }
    
    return { isValid: true }
  }

  static validatePassword(password: string): { isValid: boolean; message?: string } {
    if (!password) {
      return { isValid: false, message: getAuthString('passwordRequired') }
    }
    
    if (password.length < 8) {
      return { isValid: false, message: getAuthString('passwordTooShort') }
    }
    
    // Check for at least one letter and one number
    const hasLetter = /[a-zA-Z]/.test(password)
    const hasNumber = /\d/.test(password)
    
    if (!hasLetter || !hasNumber) {
      return { isValid: false, message: getAuthString('passwordMustContainLetterAndNumber') }
    }
    
    return { isValid: true }
  }

  static validatePasswordConfirmation(password: string, confirmPassword: string): { isValid: boolean; message?: string } {
    if (password !== confirmPassword) {
      return { isValid: false, message: getAuthString('passwordsDoNotMatch') }
    }
    
    return { isValid: true }
  }

  static validateRegistrationData(email: string, password: string, confirmPassword: string): { isValid: boolean; errors: Record<string, string> } {
    const errors: Record<string, string> = {}
    
    const emailValidation = this.validateEmail(email)
    if (!emailValidation.isValid) {
      errors.email = emailValidation.message!
    }
    
    const passwordValidation = this.validatePassword(password)
    if (!passwordValidation.isValid) {
      errors.password = passwordValidation.message!
    }
    
    const confirmPasswordValidation = this.validatePasswordConfirmation(password, confirmPassword)
    if (!confirmPasswordValidation.isValid) {
      errors.confirmPassword = confirmPasswordValidation.message!
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    }
  }

  static validateLoginData(email: string, password: string): { isValid: boolean; errors: Record<string, string> } {
    const errors: Record<string, string> = {}
    
    const emailValidation = this.validateEmail(email)
    if (!emailValidation.isValid) {
      errors.email = emailValidation.message!
    }
    
    if (!password) {
      errors.password = getAuthString('passwordRequired')
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    }
  }
}

// HTTP client utility
class HttpClient {
  private static async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
    }
    
    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    }
    
    try {
      const response = await fetch(url, config)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new AuthServiceError({
          type: this.getErrorTypeFromStatus(response.status),
          message: errorData.message || `HTTP ${response.status}: ${response.statusText}`,
          details: { status: response.status, ...errorData }
        })
      }
      
      return await response.json()
    } catch (error) {
      if (error instanceof AuthServiceError) {
        throw error
      }
      
      // Network or other errors
      throw new AuthServiceError({
        type: AuthErrorType.NETWORK_ERROR,
        message: 'Network error occurred. Please check your connection.',
        details: error
      })
    }
  }
  
  private static getErrorTypeFromStatus(status: number): AuthErrorType {
    switch (status) {
      case 401:
        return AuthErrorType.INVALID_CREDENTIALS
      case 409:
        return AuthErrorType.USER_EXISTS
      case 422:
        return AuthErrorType.VALIDATION_ERROR
      default:
        return AuthErrorType.NETWORK_ERROR
    }
  }
  
  static get<T>(endpoint: string, token?: string): Promise<T> {
    const headers: Record<string, string> = {}
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }
    
    return this.request<T>(endpoint, {
      method: 'GET',
      headers,
    })
  }
  
  static post<T>(endpoint: string, data?: any, token?: string): Promise<T> {
    const headers: Record<string, string> = {}
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }
    
    return this.request<T>(endpoint, {
      method: 'POST',
      headers,
      body: data ? JSON.stringify(data) : undefined,
    })
  }
  
  static put<T>(endpoint: string, data?: any, token?: string): Promise<T> {
    const headers: Record<string, string> = {}
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }
    
    return this.request<T>(endpoint, {
      method: 'PUT',
      headers,
      body: data ? JSON.stringify(data) : undefined,
    })
  }
}

// Token management utility
class TokenManager {
  private static readonly ACCESS_TOKEN_KEY = 'auth_access_token'
  private static readonly REFRESH_TOKEN_KEY = 'auth_refresh_token'
  private static readonly TOKEN_EXPIRY_KEY = 'auth_token_expiry'
  
  static saveTokens(accessToken: string, refreshToken: string, expiresIn: number): void {
    try {
      const expiryTime = Date.now() + (expiresIn * 1000)
      
      localStorage.setItem(this.ACCESS_TOKEN_KEY, accessToken)
      localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken)
      localStorage.setItem(this.TOKEN_EXPIRY_KEY, expiryTime.toString())
    } catch (error) {
      console.error('Failed to save tokens:', error)
    }
  }
  
  static getAccessToken(): string | null {
    try {
      return localStorage.getItem(this.ACCESS_TOKEN_KEY)
    } catch (error) {
      console.error('Failed to get access token:', error)
      return null
    }
  }
  
  static getRefreshToken(): string | null {
    try {
      return localStorage.getItem(this.REFRESH_TOKEN_KEY)
    } catch (error) {
      console.error('Failed to get refresh token:', error)
      return null
    }
  }
  
  static isTokenExpired(): boolean {
    try {
      const expiryTime = localStorage.getItem(this.TOKEN_EXPIRY_KEY)
      if (!expiryTime) return true
      
      return Date.now() >= parseInt(expiryTime)
    } catch (error) {
      console.error('Failed to check token expiry:', error)
      return true
    }
  }
  
  static clearTokens(): void {
    try {
      localStorage.removeItem(this.ACCESS_TOKEN_KEY)
      localStorage.removeItem(this.REFRESH_TOKEN_KEY)
      localStorage.removeItem(this.TOKEN_EXPIRY_KEY)
    } catch (error) {
      console.error('Failed to clear tokens:', error)
    }
  }
  
  static getTokenExpiryTime(): Date | null {
    try {
      const expiryTime = localStorage.getItem(this.TOKEN_EXPIRY_KEY)
      return expiryTime ? new Date(parseInt(expiryTime)) : null
    } catch (error) {
      console.error('Failed to get token expiry time:', error)
      return null
    }
  }
}

// Main AuthService class
export class AuthService {
  private static instance: AuthService
  private refreshPromise: Promise<AuthResponse> | null = null
  
  private constructor() {}
  
  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService()
    }
    return AuthService.instance
  }
  
  // Registration method
  async register(email: string, password: string, confirmPassword: string): Promise<AuthResponse> {
    // Client-side validation
    const validation = ValidationUtils.validateRegistrationData(email, password, confirmPassword)
    if (!validation.isValid) {
      throw new AuthServiceError({
        type: AuthErrorType.VALIDATION_ERROR,
        message: 'Validation failed',
        details: { errors: validation.errors }
      })
    }
    
    try {
      const response = await HttpClient.post<AuthResponse>('/auth/register', {
        email,
        password
      })
      
      // Save tokens
      TokenManager.saveTokens(response.accessToken, response.refreshToken, response.expiresIn)
      
      return response
    } catch (error) {
      if (error instanceof AuthServiceError) {
        throw error
      }
      
      throw new AuthServiceError({
        type: AuthErrorType.NETWORK_ERROR,
        message: 'Registration failed',
        details: error
      })
    }
  }
  
  // Login method
  async login(email: string, password: string): Promise<AuthResponse> {
    // Client-side validation
    const validation = ValidationUtils.validateLoginData(email, password)
    if (!validation.isValid) {
      throw new AuthServiceError({
        type: AuthErrorType.VALIDATION_ERROR,
        message: 'Validation failed',
        details: { errors: validation.errors }
      })
    }
    
    try {
      const response = await HttpClient.post<AuthResponse>('/auth/login', {
        email,
        password
      })
      
      // Save tokens
      TokenManager.saveTokens(response.accessToken, response.refreshToken, response.expiresIn)
      
      return response
    } catch (error) {
      if (error instanceof AuthServiceError) {
        throw error
      }
      
      throw new AuthServiceError({
        type: AuthErrorType.NETWORK_ERROR,
        message: 'Login failed',
        details: error
      })
    }
  }
  
  // Refresh token method
  async refreshToken(): Promise<AuthResponse> {
    // Prevent multiple simultaneous refresh requests
    if (this.refreshPromise) {
      return this.refreshPromise
    }
    
    const refreshToken = TokenManager.getRefreshToken()
    if (!refreshToken) {
      throw new AuthServiceError({
        type: AuthErrorType.TOKEN_EXPIRED,
        message: 'No refresh token available'
      })
    }
    
    this.refreshPromise = this.performTokenRefresh(refreshToken)
    
    try {
      const response = await this.refreshPromise
      return response
    } finally {
      this.refreshPromise = null
    }
  }
  
  private async performTokenRefresh(refreshToken: string): Promise<AuthResponse> {
    try {
      const response = await HttpClient.post<AuthResponse>('/auth/refresh', {
        refreshToken
      })
      
      // Save new tokens
      TokenManager.saveTokens(response.accessToken, response.refreshToken, response.expiresIn)
      
      return response
    } catch (error) {
      // Clear tokens if refresh fails
      TokenManager.clearTokens()
      
      if (error instanceof AuthServiceError) {
        throw error
      }
      
      throw new AuthServiceError({
        type: AuthErrorType.TOKEN_EXPIRED,
        message: 'Token refresh failed',
        details: error
      })
    }
  }
  
  // Get current user method
  async getCurrentUser(): Promise<User> {
    const accessToken = await this.getValidAccessToken()
    
    try {
      return await HttpClient.get<User>('/auth/me', accessToken)
    } catch (error) {
      if (error instanceof AuthServiceError) {
        throw error
      }
      
      throw new AuthServiceError({
        type: AuthErrorType.NETWORK_ERROR,
        message: 'Failed to get current user',
        details: error
      })
    }
  }
  
  // Update profile method
  async updateProfile(data: Partial<User>): Promise<User> {
    const accessToken = await this.getValidAccessToken()
    
    // Client-side validation for email if provided
    if (data.email) {
      const emailValidation = ValidationUtils.validateEmail(data.email)
      if (!emailValidation.isValid) {
        throw new AuthServiceError({
          type: AuthErrorType.VALIDATION_ERROR,
          message: emailValidation.message!
        })
      }
    }
    
    try {
      return await HttpClient.put<User>('/auth/profile', data, accessToken)
    } catch (error) {
      if (error instanceof AuthServiceError) {
        throw error
      }
      
      throw new AuthServiceError({
        type: AuthErrorType.NETWORK_ERROR,
        message: 'Failed to update profile',
        details: error
      })
    }
  }
  
  // Change password method
  async changePassword(currentPassword: string, newPassword: string, confirmPassword: string): Promise<void> {
    const accessToken = await this.getValidAccessToken()
    
    // Client-side validation
    if (!currentPassword) {
      throw new AuthServiceError({
        type: AuthErrorType.VALIDATION_ERROR,
        message: 'Current password is required'
      })
    }
    
    const passwordValidation = ValidationUtils.validatePassword(newPassword)
    if (!passwordValidation.isValid) {
      throw new AuthServiceError({
        type: AuthErrorType.VALIDATION_ERROR,
        message: passwordValidation.message!
      })
    }
    
    const confirmValidation = ValidationUtils.validatePasswordConfirmation(newPassword, confirmPassword)
    if (!confirmValidation.isValid) {
      throw new AuthServiceError({
        type: AuthErrorType.VALIDATION_ERROR,
        message: confirmValidation.message!
      })
    }
    
    try {
      await HttpClient.put<void>('/auth/change-password', {
        currentPassword,
        newPassword
      }, accessToken)
    } catch (error) {
      if (error instanceof AuthServiceError) {
        throw error
      }
      
      throw new AuthServiceError({
        type: AuthErrorType.NETWORK_ERROR,
        message: 'Failed to change password',
        details: error
      })
    }
  }
  
  // OAuth2 login method
  async loginWithOAuth(provider: OAuthProvider): Promise<AuthResponse> {
    try {
      // Use OAuth2Service to handle the authentication flow
      const response = await oauth2Service.loginWithPopup(provider)
      
      // Tokens are already saved by OAuth2Service
      return response
    } catch (error) {
      if (error instanceof AuthServiceError) {
        throw error
      }
      
      throw new AuthServiceError({
        type: AuthErrorType.OAUTH_ERROR,
        message: `OAuth2 login failed for ${provider}`,
        details: error
      })
    }
  }

  // OAuth2 callback handling method
  async handleOAuthCallback(url?: string): Promise<AuthResponse> {
    try {
      return await oauth2Service.processCallback(url)
    } catch (error) {
      if (error instanceof AuthServiceError) {
        throw error
      }
      
      throw new AuthServiceError({
        type: AuthErrorType.OAUTH_ERROR,
        message: 'OAuth2 callback handling failed',
        details: error
      })
    }
  }

  // Check if current URL is OAuth2 callback
  isOAuthCallback(url?: string): boolean {
    return oauth2Service.isCallbackUrl(url)
  }

  // Get configured OAuth2 providers
  getAvailableOAuthProviders(): OAuthProvider[] {
    return oauth2Service.getConfiguredProviders()
  }

  // Logout method
  async logout(): Promise<void> {
    const accessToken = TokenManager.getAccessToken()
    
    // Clear tokens first
    TokenManager.clearTokens()
    
    // Notify server (optional, continue even if it fails)
    if (accessToken) {
      try {
        await HttpClient.post<void>('/auth/logout', {}, accessToken)
      } catch (error) {
        console.warn('Failed to notify server of logout:', error)
      }
    }
  }
  
  // Helper method to get valid access token (with automatic refresh)
  private async getValidAccessToken(): Promise<string> {
    let accessToken = TokenManager.getAccessToken()
    
    if (!accessToken) {
      throw new AuthServiceError({
        type: AuthErrorType.TOKEN_EXPIRED,
        message: 'No access token available'
      })
    }
    
    // Check if token is expired and refresh if needed
    if (TokenManager.isTokenExpired()) {
      try {
        const response = await this.refreshToken()
        accessToken = response.accessToken
      } catch (error) {
        throw new AuthServiceError({
          type: AuthErrorType.TOKEN_EXPIRED,
          message: 'Session expired. Please log in again.'
        })
      }
    }
    
    return accessToken
  }
  
  // Check if user is authenticated
  isAuthenticated(): boolean {
    const accessToken = TokenManager.getAccessToken()
    return accessToken !== null && !TokenManager.isTokenExpired()
  }
  
  // Check if token needs refresh (within threshold)
  needsTokenRefresh(thresholdMs: number = 5 * 60 * 1000): boolean {
    const expiryTime = TokenManager.getTokenExpiryTime()
    if (!expiryTime) return false
    
    const timeUntilExpiry = expiryTime.getTime() - Date.now()
    return timeUntilExpiry <= thresholdMs && timeUntilExpiry > 0
  }
  
  // Get time until token expiry in milliseconds
  getTimeUntilExpiry(): number {
    const expiryTime = TokenManager.getTokenExpiryTime()
    if (!expiryTime) return 0
    
    return Math.max(0, expiryTime.getTime() - Date.now())
  }
  
  // Get session information
  getSession(): AuthSession | null {
    const accessToken = TokenManager.getAccessToken()
    const refreshToken = TokenManager.getRefreshToken()
    const expiryTime = TokenManager.getTokenExpiryTime()
    
    if (!accessToken || !refreshToken || !expiryTime) {
      return null
    }
    
    // Note: We don't have user data in tokens, so this would need to be fetched separately
    // This is a simplified version for the session structure
    return {
      accessToken,
      refreshToken,
      expiresAt: expiryTime,
      user: {} as User // This would be populated from a separate call or stored separately
    }
  }
  
  // Clear all authentication data
  clearAuthData(): void {
    TokenManager.clearTokens()
  }
}

// Export singleton instance
export const authService = AuthService.getInstance()
export default authService