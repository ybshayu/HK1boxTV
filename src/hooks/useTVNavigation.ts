import { useEffect, useState, useCallback, useRef } from 'react';

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface FocusZone {
  id: string;
  itemsPerRow?: number;
  totalItems: number;
  onSelect?: (index: number) => void;
  onBack?: () => void;
  onMenu?: (index: number) => void;
}

export function useTVNavigation() {
  const [focusedId, setFocusedId] = useState<string>('nav-tab-0');
  const [isVirtualRemoteOpen, setIsVirtualRemoteOpen] = useState<boolean>(true);
  const lastKeyTime = useRef<number>(0);

  // Trigger smooth scroll when focusedId changes
  useEffect(() => {
    if (!focusedId) return;
    const el = document.getElementById(focusedId);
    if (el) {
      el.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest',
      });
    }
  }, [focusedId]);

  return {
    focusedId,
    setFocusedId,
    isVirtualRemoteOpen,
    setIsVirtualRemoteOpen,
  };
}
