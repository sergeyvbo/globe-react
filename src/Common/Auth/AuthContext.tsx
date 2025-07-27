import React, { createContext, useContext, useReducer, useEffect, ReactNode, useRef } from 'react'
import { 
  AuthContextType, 
  User, 
  OAuthProvider, 
  AuthSession, 
  AuthError, 
  AuthErrorType 
} from '../types'
import { authService } from './AuthService'
import { gameProgressService } from '../GameProgress'

// Auth state interface
interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: AuthError | null
}

// Auth actions
type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: User }
  | { type: 'AUTH_ERROR'; payload: AuthError }
  | { type: 'AUTH_LOGOUT' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'CLEAR_ERROR' }
  | { type: 'UPDATE_USER'; payload: Partial<User> }

// Initial state
const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true, // Start with loading true to check for existing session
  error: null
}

// Auth reducer
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'AUTH_START':
      return {
        ...state,
        isLoading: true,
        error: null
      }
    case 'AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        isLoading: false,
        error: null
      }
    case 'AUTH_ERROR':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload
      }
    case 'AUTH_LOGOUT':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
      }
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload
      }
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null
      }
    case 'UPDATE_USER':
      return {
        ...state,
        user: state.user ? { ...state.user, ...action.payload } : null
      }
    default:
      return state
  }
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Storage keys
const STORAGE_KEYS = {
  SESSION: 'auth_session',
  USER: 'auth_user'
}

// AuthProvider component
interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState)
  
  // Refs for managing timers and preventing memory leaks
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null)
  const logoutTimerRef = useRef<NodeJS.Timeout | null>(null)
  const sessionCheckIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const isRefreshingRef = useRef<boolean>(false)

  // Constants for session management
  const REFRESH_THRESHOLD_MS = 5 * 60 * 1000 // 5 minutes before expiry
  const SESSION_CHECK_INTERVAL_MS = 60 * 1000 // Check every minute
  const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000 // 30 minutes of inactivity

  // Helper function to save session to localStorage
  const saveSession = (session: AuthSession) => {
    try {
      // Helper function to safely convert to ISO string
      const toISOString = (date: Date | string | undefined): string | undefined => {
        if (!date) return undefined
        if (typeof date === 'string') return date
        if (date instanceof Date) return date.toISOString()
        return undefined
      }

      localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify({
        ...session,
        expiresAt: session.expiresAt.toISOString()
      }))
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify({
        ...session.user,
        createdAt: toISOString(session.user.createdAt),
        lastLoginAt: toISOString(session.user.lastLoginAt)
      }))
      
      // Update last activity timestamp
      localStorage.setItem('auth_last_activity', Date.now().toString())
    } catch (error) {
      console.error('Failed to save session to localStorage:', error)
    }
  }

  // Helper function to load session from localStorage
  const loadSession = (): AuthSession | null => {
    try {
      const sessionData = localStorage.getItem(STORAGE_KEYS.SESSION)
      const userData = localStorage.getItem(STORAGE_KEYS.USER)
      
      if (!sessionData || !userData) {
        return null
      }

      const session = JSON.parse(sessionData)
      const user = JSON.parse(userData)

      // Parse dates
      const parsedSession: AuthSession = {
        ...session,
        expiresAt: new Date(session.expiresAt),
        user: {
          ...user,
          createdAt: new Date(user.createdAt),
          lastLoginAt: user.lastLoginAt ? new Date(user.lastLoginAt) : undefined
        }
      }

      // Check if session is expired
      if (parsedSession.expiresAt <= new Date()) {
        clearSession()
        return null
      }

      return parsedSession
    } catch (error) {
      console.error('Failed to load session from localStorage:', error)
      clearSession()
      return null
    }
  }

  // Helper function to clear session from localStorage
  const clearSession = () => {
    try {
      localStorage.removeItem(STORAGE_KEYS.SESSION)
      localStorage.removeItem(STORAGE_KEYS.USER)
      localStorage.removeItem('auth_last_activity')
    } catch (error) {
      console.error('Failed to clear session from localStorage:', error)
    }
  }

  // Helper function to convert AuthResponse to AuthSession
  const createSessionFromAuthResponse = (authResponse: any): AuthSession => {
    // Helper function to safely convert to Date object
    const toDate = (date: Date | string | undefined): Date | undefined => {
      if (!date) return undefined
      if (date instanceof Date) return date
      if (typeof date === 'string') return new Date(date)
      return undefined
    }

    return {
      accessToken: authResponse.accessToken,
      refreshToken: authResponse.refreshToken,
      expiresAt: new Date(Date.now() + (authResponse.expiresIn * 1000)),
      user: {
        ...authResponse.user,
        createdAt: toDate(authResponse.user.createdAt) || new Date(),
        lastLoginAt: toDate(authResponse.user.lastLoginAt)
      }
    }
  }

  // Helper function to clear all timers
  const clearAllTimers = () => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current)
      refreshTimerRef.current = null
    }
    if (logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current)
      logoutTimerRef.current = null
    }
    if (sessionCheckIntervalRef.current) {
      clearInterval(sessionCheckIntervalRef.current)
      sessionCheckIntervalRef.current = null
    }
  }

  // Helper function to check if user has been inactive
  const isUserInactive = (): boolean => {
    try {
      const lastActivity = localStorage.getItem('auth_last_activity')
      if (!lastActivity) return false
      
      const lastActivityTime = parseInt(lastActivity)
      const now = Date.now()
      
      return (now - lastActivityTime) > INACTIVITY_TIMEOUT_MS
    } catch (error) {
      console.error('Failed to check user activity:', error)
      return false
    }
  }

  // Helper function to update last activity timestamp
  const updateLastActivity = () => {
    try {
      localStorage.setItem('auth_last_activity', Date.now().toString())
    } catch (error) {
      console.error('Failed to update last activity:', error)
    }
  }

  // Automatic token refresh function
  const attemptTokenRefresh = async (): Promise<boolean> => {
    if (isRefreshingRef.current) {
      return false
    }

    isRefreshingRef.current = true

    try {
      console.log('Attempting automatic token refresh...')
      const authResponse = await authService.refreshToken()
      const session = createSessionFromAuthResponse(authResponse)
      saveSession(session)
      dispatch({ type: 'AUTH_SUCCESS', payload: session.user })
      
      console.log('Token refresh successful')
      return true
    } catch (error: any) {
      console.warn('Automatic token refresh failed:', error)
      
      // If refresh fails, logout the user
      await performLogout('Session expired. Please log in again.')
      return false
    } finally {
      isRefreshingRef.current = false
    }
  }

  // Perform logout with optional reason
  const performLogout = async (reason?: string) => {
    console.log('Performing logout:', reason || 'User initiated')
    
    clearAllTimers()
    
    try {
      await authService.logout()
    } catch (error) {
      console.warn('Failed to logout from server:', error)
    } finally {
      clearSession()
      dispatch({ type: 'AUTH_LOGOUT' })
      
      if (reason) {
        dispatch({ 
          type: 'AUTH_ERROR', 
          payload: { 
            type: AuthErrorType.TOKEN_EXPIRED, 
            message: reason 
          } 
        })
      }
    }
  }

  // Setup session management timers
  const setupSessionManagement = (session: AuthSession) => {
    clearAllTimers()

    const now = Date.now()
    const expiryTime = session.expiresAt.getTime()
    const timeUntilExpiry = expiryTime - now
    const timeUntilRefresh = timeUntilExpiry - REFRESH_THRESHOLD_MS

    console.log(`Session expires in ${Math.round(timeUntilExpiry / 1000 / 60)} minutes`)

    // Schedule token refresh before expiry
    if (timeUntilRefresh > 0) {
      refreshTimerRef.current = setTimeout(async () => {
        console.log('Scheduled token refresh triggered')
        await attemptTokenRefresh()
      }, timeUntilRefresh)
      
      console.log(`Token refresh scheduled in ${Math.round(timeUntilRefresh / 1000 / 60)} minutes`)
    } else {
      // Token is close to expiry, refresh immediately
      console.log('Token is close to expiry, refreshing immediately')
      setTimeout(() => attemptTokenRefresh(), 1000)
    }

    // Schedule logout at expiry time as fallback
    if (timeUntilExpiry > 0) {
      logoutTimerRef.current = setTimeout(async () => {
        console.log('Session expired, logging out')
        await performLogout('Your session has expired. Please log in again.')
      }, timeUntilExpiry)
    }

    // Set up periodic session validation
    sessionCheckIntervalRef.current = setInterval(() => {
      const currentSession = loadSession()
      
      if (!currentSession) {
        console.log('Session not found during periodic check, logging out')
        performLogout('Session not found')
        return
      }

      // Check for inactivity
      if (isUserInactive()) {
        console.log('User inactive for too long, logging out')
        performLogout('You have been logged out due to inactivity.')
        return
      }

      // Check if token is close to expiry and needs refresh
      const timeUntilExpiry = currentSession.expiresAt.getTime() - Date.now()
      if (timeUntilExpiry <= REFRESH_THRESHOLD_MS && timeUntilExpiry > 0) {
        console.log('Token close to expiry during periodic check, refreshing')
        attemptTokenRefresh()
      }
    }, SESSION_CHECK_INTERVAL_MS)
  }

  // Auth methods
  const login = async (email: string, password: string): Promise<void> => {
    dispatch({ type: 'AUTH_START' })
    dispatch({ type: 'CLEAR_ERROR' })

    try {
      const authResponse = await authService.login(email, password)
      const session = createSessionFromAuthResponse(authResponse)
      saveSession(session)
      dispatch({ type: 'AUTH_SUCCESS', payload: session.user })
      
      // Setup automatic session management
      setupSessionManagement(session)
      
      // Auto-sync game progress after successful login
      gameProgressService.autoSyncOnAuth(session.user.id).catch((error: any) => {
        console.warn('Failed to auto-sync progress after login:', error)
      })
    } catch (error: any) {
      const authError: AuthError = {
        type: error.type || AuthErrorType.INVALID_CREDENTIALS,
        message: error.message || 'Login failed',
        details: error.details
      }
      dispatch({ type: 'AUTH_ERROR', payload: authError })
      throw authError
    }
  }

  const register = async (email: string, password: string, confirmPassword?: string): Promise<void> => {
    dispatch({ type: 'AUTH_START' })
    dispatch({ type: 'CLEAR_ERROR' })

    try {
      const authResponse = await authService.register(email, password, confirmPassword || password)
      const session = createSessionFromAuthResponse(authResponse)
      saveSession(session)
      dispatch({ type: 'AUTH_SUCCESS', payload: session.user })
      
      // Setup automatic session management
      setupSessionManagement(session)
      
      // Auto-sync game progress after successful registration
      gameProgressService.autoSyncOnAuth(session.user.id).catch((error: any) => {
        console.warn('Failed to auto-sync progress after registration:', error)
      })
    } catch (error: any) {
      const authError: AuthError = {
        type: error.type || AuthErrorType.VALIDATION_ERROR,
        message: error.message || 'Registration failed',
        details: error.details
      }
      dispatch({ type: 'AUTH_ERROR', payload: authError })
      throw authError
    }
  }

  const loginWithOAuth = async (provider: OAuthProvider): Promise<void> => {
    dispatch({ type: 'AUTH_START' })
    dispatch({ type: 'CLEAR_ERROR' })

    try {
      const authResponse = await authService.loginWithOAuth(provider)
      const session = createSessionFromAuthResponse(authResponse)
      saveSession(session)
      dispatch({ type: 'AUTH_SUCCESS', payload: session.user })
      
      // Setup automatic session management
      setupSessionManagement(session)
      
      // Auto-sync game progress after successful OAuth login
      gameProgressService.autoSyncOnAuth(session.user.id).catch((error: any) => {
        console.warn('Failed to auto-sync progress after OAuth login:', error)
      })
    } catch (error: any) {
      const authError: AuthError = {
        type: error.type || AuthErrorType.OAUTH_ERROR,
        message: error.message || `OAuth login with ${provider} failed`,
        details: error.details
      }
      dispatch({ type: 'AUTH_ERROR', payload: authError })
      throw authError
    }
  }

  const logout = async (): Promise<void> => {
    await performLogout()
  }

  const updateProfile = async (data: Partial<User>): Promise<void> => {
    if (!state.user) {
      throw new Error('No user logged in')
    }

    dispatch({ type: 'SET_LOADING', payload: true })

    try {
      const updatedUser = await authService.updateProfile(data)
      
      // Update localStorage
      const session = loadSession()
      if (session) {
        const updatedSession = { ...session, user: updatedUser }
        saveSession(updatedSession)
      }

      dispatch({ type: 'UPDATE_USER', payload: data })
    } catch (error: any) {
      const authError: AuthError = {
        type: error.type || AuthErrorType.NETWORK_ERROR,
        message: error.message || 'Failed to update profile',
        details: error.details
      }
      dispatch({ type: 'AUTH_ERROR', payload: authError })
      throw authError
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }

  // Check for existing session on mount and setup session management
  useEffect(() => {
    const initializeAuth = async () => {
      console.log('Initializing authentication state...')
      
      const session = loadSession()
      if (session) {
        console.log('Found existing session, checking validity...')
        
        // Check if user has been inactive for too long
        if (isUserInactive()) {
          console.log('User has been inactive, clearing session')
          await performLogout('You have been logged out due to inactivity.')
          return
        }
        
        // Check if session is close to expiry and try to refresh
        const timeUntilExpiry = session.expiresAt.getTime() - Date.now()
        if (timeUntilExpiry <= REFRESH_THRESHOLD_MS && timeUntilExpiry > 0) {
          console.log('Session close to expiry, attempting refresh...')
          const refreshSuccess = await attemptTokenRefresh()
          if (!refreshSuccess) {
            return // performLogout was already called in attemptTokenRefresh
          }
          // Get updated session after refresh
          const refreshedSession = loadSession()
          if (refreshedSession) {
            dispatch({ type: 'AUTH_SUCCESS', payload: refreshedSession.user })
            setupSessionManagement(refreshedSession)
          }
        } else {
          // Session is valid, set up session management
          dispatch({ type: 'AUTH_SUCCESS', payload: session.user })
          setupSessionManagement(session)
        }
      } else {
        console.log('No existing session found')
        dispatch({ type: 'SET_LOADING', payload: false })
      }
    }

    initializeAuth()
  }, [])

  // Setup user activity tracking
  useEffect(() => {
    if (!state.isAuthenticated) return

    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
    
    const handleUserActivity = () => {
      updateLastActivity()
    }

    // Add event listeners for user activity
    activityEvents.forEach(event => {
      document.addEventListener(event, handleUserActivity, true)
    })

    // Initial activity update
    updateLastActivity()

    return () => {
      // Remove event listeners
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleUserActivity, true)
      })
    }
  }, [state.isAuthenticated])

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      clearAllTimers()
    }
  }, [])

  const contextValue: AuthContextType = {
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    login,
    register,
    loginWithOAuth,
    logout,
    updateProfile
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default AuthContext