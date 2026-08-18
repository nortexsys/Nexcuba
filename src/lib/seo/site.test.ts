import { describe, expect, it } from 'vitest';
import { absoluteUrl, SITE_URL } from './site';

describe('absoluteUrl', () => {
  it('returns the origin for the root path', () => {
    expect(absoluteUrl()).toBe('https://nexcuba.org');
    expect(absoluteUrl('/')).toBe('https://nexcuba.org');
  });

  it('appends a leading slash when missing', () => {
    expect(absoluteUrl('empresas')).toBe('https://nexcuba.org/empresas');
  });

  it('keeps an existing leading slash', () => {
    expect(absoluteUrl('/empresas/acme')).toBe('https://nexcuba.org/empresas/acme');
  });

  it('exposes SITE_URL as a constant', () => {
    expect(SITE_URL).toBe('https://nexcuba.org');
  });
});
