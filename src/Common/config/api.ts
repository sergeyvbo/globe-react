// API Configuration
// Centralized configuration for API endpoints and settings

export const API_CONFIG = {
  // Base URL for the API - uses environment variable or defaults to localhost:5000
  BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  
  // Timeout for API requests (in milliseconds)
  TIMEOUT: 10000,
  
  // Default headers for API requests
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
} as const

// OAuth2 Configuration
export const OAUTH_CONFIG = {
  GOOGLE_CLIENT_ID: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
  YANDEX_CLIENT_ID: import.meta.env.VITE_YANDEX_CLIENT_ID || '',
  VK_CLIENT_ID: import.meta.env.VITE_VK_CLIENT_ID || '',
  
  // Redirect URIs (can be overridden by environment variables)
  GOOGLE_REDIRECT_URI: import.meta.env.VITE_GOOGLE_REDIRECT_URI || `${window.location.origin}/auth/callback/google`,
  YANDEX_REDIRECT_URI: import.meta.env.VITE_YANDEX_REDIRECT_URI || `${window.location.origin}/auth/callback/yandex`,
  VK_REDIRECT_URI: import.meta.env.VITE_VK_REDIRECT_URI || `${window.location.origin}/auth/callback/vk`,
} as const

// Environment information
export const ENV_CONFIG = {
  ENVIRONMENT: import.meta.env.VITE_ENVIRONMENT || 'development',
  DEBUG: import.meta.env.VITE_DEBUG === 'true',
  IS_PRODUCTION: import.meta.env.PROD,
  IS_DEVELOPMENT: import.meta.env.DEV,
} as const