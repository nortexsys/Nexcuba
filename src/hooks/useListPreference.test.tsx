import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveDefaultView, useListPreference } from '@/hooks/useListPreference';

function stubMatchMedia(matches: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation(() => ({
      matches,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

describe('resolveDefaultView (D-5 defaults)', () => {
  it('defaults to table on mobile', () => {
    expect(resolveDefaultView(true)).toBe('table');
  });

  it('defaults to cards on desktop and tablet', () => {
    expect(resolveDefaultView(false)).toBe('cards');
  });
});

describe('useListPreference', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('applies the stored preference over the viewport default', async () => {
    window.sessionStorage.setItem('nexcuba.view:companies', 'table');
    stubMatchMedia(false); // desktop → cards default, but stored wins
    const { result } = renderHook(() => useListPreference('companies'));
    await act(async () => {});
    expect(result.current.mode).toBe('table');
  });

  it('falls back to the viewport default when nothing is stored', async () => {
    stubMatchMedia(true); // mobile → table default
    const { result } = renderHook(() => useListPreference('products'));
    await act(async () => {});
    expect(result.current.mode).toBe('table');
  });

  it('ignores garbage stored values', async () => {
    window.sessionStorage.setItem('nexcuba.view:products', 'garbage');
    stubMatchMedia(false); // desktop → cards
    const { result } = renderHook(() => useListPreference('products'));
    await act(async () => {});
    expect(result.current.mode).toBe('cards');
  });

  it('persists manual changes per section for the session', async () => {
    stubMatchMedia(false);
    const { result } = renderHook(() => useListPreference('services'));
    await act(async () => {});
    act(() => result.current.setMode('table'));
    expect(result.current.mode).toBe('table');
    expect(window.sessionStorage.getItem('nexcuba.view:services')).toBe('table');
    // A different section is unaffected
    expect(window.sessionStorage.getItem('nexcuba.view:other')).toBeNull();
  });

  it('keeps working when sessionStorage is unavailable (private mode)', async () => {
    stubMatchMedia(false);
    const original = window.sessionStorage;
    const failing = {
      getItem: () => null,
      setItem: () => {
        throw new DOMException('QuotaExceeded');
      },
    } as unknown as Storage;
    vi.spyOn(window, 'sessionStorage', 'get').mockReturnValue(failing);
    try {
      const { result } = renderHook(() => useListPreference('companies'));
      await act(async () => {});
      act(() => result.current.setMode('cards'));
      expect(result.current.mode).toBe('cards'); // no crash, value still applied
    } finally {
      vi.spyOn(window, 'sessionStorage', 'get').mockReturnValue(original);
    }
  });
});
