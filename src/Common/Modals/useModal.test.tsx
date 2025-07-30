import React from 'react';
import { renderHook } from '@testing-library/react';
import { vi } from 'vitest';
import { ModalProvider } from './ModalProvider';
import { useModal } from './useModal';

describe('useModal', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <ModalProvider>{children}</ModalProvider>
  );

  it('returns modal context with correct initial state', () => {
    const { result } = renderHook(() => useModal(), { wrapper });

    expect(result.current.modals).toEqual({
      userProfile: false,
      statistics: false,
      leaderboard: false,
    });
    expect(result.current.isAnyModalOpen).toBe(false);
    expect(typeof result.current.openModal).toBe('function');
    expect(typeof result.current.closeModal).toBe('function');
    expect(typeof result.current.closeAllModals).toBe('function');
  });

  it('throws error when used outside ModalProvider', () => {
    // Suppress console.error for this test
    const originalError = console.error;
    console.error = vi.fn();

    expect(() => {
      renderHook(() => useModal());
    }).toThrow('useModal must be used within a ModalProvider');

    console.error = originalError;
  });

  it('provides all required context methods and properties', () => {
    const { result } = renderHook(() => useModal(), { wrapper });

    // Check that all required properties exist
    expect(result.current).toHaveProperty('modals');
    expect(result.current).toHaveProperty('openModal');
    expect(result.current).toHaveProperty('closeModal');
    expect(result.current).toHaveProperty('closeAllModals');
    expect(result.current).toHaveProperty('isAnyModalOpen');

    // Check types
    expect(typeof result.current.modals).toBe('object');
    expect(typeof result.current.openModal).toBe('function');
    expect(typeof result.current.closeModal).toBe('function');
    expect(typeof result.current.closeAllModals).toBe('function');
    expect(typeof result.current.isAnyModalOpen).toBe('boolean');
  });
});