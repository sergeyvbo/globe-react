export type ModalName = 'userProfile' | 'statistics' | 'leaderboard';

export interface ModalState {
  userProfile: boolean;
  statistics: boolean;
  leaderboard: boolean;
}

export interface ModalContextType {
  modals: ModalState;
  openModal: (modalName: keyof ModalState) => void;
  closeModal: (modalName: keyof ModalState) => void;
  closeAllModals: () => void;
  isAnyModalOpen: boolean;
}

export interface BaseModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  fullWidth?: boolean;
  children: React.ReactNode;
  disableEscapeKeyDown?: boolean;
  disableBackdropClick?: boolean;
}