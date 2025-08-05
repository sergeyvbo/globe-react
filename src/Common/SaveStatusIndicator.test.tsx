import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SaveStatusIndicator } from './SaveStatusIndicator'

describe('SaveStatusIndicator', () => {
  describe('Rendering Logic', () => {
    it('should not render when not saving and no error', () => {
      render(<SaveStatusIndicator isSaving={false} saveError={null} />)
      
      const indicator = screen.queryByText(/saving|error/i)
      expect(indicator).not.toBeInTheDocument()
    })

    it('should render when saving', () => {
      render(<SaveStatusIndicator isSaving={true} saveError={null} />)
      
      const indicator = screen.getByText('💾 Saving...')
      expect(indicator).toBeInTheDocument()
    })

    it('should render when there is a save error', () => {
      const errorMessage = 'Failed to save progress'
      render(<SaveStatusIndicator isSaving={false} saveError={errorMessage} />)
      
      const indicator = screen.getByText(errorMessage)
      expect(indicator).toBeInTheDocument()
    })

    it('should show saving message when both saving and error are present', () => {
      const errorMessage = 'Failed to save progress'
      render(<SaveStatusIndicator isSaving={true} saveError={errorMessage} />)
      
      const indicator = screen.getByText('💾 Saving...')
      expect(indicator).toBeInTheDocument()
      
      // Should not show error when saving
      const errorIndicator = screen.queryByText(errorMessage)
      expect(errorIndicator).not.toBeInTheDocument()
    })
  })

  describe('Styling', () => {
    it('should have correct styling when saving', () => {
      render(<SaveStatusIndicator isSaving={true} saveError={null} />)
      
      const indicator = screen.getByText('💾 Saving...')
      expect(indicator).toHaveStyle({
        position: 'fixed',
        top: '50px',
        right: '10px',
        padding: '8px 16px'
      })
      
      // Check background color separately due to color format differences
      expect(indicator).toHaveStyle('background-color: rgb(33, 150, 243)')
    })

    it('should have error styling when there is an error', () => {
      const errorMessage = 'Failed to save progress'
      render(<SaveStatusIndicator isSaving={false} saveError={errorMessage} />)
      
      const indicator = screen.getByText(errorMessage)
      expect(indicator).toHaveStyle({
        backgroundColor: '#ff9800'
      })
    })

    it('should have saving styling when saving (blue background)', () => {
      render(<SaveStatusIndicator isSaving={true} saveError={null} />)
      
      const indicator = screen.getByText('💾 Saving...')
      expect(indicator).toHaveStyle({
        backgroundColor: '#2196f3'
      })
    })
  })

  describe('Props', () => {
    it('should apply custom className', () => {
      render(<SaveStatusIndicator isSaving={true} saveError={null} className="custom-class" />)
      
      const indicator = screen.getByText('💾 Saving...')
      expect(indicator).toHaveClass('custom-class')
    })

    it('should have save-status-indicator class', () => {
      render(<SaveStatusIndicator isSaving={true} saveError={null} />)
      
      const indicator = screen.getByText('💾 Saving...')
      expect(indicator).toHaveClass('save-status-indicator')
    })

    it('should handle different error messages', () => {
      const offlineMessage = 'Saved offline - will sync when online'
      render(<SaveStatusIndicator isSaving={false} saveError={offlineMessage} />)
      
      const indicator = screen.getByText(offlineMessage)
      expect(indicator).toBeInTheDocument()
      expect(indicator).toHaveStyle({
        backgroundColor: '#ff9800'
      })
    })
  })

  describe('Accessibility', () => {
    it('should be visible when saving', () => {
      render(<SaveStatusIndicator isSaving={true} saveError={null} />)
      
      const indicator = screen.getByText('💾 Saving...')
      expect(indicator).toBeVisible()
    })

    it('should be visible when there is an error', () => {
      const errorMessage = 'Failed to save progress'
      render(<SaveStatusIndicator isSaving={false} saveError={errorMessage} />)
      
      const indicator = screen.getByText(errorMessage)
      expect(indicator).toBeVisible()
    })

    it('should have proper z-index for visibility', () => {
      render(<SaveStatusIndicator isSaving={true} saveError={null} />)
      
      const indicator = screen.getByText('💾 Saving...')
      expect(indicator).toHaveStyle({
        zIndex: '999'
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty string error', () => {
      render(<SaveStatusIndicator isSaving={false} saveError="" />)
      
      const indicator = screen.queryByText(/saving|error/i)
      expect(indicator).not.toBeInTheDocument()
    })

    it('should handle whitespace-only error', () => {
      render(<SaveStatusIndicator isSaving={false} saveError="   " />)
      
      // Check that the component renders when there's whitespace error
      const indicator = document.querySelector('.save-status-indicator')
      expect(indicator).toBeInTheDocument()
    })

    it('should prioritize saving state over error when both are present', () => {
      render(<SaveStatusIndicator isSaving={true} saveError="Some error" />)
      
      const savingIndicator = screen.getByText('💾 Saving...')
      expect(savingIndicator).toBeInTheDocument()
      
      const errorIndicator = screen.queryByText('Some error')
      expect(errorIndicator).not.toBeInTheDocument()
    })
  })
})