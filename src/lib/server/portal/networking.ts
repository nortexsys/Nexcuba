import type { SupabaseClient } from '@supabase/supabase-js';
import { computeNetworkingRight } from '@/lib/public/queries';
import {
  sendContactRequestAcceptedEmail,
  sendContactRequestEmail,
  type SendEmailResult,
} from '@/lib/server/email';
import type { PortalActionResult } from '@/lib/server/portal/profile';

/**
 * Networking self-service (H8, spec networking): send a contact request to
 * another approved company, accept an incoming one and read the inbox. The
 * networking right is validated here for friendly messages and again by RLS
 * (single source of truth is `own_can_network()` in 0004). Notifications
 * (in-app) are created by the DB trigger 0012; emails are best effort (D-2).
 */

const MAX_SUBJECT = 120;
const MAX_MESSAGE = 2000;

export interface NetworkingDeps {
  client: SupabaseClient;
  companyId: string;
  sendRequestEmail?: typeof sendContactRequestEmail;
  sendAcceptedEmail?: typeof sendContactRequestAcceptedEmail;
}

export interface SendContactRequestInput {
  targetSlug: string;
  subject: string;
  message: string;
}

type CompanyRelation = Record<string, unknown> | Record<string, unknown>[] | null | undefined;

function one(relation: CompanyRelation): Record<string, unknown> | null {
  if (Array.isArray(relation)) return relation[0] ?? null;
  return relation ?? null;
}

interface TargetCompany {
  id: string;
  legalName: string;
  email: string | null;
}

async function findTargetBySlug(
  client: SupabaseClient,
  slug: string,
): Promise<TargetCompany | null> {
  const { data, error } = await client
    .from('companies')
    .select('id, legal_name, email')
    .eq('slug', slug)
    .maybeSingle();
  if (error) {
    console.error('[sendContactRequest] target lookup', error.message);
    return null;
  }
  if (!data) return null;
  const row = data as Record<string, unknown>;
  return {
    id: row.id as string,
    legalName: ((row.display_name as string | null) ?? (row.legal_name as string)) || '',
    email: (row.email as string | null) ?? null,
  };
}

export async function sendContactRequest(
  deps: NetworkingDeps,
  input: SendContactRequestInput,
): Promise<PortalActionResult> {
  const { client, companyId, sendRequestEmail = sendContactRequestEmail } = deps;
  const subject = input.subject.trim();
  const message = input.message.trim();
  const targetSlug = input.targetSlug.trim();

  if (subject === '') return { ok: false, message: 'Escribe un asunto para la solicitud.' };
  if (message === '') return { ok: false, message: 'Escribe un mensaje para la solicitud.' };
  if (subject.length > MAX_SUBJECT) {
    return { ok: false, message: `El asunto no puede superar los ${MAX_SUBJECT} caracteres.` };
  }
  if (message.length > MAX_MESSAGE) {
    return { ok: false, message: `El mensaje no puede superar los ${MAX_MESSAGE} caracteres.` };
  }
  if (targetSlug === '') return { ok: false, message: 'No se especificó la empresa receptora.' };

  // Networking right (same predicate as RLS `own_can_network()`).
  const { data: own, error: ownError } = await client
    .from('companies')
    .select('entity_type, status, premium_until, legal_name, display_name')
    .eq('id', companyId)
    .maybeSingle();
  if (ownError || !own) {
    if (ownError) console.error('[sendContactRequest] own company', ownError.message);
    return { ok: false, message: 'No se pudo verificar tu plan. Inténtalo de nuevo.' };
  }
  const ownRow = own as Record<string, unknown>;
  const canNetwork = computeNetworkingRight({
    role: 'company',
    status: ownRow.status as string,
    entityType: ownRow.entity_type as string,
    premiumUntil: (ownRow.premium_until as string | null) ?? null,
  });
  if (!canNetwork) {
    return {
      ok: false,
      message:
        'Para contactar mediante NexCuba necesitas un plan Premium (las empresas extranjeras) o una cuenta aprobada.',
    };
  }

  const target = await findTargetBySlug(client, targetSlug);
  if (!target) return { ok: false, message: 'La empresa receptora no está disponible.' };
  if (target.id === companyId) {
    return { ok: false, message: 'No puedes enviarte una solicitud de contacto a ti misma.' };
  }

  // Guard: one pending request per direction (DB unique index is the backstop).
  const { data: existing, error: dupError } = await client
    .from('contact_requests')
    .select('id')
    .eq('requester_company_id', companyId)
    .eq('target_company_id', target.id)
    .eq('status', 'pending')
    .maybeSingle();
  if (dupError) {
    console.error('[sendContactRequest] duplicate check', dupError.message);
  }
  if (!dupError && existing) {
    return { ok: false, message: 'Ya tienes una solicitud pendiente hacia esta empresa.' };
  }

  const { data: inserted, error } = await client
    .from('contact_requests')
    .insert({
      requester_company_id: companyId,
      target_company_id: target.id,
      subject,
      message,
    })
    .select('id')
    .single();
  if (error) {
    console.error('[sendContactRequest] insert', error.message);
    return { ok: false, message: 'No se pudo enviar la solicitud. Inténtalo de nuevo.' };
  }
  const requestId = (inserted as Record<string, unknown> | null)?.id as string | undefined;

  // Notify the target by email (best effort). The in-app notification is
  // created by the trigger 0012; the email carries subject + message.
  let email: SendEmailResult = { sent: false };
  if (target.email) {
    email = await sendRequestEmail(target.email, {
      requesterName:
        ((ownRow.legal_name as string | null) ?? (ownRow.display_name as string)) || '',
      subject,
      message,
      targetName: target.legalName,
    });
  }
  void requestId;
  void email;
  return { ok: true };
}

export interface AcceptContactRequestInput {
  requestId: string;
}

export async function acceptContactRequest(
  deps: NetworkingDeps,
  input: AcceptContactRequestInput,
): Promise<PortalActionResult> {
  const { client, companyId, sendAcceptedEmail = sendContactRequestAcceptedEmail } = deps;
  const requestId = input.requestId.trim();
  if (requestId === '') return { ok: false, message: 'No se especificó la solicitud.' };

  const { data, error } = await client
    .from('contact_requests')
    .select(
      `id, status, target_company_id,
       requester:companies!contact_requests_requester_company_id_fkey(legal_name, display_name, email)`,
    )
    .eq('id', requestId)
    .maybeSingle();
  if (error) {
    console.error('[acceptContactRequest] lookup', error.message);
    return { ok: false, message: 'No se pudo localizar la solicitud.' };
  }
  if (!data) return { ok: false, message: 'Solicitud de contacto no encontrada.' };

  const row = data as Record<string, unknown>;
  if (row.target_company_id !== companyId) {
    return { ok: false, message: 'Solo la empresa receptora puede aceptar la solicitud.' };
  }
  if (row.status !== 'pending') {
    return { ok: false, message: 'Esta solicitud ya fue gestionada.' };
  }

  const { error: updateError } = await client
    .from('contact_requests')
    .update({ status: 'accepted' })
    .eq('id', requestId);
  if (updateError) {
    console.error('[acceptContactRequest] update', updateError.message);
    return { ok: false, message: 'No se pudo aceptar la solicitud. Inténtalo de nuevo.' };
  }

  const requester = one(row.requester as CompanyRelation);
  const requesterEmail = (requester?.email as string | null) ?? null;
  const requesterName =
    ((requester?.display_name as string | null) ?? (requester?.legal_name as string)) || '';

  if (requesterEmail) {
    await sendAcceptedEmail(requesterEmail, {
      requesterName,
      targetName: await ownCompanyName(client, companyId),
    });
  }
  return { ok: true };
}

export interface ContactInboxItem {
  id: string;
  subject: string;
  status: 'pending' | 'accepted';
  createdAt: string;
  acceptedAt: string | null;
  /** The other company (requester for received, target for sent/established). */
  counterpart: { id: string; name: string; slug: string } | null;
}

export interface ContactInbox {
  /** Incoming requests waiting for our acceptance. */
  received: ContactInboxItem[];
  /** Requests we sent, pending or accepted. */
  sent: ContactInboxItem[];
  /** Accepted in either direction — the mutual contact list. */
  established: ContactInboxItem[];
}

function mapInboxRow(row: Record<string, unknown>, counterpartKey: string): ContactInboxItem {
  const counterpart = one(row[counterpartKey] as CompanyRelation);
  return {
    id: row.id as string,
    subject: row.subject as string,
    status: row.status as 'pending' | 'accepted',
    createdAt: row.created_at as string,
    acceptedAt: (row.accepted_at as string | null) ?? null,
    counterpart: counterpart
      ? {
          id: counterpart.id as string,
          name:
            ((counterpart.display_name as string | null) ?? (counterpart.legal_name as string)) ||
            '',
          slug: (counterpart.slug as string) ?? '',
        }
      : null,
  };
}

export async function listContactInbox(
  client: SupabaseClient,
  companyId: string,
): Promise<ContactInbox> {
  const [receivedResult, sentResult, establishedResult] = await Promise.all([
    client
      .from('contact_requests')
      .select(
        `id, subject, status, created_at, accepted_at,
         requester:companies!contact_requests_requester_company_id_fkey(id, slug, display_name, legal_name)`,
      )
      .eq('target_company_id', companyId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(50),
    client
      .from('contact_requests')
      .select(
        `id, subject, status, created_at, accepted_at,
         target:companies!contact_requests_target_company_id_fkey(id, slug, display_name, legal_name)`,
      )
      .eq('requester_company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(50),
    client
      .from('contact_requests')
      .select(
        `id, subject, status, created_at, accepted_at,
         requester:companies!contact_requests_requester_company_id_fkey(id, slug, display_name, legal_name),
         target:companies!contact_requests_target_company_id_fkey(id, slug, display_name, legal_name)`,
      )
      .or(`requester_company_id.eq.${companyId},target_company_id.eq.${companyId}`)
      .eq('status', 'accepted')
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  const received = receivedResult.error
    ? []
    : (receivedResult.data ?? []).map((row) =>
        mapInboxRow(row as Record<string, unknown>, 'requester'),
      );
  const sent = sentResult.error
    ? []
    : (sentResult.data ?? []).map((row) => mapInboxRow(row as Record<string, unknown>, 'target'));

  const established = establishedResult.error
    ? []
    : (establishedResult.data ?? []).map((row: Record<string, unknown>) => {
        const requester = one(row.requester as CompanyRelation);
        const target = one(row.target as CompanyRelation);
        const counterpart = requester && requester.id !== companyId ? requester : target;
        return {
          id: row.id as string,
          subject: row.subject as string,
          status: row.status as 'pending' | 'accepted',
          createdAt: row.created_at as string,
          acceptedAt: (row.accepted_at as string | null) ?? null,
          counterpart: counterpart
            ? {
                id: counterpart.id as string,
                name:
                  ((counterpart.display_name as string | null) ??
                    (counterpart.legal_name as string)) ||
                  '',
                slug: (counterpart.slug as string) ?? '',
              }
            : null,
        };
      });

  return { received, sent, established };
}

async function ownCompanyName(client: SupabaseClient, companyId: string): Promise<string> {
  const { data, error } = await client
    .from('companies')
    .select('legal_name, display_name')
    .eq('id', companyId)
    .maybeSingle();
  if (error || !data) return '';
  const row = data as Record<string, unknown>;
  return ((row.display_name as string | null) ?? (row.legal_name as string)) || '';
}
