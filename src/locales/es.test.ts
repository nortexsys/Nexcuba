import { describe, expect, it } from 'vitest';
import { es } from '@/locales/es';

describe('locale es (contractual strings)', () => {
  it('uses the exact global search placeholder required by the funcional §12.1', () => {
    // Traceability: spec search-discovery asserts this exact string.
    expect(es.search.placeholder).toBe('Búsqueda general en nexcuba.org');
  });

  it('exposes the five public sections in the header nav', () => {
    expect(Object.keys(es.header.nav)).toEqual([
      'companies',
      'products',
      'services',
      'projects',
      'opportunities',
    ]);
  });

  it('pluralizes result counts in Spanish', () => {
    expect(es.common.resultsCount(1)).toBe('1 resultado');
    expect(es.common.resultsCount(5)).toBe('5 resultados');
  });
});
