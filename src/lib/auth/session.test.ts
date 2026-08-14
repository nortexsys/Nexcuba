import { describe, expect, it } from 'vitest';
import { decideLoginDestination, resolveRouteGuard } from '@/lib/auth/session';

describe('decideLoginDestination', () => {
  it('sends admins to the backoffice', () => {
    expect(decideLoginDestination({ role: 'admin' })).toBe('/admin');
  });

  it('sends companies to the portal regardless of status (the gate renders the screen)', () => {
    expect(decideLoginDestination({ role: 'company', companyStatus: 'approved' })).toBe('/portal');
    expect(decideLoginDestination({ role: 'company', companyStatus: 'pending' })).toBe('/portal');
    expect(decideLoginDestination({ role: 'company', companyStatus: 'rejected' })).toBe('/portal');
  });
});

describe('resolveRouteGuard (middleware routing table)', () => {
  it('redirects unauthenticated visitors away from protected areas', () => {
    expect(resolveRouteGuard('/portal', false)).toBe('/acceso');
    expect(resolveRouteGuard('/portal/mi-empresa', false)).toBe('/acceso');
    expect(resolveRouteGuard('/admin', false)).toBe('/acceso');
    expect(resolveRouteGuard('/admin/solicitudes', false)).toBe('/acceso');
  });

  it('keeps unauthenticated visitors on public and auth pages', () => {
    expect(resolveRouteGuard('/', false)).toBeUndefined();
    expect(resolveRouteGuard('/empresas', false)).toBeUndefined();
    expect(resolveRouteGuard('/acceso', false)).toBeUndefined();
    expect(resolveRouteGuard('/registro', false)).toBeUndefined();
    expect(resolveRouteGuard('/registro/extranjera', false)).toBeUndefined();
    expect(resolveRouteGuard('/recuperar', false)).toBeUndefined();
  });

  it('redirects authenticated users away from auth pages (no re-login)', () => {
    expect(resolveRouteGuard('/acceso', true)).toBe('/portal');
    expect(resolveRouteGuard('/registro', true)).toBe('/portal');
    expect(resolveRouteGuard('/registro/extranjera', true)).toBe('/portal');
  });

  it('leaves authenticated users everywhere else', () => {
    expect(resolveRouteGuard('/portal', true)).toBeUndefined();
    expect(resolveRouteGuard('/admin', true)).toBeUndefined();
    expect(resolveRouteGuard('/buscar', true)).toBeUndefined();
  });

  it('does not treat same-prefix paths as protected (e.g. /portales)', () => {
    expect(resolveRouteGuard('/portales', false)).toBeUndefined();
  });
});
