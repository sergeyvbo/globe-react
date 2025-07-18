import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react'
import { 
  AuthContextType, 
  User, 
  OAuthProvider, 
  AuthSession, 
  AuthError, 
  AuthErrorType 
} from './types'
import { authService } from './AuthService'

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

  // Helper function to save session to localStorage
  const saveSession = (session: AuthSession) => {
    try {
      localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify({
        ...session,
        expiresAt: session.expiresAt.toISOString()
      }))
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify({
        ...session.user,
        createdAt: session.user.createdAt.toISOString(),
        lastLoginAt: session.user.lastLoginAt?.toISOString()
      }))
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
    } catch (error) {
      console.error('Failed to clear session from localStorage:', error)
    }
  }

  // Helper function to convert AuthResponse to AuthSession
  const createSessionFromAuthResponse = (authResponse: any): AuthSession => {
    return {
      accessToken: authResponse.accessToken,
      refreshToken: authResponse.refreshToken,
      expiresAt: new Date(Date.now() + (authResponse.expiresIn * 1000)),
      user: authResponse.user
    }
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
      // Mock OAuth login - in real implementation this would redirect to OAuth provider
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const user: User = {
        id: `mock-${provider}-user-id`,
        email: `user@${provider}.com`,
        name: `${provider} User`,
        provider,
        createdAt: new Date(),
        lastLoginAt: new Date()
      }

      const session: AuthSession = {
        accessToken: `mock-${provider}-access-token`,
        refreshToken: `mock-${provider}-refresh-token`,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        user
      }

      saveSession(session)
      dispatch({ type: 'AUTH_SUCCESS', payload: session.user })
    } catch (error) {
      const authError: AuthError = {
        type: AuthErrorType.OAUTH_ERROR,
        message: `OAuth login with ${provider} failed`,
        details: error
      }
      dispatch({ type: 'AUTH_ERROR', payload: authError })
      throw authError
    }
  }

  const logout = async (): Promise<void> => {
    try {
      await authService.logout()
    } catch (error) {
      console.warn('Failed to logout from server:', error)
    } finally {
      clearSession()
      dispatch({ type: 'AUTH_LOGOUT' })
    }
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

  // Check for existing session on mount
  useEffect(() => {
    const checkExistingSession = () => {
      const session = loadSession()
      if (session) {
        dispatch({ type: 'AUTH_SUCCESS', payload: session.user })
      } else {
        dispatch({ type: 'SET_LOADING', payload: false })
      }
    }

    checkExistingSession()
  }, [])

  // Auto-logout when token expires
  useEffect(() => {
    if (!state.isAuthenticated) return

    const session = loadSession()
    if (!session) return

    const timeUntilExpiry = session.expiresAt.getTime() - Date.now()
    
    if (timeUntilExpiry <= 0) {
      logout()
      return
    }

    const timeoutId = setTimeout(() => {
      logout()
    }, timeUntilExpiry)

    return () => clearTimeout(timeoutId)
  }, [state.isAuthenticated])

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