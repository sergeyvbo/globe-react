import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { OfflineIndicator } from './OfflineIndicator'
import { useOfflineDetector } from './useOfflineDetector'

// Mock the useOfflineDetector hook
vi.mock('./useOfflineDetector')

const mockUseOfflineDetector = vi.mocked(useOfflineDetector)

describe('OfflineIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Online State', () => {
    beforeEach(() => {
      mockUseOfflineDetector.mockReturnValue({
        isOnline: true,
        isOffline: false,
        networkStatus: {
          isOnline: true,
          isOffline: false,
          lastOnlineAt: new Date()
        },
        testConnectivity: vi.fn()
      })
    })

    it('should not render when online by default', () => {
      render(<OfflineIndicator />)
      
      const indicator = screen.queryByText(/online|offline/i)
      expect(indicator).not.toBeInTheDocument()
    })

    it('should render when online if showWhenOnline is true', () => {
      render(<OfflineIndicator showWhenOnline={true} />)
      
      const indicator = screen.getByText('🟢 Online')
      expect(indicator).toBeInTheDocument()
    })

    it('should have online styling when online and showWhenOnline is true', () => {
      render(<OfflineIndicator showWhenOnline={true} />)
      
      const indicator = screen.getByText('🟢 Online')
      expect(indicator).toHaveClass('online')
      expect(indicator).toHaveStyle({
        backgroundColor: '#4caf50'
      })
    })
  })

  describe('Offline State', () => {
    beforeEach(() => {
      mockUseOfflineDetector.mockReturnValue({
        isOnline: false,
        isOffline: true,
        networkStatus: {
          isOnline: false,
          isOffline: true,
          lastOfflineAt: new Date()
        },
        testConnectivity: vi.fn()
      })
    })

    it('should render when offline', () => {
      render(<OfflineIndicator />)
      
      const indicator = screen.getByText('🔴 Offline Mode')
      expect(indicator).toBeInTheDocument()
    })

    it('should have offline styling when offline', () => {
      render(<OfflineIndicator />)
      
      const indicator = screen.getByText('🔴 Offline Mode')
      expect(indicator).toHaveClass('offline')
      expect(indicator).toHaveStyle({
        backgroundColor: '#f44336'
      })
    })

    it('should render with offline styling even when showWhenOnline is true', () => {
      render(<OfflineIndicator showWhenOnline={true} />)
      
      const indicator = screen.getByText('🔴 Offline Mode')
      expect(indicator).toBeInTheDocument()
      expect(indicator).toHaveClass('offline')
    })
  })

  describe('Styling and Props', () => {
    beforeEach(() => {
      mockUseOfflineDetector.mockReturnValue({
        isOnline: false,
        isOffline: true,
        networkStatus: {
          isOnline: false,
          isOffline: true,
          lastOfflineAt: new Date()
        },
        testConnectivity: vi.fn()
      })
    })

    it('should apply custom className', () => {
      render(<OfflineIndicator className="custom-class" />)
      
      const indicator = screen.getByText('🔴 Offline Mode')
      expect(indicator).toHaveClass('custom-class')
    })

    it('should have proper positioning and styling', () => {
      render(<OfflineIndicator />)
      
      const indicator = screen.getByText('🔴 Offline Mode')
      expect(indicator).toHaveStyle({
        position: 'fixed',
        top: '10px',
        right: '10px',
        padding: '8px 16px',
        transition: 'all 0.3s ease'
      })
      
      // Check that it has the correct background color for offline
      expect(indicator).toHaveStyle('background-color: #f44336')
    })

    it('should have offline-indicator class', () => {
      render(<OfflineIndicator />)
      
      const indicator = screen.getByText('🔴 Offline Mode')
      expect(indicator).toHaveClass('offline-indicator')
    })
  })

  describe('Accessibility', () => {
    it('should be accessible when offline', () => {
      mockUseOfflineDetector.mockReturnValue({
        isOnline: false,
        isOffline: true,
        networkStatus: {
          isOnline: false,
          isOffline: true,
          lastOfflineAt: new Date()
        },
        testConnectivity: vi.fn()
      })

      render(<OfflineIndicator />)
      
      const indicator = screen.getByText('🔴 Offline Mode')
      expect(indicator).toBeVisible()
    })

    it('should be accessible when online and showWhenOnline is true', () => {
      mockUseOfflineDetector.mockReturnValue({
        isOnline: true,
        isOffline: false,
        networkStatus: {
          isOnline: true,
          isOffline: false,
          lastOnlineAt: new Date()
        },
        testConnectivity: vi.fn()
      })

      render(<OfflineIndicator showWhenOnline={true} />)
      
      const indicator = screen.getByText('🟢 Online')
      expect(indicator).toBeVisible()
    })
  })
})