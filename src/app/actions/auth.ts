'use server';

import { redirect } from 'next/navigation';
import { getServerClient } from '@/lib/supabase/server';

/** Shared sign-out for the portal header and the admin backoffice. */
export async function signOutAction(): Promise<void> {
  const supabase = await getServerClient();
  await supabase.auth.signOut();
  redirect('/acceso');
}
