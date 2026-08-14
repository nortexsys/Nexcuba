import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { resolveRouteGuard } from '@/lib/auth/session';

/**
 * Session refresh + coarse route protection (task 3.3). Fine-grained gates —
 * company status and admin role — live in the /portal and /admin layouts,
 * with RLS as the final enforcement layer. The routing table itself is a pure
 * function tested in src/lib/auth/session.test.ts.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return response; // no Supabase config (CI): skip refresh

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const target = resolveRouteGuard(request.nextUrl.pathname, Boolean(user));
  if (target) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = target;
    redirectUrl.search = '';
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: [
    // Everything except Next internals and static assets.
    '/((?!_next/static|_next/image|favicon\\.ico|icon\\.png|logo\\.png|.*\\.(?:png|jpg|jpeg|svg|webp|ico|txt|xml)$).*)',
  ],
};
