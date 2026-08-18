import { describe, expect, it } from 'vitest';
import { seoMetadata } from './meta';

type Og = { type?: string; images?: ({ url?: string } | string)[] };

describe('seoMetadata', () => {
  it('builds title, description and canonical from the path', () => {
    const meta = seoMetadata({
      title: 'Empresas',
      description: 'Directorio de empresas cubanas.',
      path: '/empresas',
    });
    expect(meta.title).toBe('Empresas');
    expect(meta.description).toBe('Directorio de empresas cubanas.');
    expect(meta.alternates?.canonical).toBe('https://nexcuba.org/empresas');
  });

  it('uses the logo as the default Open Graph image', () => {
    const meta = seoMetadata({
      title: 'Empresas',
      description: 'd',
      path: '/empresas',
    });
    const og = meta.openGraph as Og;
    expect(Array.isArray(og.images)).toBe(true);
    expect(og.images?.[0]).toMatchObject({
      url: 'https://nexcuba.org/logo.png',
      width: 1200,
      height: 630,
    });
    expect(meta.twitter?.images).toContain('https://nexcuba.org/logo.png');
  });

  it('accepts a custom image and type for profile pages', () => {
    const meta = seoMetadata({
      title: 'Acme',
      description: 'd',
      path: '/empresas/acme',
      image: 'https://cdn.example/acme.png',
      type: 'profile',
    });
    const og = meta.openGraph as Og;
    expect(og.type).toBe('profile');
    const first = og.images?.[0];
    expect(typeof first === 'object' && first !== null ? first.url : first).toBe(
      'https://cdn.example/acme.png',
    );
  });

  it('signals noindex when requested', () => {
    const meta = seoMetadata({
      title: 'Buscar',
      description: 'd',
      path: '/buscar',
      noindex: true,
    });
    expect(meta.robots).toEqual({ index: false, follow: true });
  });

  it('leaves robots undefined by default', () => {
    const meta = seoMetadata({ title: 't', description: 'd', path: '/registro' });
    expect(meta.robots).toBeUndefined();
  });
});
