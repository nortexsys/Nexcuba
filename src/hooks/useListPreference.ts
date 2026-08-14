'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ViewMode } from '@/components/ui/ViewToggle';

export function resolveDefaultView(isMobile: boolean): ViewMode {
  // D-5: table is the default on mobile; cards on desktop and tablet (>=768px).
  return isMobile ? 'table' : 'cards';
}

function storageKey(sectionKey: string) {
  return `nexcuba.view:${sectionKey}`;
}

/**
 * List view preference per section (decision D-5): a stored choice wins over
 * the viewport default; the choice persists for the session and never touches
 * URL params, so filters/search/order are untouched when switching.
 *
 * SSR safety: initial render is always 'cards' (desktop default); after mount
 * the stored preference / viewport default is applied.
 */
export function useListPreference(sectionKey: string) {
  const [mode, setModeState] = useState<ViewMode>('cards');

  useEffect(() => {
    let initial: ViewMode | null = null;
    try {
      initial = window.sessionStorage.getItem(storageKey(sectionKey)) as ViewMode | null;
    } catch {
      initial = null;
    }
    if (initial !== 'cards' && initial !== 'table') {
      const isMobile = window.matchMedia('(max-width: 767px)').matches;
      initial = resolveDefaultView(isMobile);
    }
    setModeState(initial);
  }, [sectionKey]);

  const setMode = useCallback(
    (next: ViewMode) => {
      setModeState(next);
      try {
        window.sessionStorage.setItem(storageKey(sectionKey), next);
      } catch {
        // Private-mode browsers: preference is simply not persisted.
      }
    },
    [sectionKey],
  );

  return { mode, setMode } as const;
}
