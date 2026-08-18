import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { PortalNav } from '@/components/portal/PortalNav';
import { signOutAction } from '@/app/actions/auth';
import { countUnreadNotifications } from '@/lib/server/portal/notifications';
import { getServerClient } from '@/lib/supabase/server';
import { es } from '@/locales/es';

type CompanyRelation = { status?: string } | { status?: string }[] | null | undefined;

function companyStatus(relation: CompanyRelation): string | undefined {
  return Array.isArray(relation) ? relation[0]?.status : relation?.status;
}

/**
 * Portal gate (design.md §3.2, spec company-registration "acceso bloqueado"):
 * only `approved` companies see the portal. Pending (or unknown — defensive)
 * and rejected users get an informative screen without portal functions.
 */
export default async function PortalLayout({ children }: { children: ReactNode }) {
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/acceso');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, companies(status)')
    .maybeSingle();
  if (profile?.role === 'admin') redirect('/admin');

  const status = companyStatus(profile?.companies as CompanyRelation);

  if (status !== 'approved') {
    const rejected = status === 'rejected';
    return (
      <main className="mx-auto max-w-2xl px-6 py-16 text-center">
        <h1 className="text-3xl font-bold text-ink">
          {rejected ? es.auth.portal.rejectedTitle : es.auth.portal.pendingTitle}
        </h1>
        <p className="mt-4 text-base text-gray-600">
          {rejected ? es.auth.portal.rejectedBody : es.auth.portal.pendingBody}
        </p>
        <form action={signOutAction} className="mt-8">
          <Button type="submit">{es.auth.portal.signOut}</Button>
        </form>
      </main>
    );
  }

  const unread = await countUnreadNotifications(supabase);

  return (
    <div className="min-h-screen bg-cream-50">
      <header className="sticky top-16 border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2" aria-label={es.brand.name}>
            <Image src="/logo.png" alt="" width={24} height={24} className="rounded-md" />
            <span className="text-base font-bold text-ink">{es.auth.portal.title}</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/portal/notificaciones"
              aria-label={es.auth.portal.notifications.title}
              className="relative rounded-full p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-ink"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden="true"
                className="h-5 w-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
              {unread > 0 && (
                <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </Link>
            <form action={signOutAction}>
              <Button type="submit" variant="ghost">
                {es.auth.portal.signOut}
              </Button>
            </form>
          </div>
        </div>
        <PortalNav />
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
