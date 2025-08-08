import { vi } from 'vitest'

const mockErrorHandler = {
  error: null,
  isRetrying: false,
  retryCount: 0,
  handleError: vi.fn(),
  retry: vi.fn(),
  clearError: vi.fn(),
  canRetry: false,
  setRetryOperation: vi.fn(),
  isOffline: false,
  getUserMessage: null,
  getDisplayConfig: null
}

export const useSaveErrorHandler = vi.fn(() => mockErrorHandler)

export default useSaveErrorHandler