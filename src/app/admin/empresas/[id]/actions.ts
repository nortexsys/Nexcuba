'use server';

import { revalidatePath } from 'next/cache';
import type { AdminActionState } from '@/lib/admin/form';
import { upsertCrmRecord } from '@/lib/server/backoffice/crm';
import { activatePremium, deactivatePremium, setFeatured } from '@/lib/server/backoffice/companies';
import { getServerClient } from '@/lib/supabase/server';
import { es } from '@/locales/es';

const t = es.auth.admin.taxonomies;

async function withClient<T>(
  run: (client: Awaited<ReturnType<typeof getServerClient>>) => Promise<T>,
): Promise<T> {
  const supabase = await getServerClient();
  return run(supabase);
}

export async function setFeaturedAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const companyId = String(formData.get('companyId') ?? '');
  const featured = formData.get('featured') === 'on';
  const result = await withClient((client) => setFeatured(client, '', companyId, featured));
  revalidatePath(`/admin/empresas/${companyId}`);
  revalidatePath('/admin/empresas');
  return result.ok
    ? { status: 'success', message: t.saved }
    : { status: 'error', message: result.message };
}

export async function activatePremiumAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const companyId = String(formData.get('companyId') ?? '');
  const months = Number(formData.get('months') ?? 12);
  const result = await withClient((client) => activatePremium(client, '', companyId, months));
  revalidatePath(`/admin/empresas/${companyId}`);
  revalidatePath('/admin/empresas');
  return result.ok
    ? { status: 'success', message: t.saved }
    : { status: 'error', message: result.message };
}

export async function deactivatePremiumAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const companyId = String(formData.get('companyId') ?? '');
  const result = await withClient((client) => deactivatePremium(client, '', companyId));
  revalidatePath(`/admin/empresas/${companyId}`);
  revalidatePath('/admin/empresas');
  return result.ok
    ? { status: 'success', message: t.saved }
    : { status: 'error', message: result.message };
}

export async function saveCrmAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const companyId = String(formData.get('companyId') ?? '');
  const value = (name: string) => String(formData.get(name) ?? '').trim();
  const flag = (name: string) => formData.get(name) === 'on';

  const result = await withClient((client) =>
    upsertCrmRecord(client, '', companyId, {
      hasWebsite: flag('hasWebsite'),
      hasDomain: flag('hasDomain'),
      hasCorporateEmail: flag('hasCorporateEmail'),
      hasSocials: flag('hasSocials'),
      digitalNeeds: value('digitalNeeds') || undefined,
      commercialPotential: value('commercialPotential') as 'low' | 'medium' | 'high',
      followupStatus: value('followupStatus') || undefined,
      notes: value('notes') || undefined,
    }),
  );

  revalidatePath(`/admin/empresas/${companyId}`);
  revalidatePath('/admin/crm');
  return result.ok
    ? { status: 'success', message: es.auth.admin.crm.form.saved }
    : { status: 'error', message: result.message };
}
