import { describe, expect, it } from 'vitest';
import { buildHref, filterChips } from '@/lib/url/filters';

describe('buildHref (7.3 URL builders)', () => {
  it('serializes present params preserving insertion order', () => {
    expect(buildHref('/empresas', { q: 'café', tipo: 'mipyme' })).toBe(
      '/empresas?q=caf%C3%A9&tipo=mipyme',
    );
  });

  it('drops empty and undefined values', () => {
    expect(buildHref('/productos', { q: '', categoria: undefined, cobertura: 'national' })).toBe(
      '/productos?cobertura=national',
    );
  });

  it('removes the listed keys while keeping the rest (chip → shareable URL)', () => {
    expect(
      buildHref('/empresas', { q: 'café', tipo: 'mipyme', sector: 'cafe-y-cacao' }, ['tipo']),
    ).toBe('/empresas?q=caf%C3%A9&sector=cafe-y-cacao');
  });

  it('returns the bare path when nothing remains', () => {
    expect(buildHref('/empresas', { q: 'x' }, ['q'])).toBe('/empresas');
  });
});

describe('filterChips (7.3 active filters → removable links)', () => {
  const chips = filterChips({
    pathname: '/empresas',
    searchParams: { q: 'café', tipo: 'mipyme', sector: '' },
    labels: {
      q: (value) => `«${value}»`,
      tipo: (value) => (value === 'mipyme' ? 'MIPYME' : value),
    },
  });

  it('only includes active filters, each with a remove link', () => {
    expect(chips).toEqual([
      { key: 'q', label: '«café»', removeHref: '/empresas?tipo=mipyme' },
      { key: 'tipo', label: 'MIPYME', removeHref: '/empresas?q=caf%C3%A9' },
    ]);
  });

  it('returns [] when no filter is active', () => {
    expect(
      filterChips({
        pathname: '/empresas',
        searchParams: {},
        labels: { q: (value) => value },
      }),
    ).toEqual([]);
  });
});
