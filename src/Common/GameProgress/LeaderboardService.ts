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
      
      // Transform backend response to frontend format
      const transformedResponse = this.transformLeaderboardResponse(response)
      
      this.setCachedData(cacheKey, transformedResponse)
      console.log('Global leaderboard retrieved successfully:', transformedResponse)
      return transformedResponse
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
        `/leaderboard/game-type/${encodeURIComponent(gameType)}?page=${page}&pageSize=${pageSize}`, 
        token
      )
      
      // Transform backend response to frontend format
      const transformedResponse = this.transformLeaderboardResponse(response)
      
      this.setCachedData(cacheKey, transformedResponse)
      console.log('Game type leaderboard retrieved successfully:', transformedResponse)
      return transformedResponse
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
    
    // Map frontend period to backend period
    const backendPeriod = this.mapPeriodToBackend(period)
    
    try {
      const token = this.getOptionalAccessToken()
      const response = await HttpClient.get<LeaderboardResponse>(
        `/leaderboard/period/${backendPeriod}?page=${page}&pageSize=${pageSize}`, 
        token
      )
      
      // Transform backend response to frontend format
      const transformedResponse = this.transformLeaderboardResponse(response)
      
      this.setCachedData(cacheKey, transformedResponse)
      console.log('Period leaderboard retrieved successfully:', transformedResponse)
      return transformedResponse
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
      params.append('period', this.mapPeriodToBackend(period))
    }
    
    try {
      const token = this.getOptionalAccessToken()
      const response = await HttpClient.get<LeaderboardResponse>(
        `/leaderboard/filtered?${params.toString()}`, 
        token
      )
      
      // Transform backend response to frontend format
      const transformedResponse = this.transformLeaderboardResponse(response)
      
      this.setCachedData(cacheKey, transformedResponse)
      console.log('Filtered leaderboard retrieved successfully:', transformedResponse)
      return transformedResponse
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
  
  // Transform backend response to frontend format
  private transformLeaderboardResponse(backendResponse: any): LeaderboardResponse {
    const currentUserId = TokenManager.getAccessToken() ? this.getCurrentUserId() : null
    
    // Handle both old test format (players) and new backend format (entries)
    const entries = backendResponse.entries || backendResponse.players || []
    
    const transformedEntries = entries.map((entry: any) => ({
      ...entry,
      // Add compatibility properties
      userName: entry.userName || entry.displayName,
      displayName: entry.displayName || entry.userName,
      gamesPlayed: entry.gamesPlayed || entry.totalGames,
      totalGames: entry.totalGames || entry.gamesPlayed,
      isCurrentUser: currentUserId ? entry.userId === currentUserId : (entry.isCurrentUser || false)
    }))
    
    return {
      ...backendResponse,
      // Add compatibility properties
      players: transformedEntries,
      entries: transformedEntries,
      hasNextPage: backendResponse.hasNextPage !== undefined 
        ? backendResponse.hasNextPage 
        : (backendResponse.totalPages ? backendResponse.page < backendResponse.totalPages : false),
      currentUserRank: backendResponse.currentUserRank || backendResponse.currentUserEntry?.rank
    }
  }
  
  // Map frontend period to backend period
  private mapPeriodToBackend(period: LeaderboardPeriod): string {
    switch (period) {
      case 'all':
        return 'all-time'
      case 'week':
        return 'week'
      case 'month':
        return 'month'
      case 'year':
        return 'year'
      default:
        return 'all-time'
    }
  }

  // Get current user ID from token
  private getCurrentUserId(): string | null {
    try {
      const token = TokenManager.getAccessToken()
      if (!token) return null
      
      // Decode JWT token to get user ID (simple base64 decode)
      const payload = JSON.parse(atob(token.split('.')[1]))
      return payload.sub || payload.nameid || null
    } catch (error) {
      console.error('Failed to decode token:', error)
      return null
    }
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