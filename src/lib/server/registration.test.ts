import type { SupabaseClient } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CubanRegistrationInput, ForeignRegistrationInput } from '@/lib/auth/schemas';
import { submitCubanRegistration, submitForeignRegistration } from '@/lib/server/registration';

// %PDF- magic bytes — a real (tiny) valid verification document.
const pdfBytes = new TextEncoder().encode('%PDF-1.4\n%nexcuba-test\n');
const textBytes = new TextEncoder().encode('esto no es un documento válido');

const cubanInput: CubanRegistrationInput = {
  applicantFirstName: 'María',
  applicantLastName: 'Fernández Ruiz',
  email: 'maria@midigital.cu',
  phone: '+53 5 123 4567',
  companyName: 'MiDigital SRL',
  entityType: 'mipyme',
  provinceId: 1,
  municipalityId: 3,
  address: 'Calle 23 #45, Vedado',
  extraIdData: 'Código 45-T-1234',
  password: 'contrasena-segura',
  confirmPassword: 'contrasena-segura',
};

const foreignInput: ForeignRegistrationInput = {
  applicantFirstName: 'John',
  applicantLastName: 'Smith',
  email: 'john@acme.com',
  phone: '+1 555 0100',
  companyName: 'Acme Trading Ltd.',
  country: 'España',
  website: 'https://acme-trading.example.com',
  password: 'contrasena-segura',
  confirmPassword: 'contrasena-segura',
};

interface Harness {
  client: SupabaseClient;
  inserts: Record<string, Record<string, unknown>[]>;
  uploads: { bucket: string; path: string; bytes: Uint8Array; options: unknown }[];
  removes: { bucket: string; path: string }[];
  deletedCompanies: string[];
  deletedUsers: string[];
  failInsertOn: (table: string) => void;
  failUpload: () => void;
}

function makeHarness(): Harness {
  const inserts: Record<string, Record<string, unknown>[]> = {};
  const uploads: Harness['uploads'] = [];
  const removes: Harness['removes'] = [];
  const deletedCompanies: string[] = [];
  const deletedUsers: string[] = [];
  const failing = { table: '', upload: false };

  const idFor = (table: string) =>
    ({ companies: 'c-1', profiles: 'p-1', registration_applications: 'a-1' })[table] ?? 'x-1';

  const client = {
    auth: {
      admin: {
        createUser: vi.fn(async () => ({ data: { user: { id: 'u-1' } }, error: null })),
        deleteUser: vi.fn(async (id: string) => {
          deletedUsers.push(id);
          return { data: {}, error: null };
        }),
      },
    },
    from: vi.fn((table: string) => ({
      // insert() records immediately; supports both `await insert()` and the
      // `insert().select().single()` chain used by the saga.
      insert: (row: Record<string, unknown> | Record<string, unknown>[]) => {
        const record = async () => {
          if (failing.table === table) {
            return { data: null, error: { message: `insert ${table} failed` } };
          }
          (inserts[table] ??= []).push(...(Array.isArray(row) ? row : [row]));
          return { data: { id: idFor(table) }, error: null };
        };
        const promise = record();
        return {
          select: () => ({ single: () => promise }),
          then: (
            onFulfilled?: ((value: unknown) => unknown) | null,
            onRejected?: ((reason: unknown) => unknown) | null,
          ) => promise.then(onFulfilled, onRejected),
        };
      },
      delete: () => ({
        eq: async (_column: string, value: string) => {
          if (table === 'companies') deletedCompanies.push(value);
          return { data: null, error: null };
        },
      }),
    })),
    storage: {
      from: vi.fn((bucket: string) => ({
        upload: async (path: string, bytes: Uint8Array, options: unknown) => {
          if (failing.upload) return { data: null, error: { message: 'upload failed' } };
          uploads.push({ bucket, path, bytes, options });
          return { data: { path }, error: null };
        },
        remove: async (path: string) => {
          removes.push({ bucket, path });
          return { data: null, error: null };
        },
      })),
    },
  } as unknown as SupabaseClient;

  return {
    client,
    inserts,
    uploads,
    removes,
    deletedCompanies,
    deletedUsers,
    failInsertOn: (table: string) => {
      failing.table = table;
    },
    failUpload: () => {
      failing.upload = true;
    },
  };
}

let h: Harness;
beforeEach(() => {
  h = makeHarness();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('submitCubanRegistration (spec: pending company + application + auth user + doc)', () => {
  it('creates the full pending application in order', async () => {
    const result = await submitCubanRegistration(h.client, cubanInput, {
      name: 'acreditacion.pdf',
      bytes: pdfBytes,
    });

    expect(result).toEqual({ ok: true, companyId: 'c-1' });

    // 1 — auth user with email confirmation required
    expect(h.client.auth.admin.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'maria@midigital.cu',
        password: 'contrasena-segura',
        email_confirm: false,
      }),
    );

    // 2 — pending company with territory + §6.1 data
    const company = h.inserts['companies']?.[0];
    expect(company).toMatchObject({
      legal_name: 'MiDigital SRL',
      entity_type: 'mipyme',
      status: 'pending',
      province_id: 1,
      municipality_id: 3,
      address: 'Calle 23 #45, Vedado',
      email: 'maria@midigital.cu',
    });

    // 3 — profile binds the auth user to the company (one company = one user)
    expect(h.inserts['profiles']?.[0]).toMatchObject({ id: 'u-1', company_id: 'c-1' });

    // 4 — application snapshot never stores credentials
    const application = h.inserts['registration_applications']?.[0];
    expect(application).toMatchObject({
      company_id: 'c-1',
      applicant_name: 'María Fernández Ruiz',
      applicant_email: 'maria@midigital.cu',
    });
    expect(JSON.stringify(application?.payload)).not.toContain('contrasena');

    // 5 — document goes to the private bucket under company/application path
    expect(h.uploads[0]).toMatchObject({
      bucket: 'verification-docs',
      path: expect.stringMatching(/^c-1\/a-1\//),
    });
    expect(h.inserts['verification_documents']?.[0]).toMatchObject({
      application_id: 'a-1',
      mime: 'application/pdf',
      size_bytes: pdfBytes.length,
    });
  });

  it('rejects an invalid document before touching auth (magic bytes)', async () => {
    const result = await submitCubanRegistration(h.client, cubanInput, {
      name: 'falso.txt',
      bytes: textBytes,
    });
    expect(result).toEqual({
      ok: false,
      field: 'document',
      message: 'El formato del documento de acreditación no está admitido.',
    });
    expect(h.client.auth.admin.createUser).not.toHaveBeenCalled();
  });

  it('rejects an oversized document (max 10 MB)', async () => {
    const huge = new Uint8Array(10 * 1024 * 1024 + 1);
    huge.set(new TextEncoder().encode('%PDF-'), 0);
    const result = await submitCubanRegistration(h.client, cubanInput, {
      name: 'grande.pdf',
      bytes: huge,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.field).toBe('document');
      expect(result.message).toContain('10 MB');
    }
    expect(h.client.auth.admin.createUser).not.toHaveBeenCalled();
  });

  it('maps a duplicate auth email to a field error without creating anything', async () => {
    vi.mocked(h.client.auth.admin.createUser).mockResolvedValueOnce({
      data: null,
      error: { status: 422, message: 'A user with this email address has already been registered' },
    } as never);
    const result = await submitCubanRegistration(h.client, cubanInput, {
      name: 'acreditacion.pdf',
      bytes: pdfBytes,
    });
    expect(result).toEqual({
      ok: false,
      field: 'email',
      message: 'Ya existe una cuenta con este email.',
    });
    expect(h.inserts['companies']).toBeUndefined();
  });

  it('detects duplicates by status alone when the message is opaque', async () => {
    vi.mocked(h.client.auth.admin.createUser).mockResolvedValueOnce({
      data: null,
      error: { status: 422, message: 'unexpected constraint' },
    } as never);
    const result = await submitCubanRegistration(h.client, cubanInput, {
      name: 'acreditacion.pdf',
      bytes: pdfBytes,
    });
    expect(result).toMatchObject({ ok: false, field: 'email' });
  });

  it('answers the generic error for a non-duplicate createUser failure', async () => {
    vi.mocked(h.client.auth.admin.createUser).mockResolvedValueOnce({
      data: null,
      error: { status: 500, message: 'auth backend down' },
    } as never);
    const result = await submitCubanRegistration(h.client, cubanInput, {
      name: 'acreditacion.pdf',
      bytes: pdfBytes,
    });
    expect(result).toEqual({
      ok: false,
      message: 'No se pudo registrar la solicitud. Inténtalo de nuevo.',
    });
  });

  it('answers the generic error when createUser succeeds without a user', async () => {
    vi.mocked(h.client.auth.admin.createUser).mockResolvedValueOnce({
      data: { user: null },
      error: null,
    } as never);
    const result = await submitCubanRegistration(h.client, cubanInput, {
      name: 'acreditacion.pdf',
      bytes: pdfBytes,
    });
    expect(result).toEqual({
      ok: false,
      message: 'No se pudo registrar la solicitud. Inténtalo de nuevo.',
    });
    expect(h.inserts['companies']).toBeUndefined();
  });

  it('normalizes unsafe document names and appends the extension when missing', async () => {
    await submitCubanRegistration(h.client, cubanInput, {
      name: 'mi docu mento.pdf',
      bytes: pdfBytes,
    });
    expect(h.uploads[0]?.path).toMatch(/\/mi-docu-mento\.pdf$/);

    await submitCubanRegistration(h.client, cubanInput, {
      name: 'credencial',
      bytes: pdfBytes,
    });
    expect(h.uploads[1]?.path.endsWith('/documento.pdf')).toBe(true);
  });

  it.each([
    ['companies', 'nothing is left behind (no row was created)'],
    ['profiles', 'company + user are rolled back'],
    ['registration_applications', 'company + user are rolled back'],
  ])('rolls the signup back when inserting into %s fails (%s)', async (table, _desc) => {
    h.failInsertOn(table);
    const result = await submitCubanRegistration(h.client, cubanInput, {
      name: 'acreditacion.pdf',
      bytes: pdfBytes,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.field).toBeUndefined();
    expect(h.deletedUsers).toContain('u-1');
    if (table === 'companies') {
      expect(h.deletedCompanies).toEqual([]); // the row never existed
    } else {
      expect(h.deletedCompanies).toContain('c-1');
    }
  });

  it('rolls back and removes the uploaded object when the doc row insert fails', async () => {
    h.failInsertOn('verification_documents');
    const result = await submitCubanRegistration(h.client, cubanInput, {
      name: 'acreditacion.pdf',
      bytes: pdfBytes,
    });
    expect(result.ok).toBe(false);
    expect(h.removes[0]?.bucket).toBe('verification-docs');
    expect(h.deletedUsers).toContain('u-1');
    expect(h.deletedCompanies).toContain('c-1');
  });

  it('rolls back everything when the storage upload fails', async () => {
    h.failUpload();
    const result = await submitCubanRegistration(h.client, cubanInput, {
      name: 'acreditacion.pdf',
      bytes: pdfBytes,
    });
    expect(result.ok).toBe(false);
    expect(h.deletedUsers).toContain('u-1');
    expect(h.deletedCompanies).toContain('c-1');
    expect(h.inserts['verification_documents']).toBeUndefined();
  });
});

describe('submitForeignRegistration (spec: website required, no document)', () => {
  it('creates the pending foreign company with website and no doc upload', async () => {
    const result = await submitForeignRegistration(h.client, foreignInput);
    expect(result).toEqual({ ok: true, companyId: 'c-1' });

    expect(h.inserts['companies']?.[0]).toMatchObject({
      legal_name: 'Acme Trading Ltd.',
      entity_type: 'foreign',
      status: 'pending',
      website: 'https://acme-trading.example.com',
    });
    expect(h.inserts['companies']?.[0]).not.toHaveProperty('province_id');
    expect(h.uploads).toHaveLength(0);
    const payload = h.inserts['registration_applications']?.[0]?.payload as Record<string, unknown>;
    expect(payload).toMatchObject({ country: 'España', website: foreignInput.website });
  });

  it('rolls back on company insert failure', async () => {
    h.failInsertOn('companies');
    const result = await submitForeignRegistration(h.client, foreignInput);
    expect(result.ok).toBe(false);
    expect(h.deletedUsers).toContain('u-1');
  });
});
