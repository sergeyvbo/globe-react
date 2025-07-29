import {
  GameSessionRequest,
  GameSessionDto,
  GameStatsResponse,
  GameHistoryResponse,
  AnonymousGameSession,
  MigrateProgressRequest,
  AuthErrorType,
  RFC9457Error
} from '../types'
import { API_CONFIG } from '../config/api'
import { RFC9457ErrorParser } from '../RFC9457ErrorParser'
import { ErrorTypeMapper } from '../ErrorTypeMapper'

// Custom error class for GameStats API
export class GameStatsApiError extends Error {
  public type: AuthErrorType
  public details?: any
  
  constructor({ type, message, details }: { type: AuthErrorType; message: string; details?: any }) {
    super(message)
    this.name = 'GameStatsApiError'
    this.type = type
    this.details = details
  }
}

// HTTP client utility (reused from AuthService pattern)
class HttpClient {
  private static async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_CONFIG.BASE_URL}${endpoint}`
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/problem+json, application/json', // Support RFC 9457
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
        // Parse RFC 9457 error response
        const errorData = await response.json().catch(() => ({}))
        const rfc9457Error = RFC9457ErrorParser.parseError(errorData)
        
        throw this.createServiceError(rfc9457Error, response.status)
      }
      
      return await response.json()
    } catch (error) {
      if (error instanceof GameStatsApiError) {
        throw error
      }
      
      // Network or other errors
      const networkError: RFC9457Error = {
        type: 'about:blank',
        title: 'Network Error',
        status: 0,
        detail: 'Network error occurred. Please check your connection.',
        instance: endpoint
      }
      
      throw this.createServiceError(networkError, 0)
    }
  }
  
  /**
   * Creates GameStatsApiError from RFC 9457 error using new parsers
   */
  private static createServiceError(rfc9457Error: RFC9457Error, status: number): GameStatsApiError {
    const authErrorType = ErrorTypeMapper.mapToAuthErrorType(rfc9457Error)
    const message = RFC9457ErrorParser.getDisplayMessage(rfc9457Error)
    const details = ErrorTypeMapper.createErrorDetails(rfc9457Error)
    
    return new GameStatsApiError({
      type: authErrorType,
      message,
      details
    })
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
}

// Token management utility (reused from AuthService pattern)
class TokenManager {
  private static readonly ACCESS_TOKEN_KEY = 'auth_access_token'
  private static readonly REFRESH_TOKEN_KEY = 'auth_refresh_token'
  private static readonly TOKEN_EXPIRY_KEY = 'auth_token_expiry'
  
  static getAccessToken(): string | null {
    try {
      return localStorage.getItem(this.ACCESS_TOKEN_KEY)
    } catch (error) {
      console.error('Failed to get access token:', error)
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
}

// Main GameStatsApiService class
export class GameStatsApiService {
  private static instance: GameStatsApiService
  
  private constructor() {}
  
  static getInstance(): GameStatsApiService {
    if (!GameStatsApiService.instance) {
      GameStatsApiService.instance = new GameStatsApiService()
    }
    return GameStatsApiService.instance
  }
  
  // Save game session to server
  async saveGameSession(session: GameSessionRequest): Promise<GameSessionDto> {
    const accessToken = await this.getValidAccessToken()
    
    try {
      const response = await HttpClient.post<GameSessionDto>('/game-stats', session, accessToken)
      console.log('Game session saved successfully:', response)
      return response
    } catch (error) {
      console.error('Failed to save game session:', error)
      if (error instanceof GameStatsApiError) {
        throw error
      }
      
      throw new GameStatsApiError({
        type: AuthErrorType.NETWORK_ERROR,
        message: 'Failed to save game session',
        details: error
      })
    }
  }
  
  // Get user statistics from server
  async getUserStats(): Promise<GameStatsResponse> {
    const accessToken = await this.getValidAccessToken()
    
    try {
      const response = await HttpClient.get<GameStatsResponse>('/game-stats/me', accessToken)
      console.log('User stats retrieved successfully:', response)
      return response
    } catch (error) {
      console.error('Failed to get user stats:', error)
      if (error instanceof GameStatsApiError) {
        throw error
      }
      
      throw new GameStatsApiError({
        type: AuthErrorType.NETWORK_ERROR,
        message: 'Failed to get user statistics',
        details: error
      })
    }
  }
  
  // Get user game history with pagination
  async getUserGameHistory(page: number = 1, pageSize: number = 20): Promise<GameHistoryResponse> {
    const accessToken = await this.getValidAccessToken()
    
    try {
      const response = await HttpClient.get<GameHistoryResponse>(
        `/game-stats/me/history?page=${page}&pageSize=${pageSize}`, 
        accessToken
      )
      console.log('User game history retrieved successfully:', response)
      return response
    } catch (error) {
      console.error('Failed to get user game history:', error)
      if (error instanceof GameStatsApiError) {
        throw error
      }
      
      throw new GameStatsApiError({
        type: AuthErrorType.NETWORK_ERROR,
        message: 'Failed to get game history',
        details: error
      })
    }
  }
  
  // Migrate anonymous progress to authenticated user account
  async migrateAnonymousProgress(sessions: AnonymousGameSession[]): Promise<void> {
    const accessToken = await this.getValidAccessToken()
    
    if (!sessions || sessions.length === 0) {
      console.log('No anonymous sessions to migrate')
      return
    }
    
    const request: MigrateProgressRequest = { sessions }
    
    try {
      await HttpClient.post<void>('/game-stats/migrate', request, accessToken)
      console.log('Anonymous progress migrated successfully:', sessions.length, 'sessions')
    } catch (error) {
      console.error('Failed to migrate anonymous progress:', error)
      if (error instanceof GameStatsApiError) {
        throw error
      }
      
      throw new GameStatsApiError({
        type: AuthErrorType.NETWORK_ERROR,
        message: 'Failed to migrate anonymous progress',
        details: error
      })
    }
  }
  
  // Helper method to get valid access token
  private async getValidAccessToken(): Promise<string> {
    const accessToken = TokenManager.getAccessToken()
    
    if (!accessToken) {
      throw new GameStatsApiError({
        type: AuthErrorType.TOKEN_EXPIRED,
        message: 'No access token available. Please log in.'
      })
    }
    
    if (TokenManager.isTokenExpired()) {
      throw new GameStatsApiError({
        type: AuthErrorType.TOKEN_EXPIRED,
        message: 'Session expired. Please log in again.'
      })
    }
    
    return accessToken
  }
  
  // Check if user is authenticated
  isAuthenticated(): boolean {
    const accessToken = TokenManager.getAccessToken()
    return accessToken !== null && !TokenManager.isTokenExpired()
  }
}

// Export singleton instance
export const gameStatsApiService = GameStatsApiService.getInstance()
export default gameStatsApiService