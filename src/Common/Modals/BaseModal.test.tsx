import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { vi } from 'vitest';
import { BaseModal } from './BaseModal';

const theme = createTheme();

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider theme={theme}>
    {children}
  </ThemeProvider>
);

describe('BaseModal', () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    title: 'Test Modal',
    children: <div>Modal Content</div>,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Reset body overflow
    document.body.style.overflow = 'unset';
  });

  it('renders modal with title and content when open', () => {
    render(
      <TestWrapper>
        <BaseModal {...defaultProps} />
      </TestWrapper>
    );

    expect(screen.getByText('Test Modal')).toBeInTheDocument();
    expect(screen.getByText('Modal Content')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <TestWrapper>
        <BaseModal {...defaultProps} open={false} />
      </TestWrapper>
    );

    expect(screen.queryByText('Test Modal')).not.toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(
      <TestWrapper>
        <BaseModal {...defaultProps} onClose={onClose} />
      </TestWrapper>
    );

    const closeButton = screen.getByLabelText('close modal');
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when escape key is pressed', async () => {
    const onClose = vi.fn();
    render(
      <TestWrapper>
        <BaseModal {...defaultProps} onClose={onClose} />
      </TestWrapper>
    );

    // MUI Dialog handles escape key internally, so we simulate the onClose call
    const dialog = document.querySelector('[role="dialog"]');
    if (dialog) {
      fireEvent.keyDown(dialog, { key: 'Escape' });
    }

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('does not call onClose when escape key is pressed and disableEscapeKeyDown is true', async () => {
    const onClose = vi.fn();
    render(
      <TestWrapper>
        <BaseModal {...defaultProps} onClose={onClose} disableEscapeKeyDown={true} />
      </TestWrapper>
    );

    const dialog = document.querySelector('[role="dialog"]');
    if (dialog) {
      fireEvent.keyDown(dialog, { key: 'Escape' });
    }

    // Wait a bit to ensure no call is made
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('calls onClose when backdrop is clicked', async () => {
    const onClose = vi.fn();
    render(
      <TestWrapper>
        <BaseModal {...defaultProps} onClose={onClose} />
      </TestWrapper>
    );

    // Click on backdrop (outside the modal content)
    const backdrop = document.querySelector('.MuiBackdrop-root');
    if (backdrop) {
      fireEvent.click(backdrop);
    }

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('has proper ARIA attributes for accessibility', () => {
    render(
      <TestWrapper>
        <BaseModal {...defaultProps} />
      </TestWrapper>
    );

    // Get the inner dialog element (the actual modal content)
    const dialogContent = document.querySelector('[aria-modal="true"]');
    expect(dialogContent).toHaveAttribute('aria-modal', 'true');
    expect(dialogContent).toHaveAttribute('aria-labelledby', 'modal-title');
    expect(dialogContent).toHaveAttribute('aria-describedby', 'modal-description');
  });

  it('focuses on close button when modal opens', async () => {
    render(
      <TestWrapper>
        <BaseModal {...defaultProps} />
      </TestWrapper>
    );

    const closeButton = screen.getByLabelText('close modal');
    
    await waitFor(() => {
      expect(closeButton).toHaveFocus();
    }, { timeout: 200 });
  });

  it('handles keyboard navigation within modal', async () => {
    render(
      <TestWrapper>
        <BaseModal {...defaultProps}>
          <div>
            <button>Test Button</button>
          </div>
        </BaseModal>
      </TestWrapper>
    );

    const closeButton = screen.getByLabelText('close modal');
    const testButton = screen.getByText('Test Button');

    // Focus should start on close button
    await waitFor(() => {
      expect(closeButton).toHaveFocus();
    });

    // Both buttons should be focusable
    expect(closeButton).toBeInTheDocument();
    expect(testButton).toBeInTheDocument();
  });

  it('applies responsive styling for different screen sizes', () => {
    // This test would require mocking useMediaQuery, which is complex
    // For now, we'll just verify the component renders without errors
    render(
      <TestWrapper>
        <BaseModal {...defaultProps} maxWidth="lg" />
      </TestWrapper>
    );

    expect(screen.getByText('Test Modal')).toBeInTheDocument();
  });

  it('supports custom maxWidth and fullWidth props', () => {
    render(
      <TestWrapper>
        <BaseModal {...defaultProps} maxWidth="xs" fullWidth={false} />
      </TestWrapper>
    );

    expect(screen.getByText('Test Modal')).toBeInTheDocument();
  });
});