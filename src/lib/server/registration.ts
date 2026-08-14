import type { SupabaseClient } from '@supabase/supabase-js';
import type { CubanRegistrationInput, ForeignRegistrationInput } from '@/lib/auth/schemas';
import { validateVerificationDocument } from '@/lib/uploads/validation';

/**
 * Signup saga (design.md §3.1). Runs with the service-role client because the
 * applicant has no session yet — RLS matrix row: "anon during signup (server
 * action, service role)". Any failure after the auth user exists is
 * compensated (best-effort rollback) so a half application never survives.
 */

export interface IncomingDocument {
  name: string;
  bytes: Uint8Array;
}

export type RegistrationResult =
  { ok: true; companyId: string } | { ok: false; field?: string; message: string };

const MIME_EXTENSION: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
};

function safeDocumentName(name: string, mime: string): string {
  const normalized = name.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
  if (normalized.includes('.')) return normalized.slice(-80);
  const ext = MIME_EXTENSION[mime] ?? 'bin';
  return `documento.${ext}`;
}

const GENERIC_ERROR = 'No se pudo registrar la solicitud. Inténtalo de nuevo.';

interface RollbackState {
  userId?: string;
  companyId?: string;
  storagePath?: string;
}

async function rollback(client: SupabaseClient, state: RollbackState): Promise<void> {
  console.error('[registration] rolling back signup', state);
  try {
    if (state.storagePath) {
      await client.storage.from('verification-docs').remove([state.storagePath]);
    }
  } catch (error) {
    console.error('[registration] storage rollback failed', error);
  }
  try {
    // Deleting the company cascades to profile, application and documents.
    if (state.companyId) await client.from('companies').delete().eq('id', state.companyId);
  } catch (error) {
    console.error('[registration] company rollback failed', error);
  }
  try {
    if (state.userId) await client.auth.admin.deleteUser(state.userId);
  } catch (error) {
    console.error('[registration] auth user rollback failed', error);
  }
}

function isDuplicateEmail(
  error: { message?: string; status?: number } | null | undefined,
): boolean {
  return Boolean(error && (/already/i.test(error.message ?? '') || error.status === 422));
}

async function createAuthUser(
  client: SupabaseClient,
  email: string,
  password: string,
  applicantName: string,
): Promise<{ userId: string } | { field: 'email'; message: string } | { message: string }> {
  const { data, error } = await client.auth.admin.createUser({
    email,
    password,
    email_confirm: false,
    user_metadata: { applicant_name: applicantName },
  });
  if (error) {
    if (isDuplicateEmail(error)) {
      return { field: 'email', message: 'Ya existe una cuenta con este email.' };
    }
    return { message: GENERIC_ERROR };
  }
  if (!data.user) return { message: GENERIC_ERROR };
  return { userId: data.user.id };
}

interface RunRegistration {
  client: SupabaseClient;
  applicantName: string;
  email: string;
  password: string;
  company: Record<string, unknown>;
  payload: Record<string, unknown>;
  document?: IncomingDocument;
}

async function runRegistration(args: RunRegistration): Promise<RegistrationResult> {
  const { client, document } = args;

  let mime: string | null = null;
  if (document) {
    const validation = validateVerificationDocument(document.bytes);
    if (!validation.ok) return { ok: false, field: 'document', message: validation.error };
    mime = validation.mime;
  }

  const state: RollbackState = {};

  const user = await createAuthUser(client, args.email, args.password, args.applicantName);
  if ('userId' in user) state.userId = user.userId;
  else if ('field' in user) return { ok: false, field: user.field, message: user.message };
  else return { ok: false, message: user.message };

  const fail = async (): Promise<{ ok: false; message: string }> => {
    await rollback(client, state);
    return { ok: false, message: GENERIC_ERROR };
  };

  const company = await client.from('companies').insert(args.company).select('id').single();
  if (company.error || !company.data) return fail();
  state.companyId = company.data.id;

  const profile = await client
    .from('profiles')
    .insert({ id: state.userId, role: 'company', company_id: state.companyId })
    .select('id')
    .single();
  if (profile.error) return fail();

  const application = await client
    .from('registration_applications')
    .insert({
      company_id: state.companyId,
      applicant_name: args.applicantName,
      applicant_email: args.email,
      applicant_phone: args.payload.phone as string | undefined,
      payload: args.payload,
    })
    .select('id')
    .single();
  if (application.error || !application.data) return fail();

  if (document && mime) {
    const storagePath = `${state.companyId}/${application.data.id}/${safeDocumentName(document.name, mime)}`;
    state.storagePath = storagePath;
    const upload = await client.storage
      .from('verification-docs')
      .upload(storagePath, document.bytes, { contentType: mime });
    if (upload.error) {
      state.storagePath = undefined; // nothing was stored
      return fail();
    }
    const doc = await client.from('verification_documents').insert({
      application_id: application.data.id,
      storage_path: storagePath,
      mime,
      size_bytes: document.bytes.length,
    });
    if (doc.error) return fail();
  }

  // state.companyId is always set here (fail() returns early otherwise).
  return { ok: true, companyId: state.companyId as string };
}

function withoutCredentials<T extends { password: string; confirmPassword: string }>(
  input: T,
): Omit<T, 'password' | 'confirmPassword'> {
  const { password: _p, confirmPassword: _c, ...rest } = input;
  return rest;
}

export async function submitCubanRegistration(
  client: SupabaseClient,
  input: CubanRegistrationInput,
  document: IncomingDocument,
): Promise<RegistrationResult> {
  const applicantName = `${input.applicantFirstName} ${input.applicantLastName}`.trim();
  return runRegistration({
    client,
    applicantName,
    email: input.email,
    password: input.password,
    company: {
      legal_name: input.companyName,
      display_name: input.companyName,
      entity_type: input.entityType,
      status: 'pending',
      phone: input.phone,
      email: input.email,
      address: input.address,
      province_id: input.provinceId,
      municipality_id: input.municipalityId,
    },
    payload: { ...withoutCredentials(input), entity_type: input.entityType },
    document,
  });
}

export async function submitForeignRegistration(
  client: SupabaseClient,
  input: ForeignRegistrationInput,
): Promise<RegistrationResult> {
  const applicantName = `${input.applicantFirstName} ${input.applicantLastName}`.trim();
  return runRegistration({
    client,
    applicantName,
    email: input.email,
    password: input.password,
    company: {
      legal_name: input.companyName,
      display_name: input.companyName,
      entity_type: 'foreign',
      status: 'pending',
      phone: input.phone,
      email: input.email,
      website: input.website,
    },
    payload: { ...withoutCredentials(input), entity_type: 'foreign' },
  });
}
