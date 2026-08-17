'use client';

import type { ReactNode } from 'react';
import { useListPreference } from '@/hooks/useListPreference';
import { ViewToggle } from '@/components/ui/ViewToggle';
import { es } from '@/locales/es';

/**
 * Dual-mode public listing (decision D-5 / spec public-directory): receives
 * both layouts as server-rendered children and toggles between them with the
 * per-section session preference — filters/search/order live in the URL and
 * are never touched by the switch.
 */
export function DualListing({
  sectionKey,
  cards,
  table,
}: {
  sectionKey: string;
  cards: ReactNode;
  table: ReactNode;
}) {
  const { mode, setMode } = useListPreference(sectionKey);
  const t = es.common.viewToggle;

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-end">
        <ViewToggle
          value={mode}
          onChange={setMode}
          cardsLabel={t.cards}
          tableLabel={t.table}
          legendLabel={t.legend}
        />
      </div>
      <div aria-live="polite">{mode === 'cards' ? cards : table}</div>
    </div>
  );
}
