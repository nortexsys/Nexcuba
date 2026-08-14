import type { SupabaseClient } from '@supabase/supabase-js';
import { sendApprovalEmail } from '@/lib/server/email';

/**
 * Registration review transaction (design.md §3.3). Runs with the admin's own
 * session client — RLS is the authorization gate — and writes the audit trail
 * through the `audit()` helper. The approval email is best effort (D-2); the
 * rejection reason is never emailed automatically: the admin communicates it
 * manually (funcional §6.2.7).
 */

export type ReviewDecision = 'approve' | 'reject';

export interface ReviewResult {
  ok: boolean;
  message?: string;
  /** Present on approval — email delivery outcome. */
  email?: { sent: boolean; reason?: 'missing-key' | 'provider-error' };
  /** Present on rejection — for the backoffice "copy email" affordance (H4). */
  applicantEmail?: string;
}

export interface ReviewDeps {
  client: SupabaseClient;
  reviewerId: string;
  sendEmail?: typeof sendApprovalEmail;
}

interface ApplicationRow {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  applicant_email: string;
  company_id: string;
  companies: { legal_name: string } | { legal_name: string }[] | null;
}

function companyName(application: ApplicationRow): string {
  const related = application.companies;
  if (Array.isArray(related)) return related[0]?.legal_name ?? '';
  return related?.legal_name ?? '';
}

export async function reviewApplication(
  deps: ReviewDeps,
  applicationId: string,
  decision: ReviewDecision,
  rejectionReason?: string,
): Promise<ReviewResult> {
  const { client, reviewerId, sendEmail = sendApprovalEmail } = deps;

  if (decision === 'reject') {
    const reason = rejectionReason?.trim() ?? '';
    if (reason.length < 10) {
      return { ok: false, message: 'Indica el motivo del rechazo (mínimo 10 caracteres).' };
    }
  }

  const { data: application, error } = await client
    .from('registration_applications')
    .select('id, status, applicant_email, company_id, companies(legal_name)')
    .eq('id', applicationId)
    .single<ApplicationRow>();

  if (error || !application) return { ok: false, message: 'Solicitud no encontrada.' };
  if (application.status !== 'pending') {
    return { ok: false, message: 'Esta solicitud ya fue revisada.' };
  }

  const now = new Date().toISOString();

  if (decision === 'approve') {
    const company = await client
      .from('companies')
      .update({ status: 'approved', approved_at: now, approved_by: reviewerId })
      .eq('id', application.company_id);
    if (company.error) {
      console.error('[approval] company update failed', company.error.message);
      return { ok: false, message: 'No se pudo aprobar la solicitud.' };
    }

    const review = await client
      .from('registration_applications')
      .update({ status: 'approved', reviewed_by: reviewerId, reviewed_at: now })
      .eq('id', applicationId);
    if (review.error) {
      console.error('[approval] application update failed', review.error.message);
      return { ok: false, message: 'No se pudo aprobar la solicitud.' };
    }

    const audit = await client.rpc('audit', {
      p_action: 'registration_application.approve',
      p_entity: 'registration_application',
      p_entity_id: applicationId,
      p_metadata: {},
    });
    if (audit.error) console.error('[approval] audit write failed', audit.error.message);

    const email = await sendEmail(application.applicant_email, companyName(application));
    return { ok: true, email };
  }

  const reason = (rejectionReason ?? '').trim();
  const company = await client
    .from('companies')
    .update({ status: 'rejected' })
    .eq('id', application.company_id);
  if (company.error) {
    console.error('[rejection] company update failed', company.error.message);
    return { ok: false, message: 'No se pudo desaprobar la solicitud.' };
  }

  const review = await client
    .from('registration_applications')
    .update({
      status: 'rejected',
      rejection_reason: reason,
      reviewed_by: reviewerId,
      reviewed_at: now,
    })
    .eq('id', applicationId);
  if (review.error) {
    console.error('[rejection] application update failed', review.error.message);
    return { ok: false, message: 'No se pudo desaprobar la solicitud.' };
  }

  const audit = await client.rpc('audit', {
    p_action: 'registration_application.reject',
    p_entity: 'registration_application',
    p_entity_id: applicationId,
    p_metadata: { rejection_reason: reason },
  });
  if (audit.error) console.error('[rejection] audit write failed', audit.error.message);

  return { ok: true, applicantEmail: application.applicant_email };
}
