import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { AdminNav } from '@/components/admin/AdminNav';
import { Button } from '@/components/ui/Button';
import { signOutAction } from '@/app/actions/auth';
import { getServerClient } from '@/lib/supabase/server';
import { es } from '@/locales/es';

/**
 * Backoffice gate (task 4.1): only `profiles.role = 'admin'` passes — RLS
 * enforces the same rule at row level for every query inside.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/acceso');

  const { data: profile } = await supabase.from('profiles').select('role').maybeSingle();
  if (profile?.role !== 'admin') redirect('/portal');

  return (
    <div className="min-h-screen bg-cream-50 text-ink">
      <header className="sticky top-0 z-40 bg-ink text-white">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2" aria-label={es.brand.name}>
            <Image src="/logo.png" alt="" width={24} height={24} className="rounded-md" />
            <span className="text-base font-bold">{es.auth.admin.title}</span>
          </Link>
          <form action={signOutAction}>
            <Button type="submit" variant="light">
              {es.auth.admin.signOut}
            </Button>
          </form>
        </div>
        <AdminNav />
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
