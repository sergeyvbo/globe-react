// API Test Utility
// Simple utility to test API connectivity and responses

import { API_CONFIG } from '../config/api'

export interface ApiTestResult {
  success: boolean
  status?: number
  data?: unknown
  error?: string
  responseText?: string
}

export class ApiTester {
  private static async makeRequest(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiTestResult> {
    try {
      const url = `${API_CONFIG.BASE_URL}${endpoint}`
      console.log(`Testing API: ${url}`)
      
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...options.headers,
        },
      })

      const responseText = await response.text()
      console.log(`Response status: ${response.status}`)
      console.log(`Response text: ${responseText}`)

      let data = null
      try {
        data = responseText ? JSON.parse(responseText) : null
      } catch (e) {
        console.warn('Failed to parse response as JSON:', e)
      }

      return {
        success: response.ok,
        status: response.status,
        data,
        responseText,
      }
    } catch (error) {
      console.error('API request failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  static async testConnectivity(): Promise<ApiTestResult> {
    return this.makeRequest('/auth/test')
  }

  static async testLogin(email: string, password: string): Promise<ApiTestResult> {
    return this.makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  }

  static async testRegister(email: string, password: string, name?: string): Promise<ApiTestResult> {
    return this.makeRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    })
  }

  static async runAllTests(): Promise<void> {
    console.log('=== API Tests ===')
    
    // Test 1: Connectivity
    console.log('\n1. Testing API connectivity...')
    const connectivityResult = await this.testConnectivity()
    console.log('Connectivity result:', connectivityResult)

    // Test 2: Login with existing user
    console.log('\n2. Testing login...')
    const loginResult = await this.testLogin('testhttp@example.com', 'TestPassword123')
    console.log('Login result:', loginResult)

    console.log('\n=== Tests Complete ===')
  }
}

// Export for console testing
if (typeof window !== 'undefined') {
  (window as any).ApiTester = ApiTester
}