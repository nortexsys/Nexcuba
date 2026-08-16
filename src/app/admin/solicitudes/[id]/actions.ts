'use server';

import { revalidatePath } from 'next/cache';
import type { AdminActionState } from '@/lib/admin/form';
import { reviewApplication } from '@/lib/server/approval';
import { sendApprovalEmail } from '@/lib/server/email';
import { getServerClient } from '@/lib/supabase/server';
import { es } from '@/locales/es';

const d = es.auth.admin.applications.detail;

async function currentReviewerId(): Promise<string | null> {
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function approveApplicationAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const id = String(formData.get('applicationId') ?? '');
  const reviewerId = await currentReviewerId();
  if (!reviewerId) return { status: 'error', message: es.common.error };

  const supabase = await getServerClient();
  const result = await reviewApplication(
    { client: supabase, reviewerId, sendEmail: sendApprovalEmail },
    id,
    'approve',
  );

  revalidatePath('/admin/solicitudes');
  revalidatePath(`/admin/solicitudes/${id}`);
  revalidatePath('/admin');

  if (!result.ok) return { status: 'error', message: result.message ?? es.common.error };
  return {
    status: 'success',
    message: result.email?.sent ? d.approved : d.approvedNoEmail,
  };
}

export async function rejectApplicationAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const id = String(formData.get('applicationId') ?? '');
  const reason = String(formData.get('reason') ?? '');
  const reviewerId = await currentReviewerId();
  if (!reviewerId) return { status: 'error', message: es.common.error };

  const supabase = await getServerClient();
  const result = await reviewApplication(
    { client: supabase, reviewerId, sendEmail: sendApprovalEmail },
    id,
    'reject',
    reason,
  );

  revalidatePath('/admin/solicitudes');
  revalidatePath(`/admin/solicitudes/${id}`);
  revalidatePath('/admin');

  if (!result.ok) return { status: 'error', message: result.message ?? es.common.error };
  return { status: 'success', message: d.rejected };
}
