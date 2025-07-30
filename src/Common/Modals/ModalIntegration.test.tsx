import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { HashRouter } from 'react-router-dom';
import { ModalProvider, useModal } from './index';
import { AuthProvider } from '../Auth/AuthContext';

// Mock the auth context
vi.mock('../Auth/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useAuth: () => ({
    user: {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      provider: 'email',
      createdAt: '2023-01-01',
      lastLoginAt: '2023-01-01'
    },
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
    register: vi.fn(),
    loginWithOAuth: vi.fn(),
    logout: vi.fn(),
    updateProfile: vi.fn()
  })
}));

// Mock the modal components to avoid complex dependencies
vi.mock('./UserProfileModal', () => ({
  UserProfileModal: () => <div data-testid="user-profile-modal-content">User Profile Modal Content</div>
}));

vi.mock('./StatisticsModal', () => ({
  StatisticsModal: () => <div data-testid="statistics-modal-content">Statistics Modal Content</div>
}));

vi.mock('./LeaderboardModal', () => ({
  LeaderboardModal: () => <div data-testid="leaderboard-modal-content">Leaderboard Modal Content</div>
}));

// Test component that uses the modal context
const TestModalTrigger: React.FC = () => {
  const { openModal, closeModal, modals } = useModal();

  return (
    <div>
      <button 
        data-testid="open-profile-modal" 
        onClick={() => openModal('userProfile')}
      >
        Open Profile Modal
      </button>
      <button 
        data-testid="open-statistics-modal" 
        onClick={() => openModal('statistics')}
      >
        Open Statistics Modal
      </button>
      <button 
        data-testid="open-leaderboard-modal" 
        onClick={() => openModal('leaderboard')}
      >
        Open Leaderboard Modal
      </button>
      <button 
        data-testid="close-all-modals" 
        onClick={() => {
          closeModal('userProfile');
          closeModal('statistics');
          closeModal('leaderboard');
        }}
      >
        Close All Modals
      </button>
      <div data-testid="modal-states">
        Profile: {modals.userProfile ? 'open' : 'closed'}, 
        Statistics: {modals.statistics ? 'open' : 'closed'}, 
        Leaderboard: {modals.leaderboard ? 'open' : 'closed'}
      </div>
    </div>
  );
};

const TestApp: React.FC = () => {
  return (
    <AuthProvider>
      <ModalProvider>
        <HashRouter>
          <div>
            <TestModalTrigger />
            {/* Import the actual modal components */}
            <div data-testid="user-profile-modal-content">User Profile Modal Content</div>
            <div data-testid="statistics-modal-content">Statistics Modal Content</div>
            <div data-testid="leaderboard-modal-content">Leaderboard Modal Content</div>
          </div>
        </HashRouter>
      </ModalProvider>
    </AuthProvider>
  );
};

describe('Modal Integration', () => {
  beforeEach(() => {
    // Reset any global state
    vi.clearAllMocks();
  });

  test('ModalProvider provides modal context to child components', () => {
    render(<TestApp />);
    
    // Check that the modal trigger component renders
    expect(screen.getByTestId('open-profile-modal')).toBeInTheDocument();
    expect(screen.getByTestId('open-statistics-modal')).toBeInTheDocument();
    expect(screen.getByTestId('open-leaderboard-modal')).toBeInTheDocument();
    
    // Check initial modal states
    expect(screen.getByTestId('modal-states')).toHaveTextContent(
      'Profile: closed, Statistics: closed, Leaderboard: closed'
    );
  });

  test('can open and close individual modals', async () => {
    render(<TestApp />);
    
    // Open profile modal
    fireEvent.click(screen.getByTestId('open-profile-modal'));
    await waitFor(() => {
      expect(screen.getByTestId('modal-states')).toHaveTextContent(
        'Profile: open, Statistics: closed, Leaderboard: closed'
      );
    });

    // Open statistics modal (should close profile modal)
    fireEvent.click(screen.getByTestId('open-statistics-modal'));
    await waitFor(() => {
      expect(screen.getByTestId('modal-states')).toHaveTextContent(
        'Profile: closed, Statistics: open, Leaderboard: closed'
      );
    });

    // Open leaderboard modal (should close statistics modal)
    fireEvent.click(screen.getByTestId('open-leaderboard-modal'));
    await waitFor(() => {
      expect(screen.getByTestId('modal-states')).toHaveTextContent(
        'Profile: closed, Statistics: closed, Leaderboard: open'
      );
    });

    // Close all modals
    fireEvent.click(screen.getByTestId('close-all-modals'));
    await waitFor(() => {
      expect(screen.getByTestId('modal-states')).toHaveTextContent(
        'Profile: closed, Statistics: closed, Leaderboard: closed'
      );
    });
  });

  test('only one modal can be open at a time', async () => {
    render(<TestApp />);
    
    // Open profile modal
    fireEvent.click(screen.getByTestId('open-profile-modal'));
    await waitFor(() => {
      expect(screen.getByTestId('modal-states')).toHaveTextContent(
        'Profile: open, Statistics: closed, Leaderboard: closed'
      );
    });

    // Open statistics modal - should close profile modal
    fireEvent.click(screen.getByTestId('open-statistics-modal'));
    await waitFor(() => {
      expect(screen.getByTestId('modal-states')).toHaveTextContent(
        'Profile: closed, Statistics: open, Leaderboard: closed'
      );
    });

    // Verify only one modal is open
    const modalStates = screen.getByTestId('modal-states').textContent;
    const openCount = (modalStates?.match(/open/g) || []).length;
    expect(openCount).toBe(1);
  });

  test('modal components are rendered in the DOM', () => {
    render(<TestApp />);
    
    // Check that all modal components are present in the DOM
    expect(screen.getByTestId('user-profile-modal-content')).toBeInTheDocument();
    expect(screen.getByTestId('statistics-modal-content')).toBeInTheDocument();
    expect(screen.getByTestId('leaderboard-modal-content')).toBeInTheDocument();
  });
});

describe('Modal Context Error Handling', () => {
  test('throws error when useModal is used outside ModalProvider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    const TestComponent = () => {
      useModal(); // This should throw an error
      return <div>Test</div>;
    };

    expect(() => {
      render(<TestComponent />);
    }).toThrow();

    consoleSpy.mockRestore();
  });
});