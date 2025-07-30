import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { vi } from 'vitest';
import { ModalProvider } from './ModalProvider';
import { useModal } from './useModal';

// Test component that uses the modal context
const TestComponent: React.FC = () => {
  const { modals, openModal, closeModal, closeAllModals, isAnyModalOpen } = useModal();

  return (
    <div>
      <div data-testid="modal-states">
        {JSON.stringify(modals)}
      </div>
      <div data-testid="any-modal-open">
        {isAnyModalOpen.toString()}
      </div>
      <button onClick={() => openModal('userProfile')}>
        Open User Profile
      </button>
      <button onClick={() => openModal('statistics')}>
        Open Statistics
      </button>
      <button onClick={() => openModal('leaderboard')}>
        Open Leaderboard
      </button>
      <button onClick={() => closeModal('userProfile')}>
        Close User Profile
      </button>
      <button onClick={() => closeAllModals()}>
        Close All
      </button>
    </div>
  );
};

describe('ModalProvider', () => {
  beforeEach(() => {
    // Reset body overflow before each test
    document.body.style.overflow = 'unset';
  });

  afterEach(() => {
    // Clean up after each test
    document.body.style.overflow = 'unset';
  });

  it('provides initial modal state with all modals closed', () => {
    render(
      <ModalProvider>
        <TestComponent />
      </ModalProvider>
    );

    const modalStates = screen.getByTestId('modal-states');
    expect(modalStates).toHaveTextContent('{"userProfile":false,"statistics":false,"leaderboard":false}');
    
    const anyModalOpen = screen.getByTestId('any-modal-open');
    expect(anyModalOpen).toHaveTextContent('false');
  });

  it('opens a specific modal when openModal is called', () => {
    render(
      <ModalProvider>
        <TestComponent />
      </ModalProvider>
    );

    const openButton = screen.getByText('Open User Profile');
    fireEvent.click(openButton);

    const modalStates = screen.getByTestId('modal-states');
    expect(modalStates).toHaveTextContent('{"userProfile":true,"statistics":false,"leaderboard":false}');
    
    const anyModalOpen = screen.getByTestId('any-modal-open');
    expect(anyModalOpen).toHaveTextContent('true');
  });

  it('closes other modals when opening a new one', () => {
    render(
      <ModalProvider>
        <TestComponent />
      </ModalProvider>
    );

    // Open user profile modal
    const openUserProfileButton = screen.getByText('Open User Profile');
    fireEvent.click(openUserProfileButton);

    let modalStates = screen.getByTestId('modal-states');
    expect(modalStates).toHaveTextContent('{"userProfile":true,"statistics":false,"leaderboard":false}');

    // Open statistics modal - should close user profile
    const openStatisticsButton = screen.getByText('Open Statistics');
    fireEvent.click(openStatisticsButton);

    modalStates = screen.getByTestId('modal-states');
    expect(modalStates).toHaveTextContent('{"userProfile":false,"statistics":true,"leaderboard":false}');
  });

  it('closes a specific modal when closeModal is called', () => {
    render(
      <ModalProvider>
        <TestComponent />
      </ModalProvider>
    );

    // Open user profile modal
    const openButton = screen.getByText('Open User Profile');
    fireEvent.click(openButton);

    // Close user profile modal
    const closeButton = screen.getByText('Close User Profile');
    fireEvent.click(closeButton);

    const modalStates = screen.getByTestId('modal-states');
    expect(modalStates).toHaveTextContent('{"userProfile":false,"statistics":false,"leaderboard":false}');
    
    const anyModalOpen = screen.getByTestId('any-modal-open');
    expect(anyModalOpen).toHaveTextContent('false');
  });

  it('closes all modals when closeAllModals is called', () => {
    render(
      <ModalProvider>
        <TestComponent />
      </ModalProvider>
    );

    // Open multiple modals (though only one will be open at a time due to the logic)
    const openUserProfileButton = screen.getByText('Open User Profile');
    fireEvent.click(openUserProfileButton);

    // Close all modals
    const closeAllButton = screen.getByText('Close All');
    fireEvent.click(closeAllButton);

    const modalStates = screen.getByTestId('modal-states');
    expect(modalStates).toHaveTextContent('{"userProfile":false,"statistics":false,"leaderboard":false}');
    
    const anyModalOpen = screen.getByTestId('any-modal-open');
    expect(anyModalOpen).toHaveTextContent('false');
  });

  it('handles global escape key to close open modal', () => {
    render(
      <ModalProvider>
        <TestComponent />
      </ModalProvider>
    );

    // Open a modal
    const openButton = screen.getByText('Open User Profile');
    fireEvent.click(openButton);

    let modalStates = screen.getByTestId('modal-states');
    expect(modalStates).toHaveTextContent('{"userProfile":true,"statistics":false,"leaderboard":false}');

    // Press escape key
    act(() => {
      fireEvent.keyDown(document, { key: 'Escape' });
    });

    modalStates = screen.getByTestId('modal-states');
    expect(modalStates).toHaveTextContent('{"userProfile":false,"statistics":false,"leaderboard":false}');
  });

  it('prevents body scroll when modal is open', () => {
    render(
      <ModalProvider>
        <TestComponent />
      </ModalProvider>
    );

    // Initially body should have normal overflow
    expect(document.body.style.overflow).toBe('unset');

    // Open a modal
    const openButton = screen.getByText('Open User Profile');
    fireEvent.click(openButton);

    // Body should have hidden overflow
    expect(document.body.style.overflow).toBe('hidden');

    // Close the modal
    const closeButton = screen.getByText('Close User Profile');
    fireEvent.click(closeButton);

    // Body should have normal overflow again
    expect(document.body.style.overflow).toBe('unset');
  });

  it('throws error when useModal is used outside ModalProvider', () => {
    // Suppress console.error for this test
    const originalError = console.error;
    console.error = vi.fn();

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useModal must be used within a ModalProvider');

    console.error = originalError;
  });
});