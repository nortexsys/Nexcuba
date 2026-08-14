/**
 * Routing table for auth-related redirects. Pure functions so the middleware
 * stays thin and the rules are unit-testable (design.md §3).
 */

export type CompanyStatus = 'pending' | 'approved' | 'rejected';

export interface SessionProfile {
  role: 'company' | 'admin';
  companyStatus?: CompanyStatus;
}

export function decideLoginDestination(profile: SessionProfile): '/admin' | '/portal' {
  return profile.role === 'admin' ? '/admin' : '/portal';
}

const PROTECTED_PREFIXES = ['/portal', '/admin'];
const AUTH_PAGES = ['/acceso', '/registro', '/recuperar'];

const hasPrefix = (pathname: string, prefix: string): boolean =>
  pathname === prefix || pathname.startsWith(`${prefix}/`);

/**
 * Returns a redirect target when `pathname` and the session are incompatible,
 * or undefined when the request may proceed.
 */
export function resolveRouteGuard(pathname: string, isAuthenticated: boolean): string | undefined {
  if (!isAuthenticated && PROTECTED_PREFIXES.some((p) => hasPrefix(pathname, p))) {
    return '/acceso';
  }
  if (isAuthenticated && AUTH_PAGES.some((p) => hasPrefix(pathname, p))) {
    return '/portal';
  }
  return undefined;
}
