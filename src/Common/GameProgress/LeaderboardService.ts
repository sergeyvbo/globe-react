import {
  LeaderboardResponse,
  LeaderboardFilter,
  LeaderboardPeriod,
  AuthErrorType
} from '../types'
import { API_CONFIG } from '../config/api'

// Custom error class for Leaderboard API
export class LeaderboardApiError extends Error {
  public type: AuthErrorType
  public details?: any
  
  constructor({ type, message, details }: { type: AuthErrorType; message: string; details?: any }) {
    super(message)
    this.name = 'LeaderboardApiError'
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
        throw new LeaderboardApiError({
          type: this.getErrorTypeFromStatus(response.status),
          message: errorData.message || `HTTP ${response.status}: ${response.statusText}`,
          details: { status: response.status, ...errorData }
        })
      }
      
      return await response.json()
    } catch (error) {
      if (error instanceof LeaderboardApiError) {
        throw error
      }
      
      // Network or other errors
      throw new LeaderboardApiError({
        type: AuthErrorType.NETWORK_ERROR,
        message: 'Network error occurred. Please check your connection.',
        details: error
      })
    }
  }
  
  private static getErrorTypeFromStatus(status: number): AuthErrorType {
    switch (status) {
      case 401:
        return AuthErrorType.TOKEN_EXPIRED
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
}

// Token management utility (reused from AuthService pattern)
class TokenManager {
  private static readonly ACCESS_TOKEN_KEY = 'auth_access_token'
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

// Cache interface for leaderboard data
interface CacheEntry {
  data: LeaderboardResponse
  timestamp: number
}

// Main LeaderboardService class
export class LeaderboardService {
  private static instance: LeaderboardService
  private cache = new Map<string, CacheEntry>()
  private readonly CACHE_TTL = 5 * 60 * 1000 // 5 minutes
  
  private constructor() {}
  
  static getInstance(): LeaderboardService {
    if (!LeaderboardService.instance) {
      LeaderboardService.instance = new LeaderboardService()
    }
    return LeaderboardService.instance
  }
  
  // Get global leaderboard
  async getGlobalLeaderboard(page: number = 1, pageSize: number = 50): Promise<LeaderboardResponse> {
    const cacheKey = `global_${page}_${pageSize}`
    const cached = this.getCachedData(cacheKey)
    if (cached) {
      console.log('Returning cached global leaderboard')
      return cached
    }
    
    try {
      const token = this.getOptionalAccessToken()
      const response = await HttpClient.get<LeaderboardResponse>(
        `/leaderboard?page=${page}&pageSize=${pageSize}`, 
        token
      )
      
      this.setCachedData(cacheKey, response)
      console.log('Global leaderboard retrieved successfully:', response)
      return response
    } catch (error) {
      console.error('Failed to fetch global leaderboard:', error)
      if (error instanceof LeaderboardApiError) {
        throw error
      }
      
      throw new LeaderboardApiError({
        type: AuthErrorType.NETWORK_ERROR,
        message: 'Failed to fetch global leaderboard',
        details: error
      })
    }
  }
  
  // Get leaderboard filtered by game type
  async getLeaderboardByGameType(
    gameType: string, 
    page: number = 1, 
    pageSize: number = 50
  ): Promise<LeaderboardResponse> {
    const cacheKey = `gameType_${gameType}_${page}_${pageSize}`
    const cached = this.getCachedData(cacheKey)
    if (cached) {
      console.log('Returning cached game type leaderboard')
      return cached
    }
    
    try {
      const token = this.getOptionalAccessToken()
      const response = await HttpClient.get<LeaderboardResponse>(
        `/leaderboard?gameType=${encodeURIComponent(gameType)}&page=${page}&pageSize=${pageSize}`, 
        token
      )
      
      this.setCachedData(cacheKey, response)
      console.log('Game type leaderboard retrieved successfully:', response)
      return response
    } catch (error) {
      console.error('Failed to fetch game type leaderboard:', error)
      if (error instanceof LeaderboardApiError) {
        throw error
      }
      
      throw new LeaderboardApiError({
        type: AuthErrorType.NETWORK_ERROR,
        message: 'Failed to fetch game type leaderboard',
        details: error
      })
    }
  }
  
  // Get leaderboard filtered by time period
  async getLeaderboardByPeriod(
    period: LeaderboardPeriod, 
    page: number = 1, 
    pageSize: number = 50
  ): Promise<LeaderboardResponse> {
    const cacheKey = `period_${period}_${page}_${pageSize}`
    const cached = this.getCachedData(cacheKey)
    if (cached) {
      console.log('Returning cached period leaderboard')
      return cached
    }
    
    try {
      const token = this.getOptionalAccessToken()
      const response = await HttpClient.get<LeaderboardResponse>(
        `/leaderboard?period=${period}&page=${page}&pageSize=${pageSize}`, 
        token
      )
      
      this.setCachedData(cacheKey, response)
      console.log('Period leaderboard retrieved successfully:', response)
      return response
    } catch (error) {
      console.error('Failed to fetch period leaderboard:', error)
      if (error instanceof LeaderboardApiError) {
        throw error
      }
      
      throw new LeaderboardApiError({
        type: AuthErrorType.NETWORK_ERROR,
        message: 'Failed to fetch period leaderboard',
        details: error
      })
    }
  }
  
  // Get leaderboard with multiple filters
  async getFilteredLeaderboard(filter: LeaderboardFilter): Promise<LeaderboardResponse> {
    const { gameType, period, page = 1, pageSize = 50 } = filter
    
    // Build cache key from all filter parameters
    const cacheKey = `filtered_${gameType || 'all'}_${period || 'all'}_${page}_${pageSize}`
    const cached = this.getCachedData(cacheKey)
    if (cached) {
      console.log('Returning cached filtered leaderboard')
      return cached
    }
    
    // Build query parameters
    const params = new URLSearchParams()
    params.append('page', page.toString())
    params.append('pageSize', pageSize.toString())
    
    if (gameType) {
      params.append('gameType', gameType)
    }
    
    if (period) {
      params.append('period', period)
    }
    
    try {
      const token = this.getOptionalAccessToken()
      const response = await HttpClient.get<LeaderboardResponse>(
        `/leaderboard?${params.toString()}`, 
        token
      )
      
      this.setCachedData(cacheKey, response)
      console.log('Filtered leaderboard retrieved successfully:', response)
      return response
    } catch (error) {
      console.error('Failed to fetch filtered leaderboard:', error)
      if (error instanceof LeaderboardApiError) {
        throw error
      }
      
      throw new LeaderboardApiError({
        type: AuthErrorType.NETWORK_ERROR,
        message: 'Failed to fetch filtered leaderboard',
        details: error
      })
    }
  }
  
  // Clear cache (useful for forcing refresh)
  clearCache(): void {
    this.cache.clear()
    console.log('Leaderboard cache cleared')
  }
  
  // Clear specific cache entry
  clearCacheEntry(key: string): void {
    this.cache.delete(key)
    console.log('Cache entry cleared:', key)
  }
  
  // Get cached data if still valid
  private getCachedData(key: string): LeaderboardResponse | null {
    const entry = this.cache.get(key)
    if (!entry) return null
    
    const now = Date.now()
    if (now - entry.timestamp > this.CACHE_TTL) {
      this.cache.delete(key)
      return null
    }
    
    return entry.data
  }
  
  // Set data in cache
  private setCachedData(key: string, data: LeaderboardResponse): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    })
  }
  
  // Get access token if available (leaderboards can be viewed without authentication)
  private getOptionalAccessToken(): string | undefined {
    const accessToken = TokenManager.getAccessToken()
    
    if (!accessToken || TokenManager.isTokenExpired()) {
      return undefined
    }
    
    return accessToken
  }
  
  // Check if user is authenticated (affects whether current user rank is shown)
  isAuthenticated(): boolean {
    const accessToken = TokenManager.getAccessToken()
    return accessToken !== null && !TokenManager.isTokenExpired()
  }
  
  // Get cache statistics (for debugging)
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    }
  }
}

// Export singleton instance
export const leaderboardService = LeaderboardService.getInstance()
export default leaderboardService