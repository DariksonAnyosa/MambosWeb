import { useState, useCallback } from 'react';

export function useModal(initialState: boolean = false) {
  const [isOpen, setIsOpen] = useState(initialState);

  const open = useCallback(() => {
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggle = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  return {
    isOpen,
    open,
    close,
    toggle
  };
}

// Hook para múltiples modales
export function useMultiModal() {
  const [modals, setModals] = useState<Record<string, boolean>>({});

  const openModal = useCallback((name: string) => {
    setModals(prev => ({ ...prev, [name]: true }));
  }, []);

  const closeModal = useCallback((name: string) => {
    setModals(prev => ({ ...prev, [name]: false }));
  }, []);

  const toggleModal = useCallback((name: string) => {
    setModals(prev => ({ ...prev, [name]: !prev[name] }));
  }, []);

  const isModalOpen = useCallback((name: string) => {
    return !!modals[name];
  }, [modals]);

  const closeAllModals = useCallback(() => {
    setModals({});
  }, []);

  return {
    openModal,
    closeModal,
    toggleModal,
    isModalOpen,
    closeAllModals
  };
}
