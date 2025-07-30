import React, { createContext, useCallback, useEffect, useState } from 'react';
import { ModalState, ModalContextType, ModalName } from './types';

const initialModalState: ModalState = {
  userProfile: false,
  statistics: false,
  leaderboard: false,
};

export const ModalContext = createContext<ModalContextType | undefined>(undefined);

interface ModalProviderProps {
  children: React.ReactNode;
}

export const ModalProvider: React.FC<ModalProviderProps> = ({ children }) => {
  const [modals, setModals] = useState<ModalState>(initialModalState);

  const openModal = useCallback((modalName: keyof ModalState) => {
    setModals(prev => ({
      ...initialModalState, // Close all other modals
      [modalName]: true,
    }));
  }, []);

  const closeModal = useCallback((modalName: keyof ModalState) => {
    setModals(prev => ({
      ...prev,
      [modalName]: false,
    }));
  }, []);

  const closeAllModals = useCallback(() => {
    setModals(initialModalState);
  }, []);

  const isAnyModalOpen = Object.values(modals).some(isOpen => isOpen);

  // Global escape key handler
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isAnyModalOpen) {
        // Find which modal is open and close it
        const openModalName = Object.entries(modals).find(([_, isOpen]) => isOpen)?.[0] as ModalName;
        if (openModalName) {
          closeModal(openModalName);
        }
      }
    };

    if (isAnyModalOpen) {
      document.addEventListener('keydown', handleEscapeKey);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
      document.body.style.overflow = 'unset';
    };
  }, [isAnyModalOpen, modals, closeModal]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const contextValue: ModalContextType = {
    modals,
    openModal,
    closeModal,
    closeAllModals,
    isAnyModalOpen,
  };

  return (
    <ModalContext.Provider value={contextValue}>
      {children}
    </ModalContext.Provider>
  );
};