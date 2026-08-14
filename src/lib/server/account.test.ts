import type { SupabaseClient } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  completePasswordReset,
  requestEmailChange,
  requestPasswordReset,
} from '@/lib/server/account';

function userClient(
  options: {
    email?: string | null;
    updateUserError?: object | null;
    resetError?: object | null;
    exchangeError?: object | null;
  } = {},
): SupabaseClient {
  const {
    email = 'actual@empresa.cu',
    updateUserError = null,
    resetError = null,
    exchangeError = null,
  } = options;
  return {
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: email === null ? null : { id: 'u-1', email } },
        error: null,
      })),
      updateUser: vi.fn(async () => ({ data: { user: {} }, error: updateUserError })),
      resetPasswordForEmail: vi.fn(async () => ({ data: {}, error: resetError })),
      exchangeCodeForSession: vi.fn(async () => ({ data: {}, error: exchangeError })),
    },
  } as unknown as SupabaseClient;
}

function serviceClient(duplicateEmail = false): SupabaseClient {
  return {
    from: vi.fn(() => ({
      select: () => ({
        ilike: () => ({
          limit: async () => ({
            data: duplicateEmail ? [{ id: 'otra-empresa' }] : [],
            error: null,
          }),
        }),
      }),
    })),
  } as unknown as SupabaseClient;
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('requestEmailChange (staged — design.md §3.4)', () => {
  it('rejects an invalid new address', async () => {
    const result = await requestEmailChange(userClient(), serviceClient(), 'no-un-email');
    expect(result).toEqual({ ok: false, field: 'email', message: 'El email no es válido.' });
  });

  it('rejects when there is no session', async () => {
    const result = await requestEmailChange(
      userClient({ email: null }),
      serviceClient(),
      'nuevo@x.cu',
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain('sesión');
  });

  it('rejects when the new address equals the current one (case-insensitive)', async () => {
    const result = await requestEmailChange(userClient(), serviceClient(), 'ACTUAL@empresa.cu');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain('coincide con el actual');
  });

  it('rejects an address already used by another company', async () => {
    const result = await requestEmailChange(userClient(), serviceClient(true), 'tomada@x.cu');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain('Ya existe una empresa');
  });

  it('delegates the staged change to Supabase (confirmation to the NEW address)', async () => {
    const client = userClient();
    const result = await requestEmailChange(client, serviceClient(), 'nuevo@empresa.cu');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.message).toContain('confirmación');
    expect(client.auth.updateUser).toHaveBeenCalledWith({ email: 'nuevo@empresa.cu' });
  });

  it('maps a Supabase duplicate error to the same message', async () => {
    const client = userClient({
      updateUserError: { status: 422, message: 'New email address provided is already used' },
    });
    const result = await requestEmailChange(client, serviceClient(), 'nuevo@empresa.cu');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain('Ya existe una empresa');
  });

  it('answers the generic error for unexpected Supabase failures', async () => {
    const client = userClient({ updateUserError: { status: 500, message: 'boom' } });
    const result = await requestEmailChange(client, serviceClient(), 'nuevo@empresa.cu');
    expect(result).toEqual({
      ok: false,
      message: 'No se pudo iniciar el cambio de email. Inténtalo de nuevo.',
    });
  });

  it('requires a non-empty email', async () => {
    const result = await requestEmailChange(userClient(), serviceClient(), '');
    expect(result).toEqual({ ok: false, field: 'email', message: 'El email es obligatorio.' });
  });
});

describe('requestPasswordReset (Supabase recovery)', () => {
  it('validates the email format', async () => {
    const result = await requestPasswordReset(userClient(), 'mal', 'https://nexcuba.org');
    expect(result).toEqual({ ok: false, field: 'email', message: 'El email no es válido.' });
  });

  it('requires a non-empty email', async () => {
    const result = await requestPasswordReset(userClient(), '', 'https://nexcuba.org');
    expect(result).toEqual({ ok: false, field: 'email', message: 'El email es obligatorio.' });
  });

  it('sends recovery to the reset page and never reveals account existence', async () => {
    const client = userClient();
    const result = await requestPasswordReset(client, 'alguien@x.cu', 'https://nexcuba.org/');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.message).toContain('recuperación');
    expect(client.auth.resetPasswordForEmail).toHaveBeenCalledWith('alguien@x.cu', {
      redirectTo: 'https://nexcuba.org/acceso/reset',
    });
  });

  it('still answers ok when Supabase cannot find the account (anti-enumeration)', async () => {
    const client = userClient({ resetError: { message: 'user not found' } });
    const result = await requestPasswordReset(client, 'nadie@x.cu', 'https://nexcuba.org');
    expect(result.ok).toBe(true);
  });
});

describe('completePasswordReset', () => {
  it('enforces the password policy', async () => {
    const result = await completePasswordReset(userClient(), 'code-123', 'corta');
    expect(result).toEqual({
      ok: false,
      field: 'password',
      message: 'La contraseña debe tener al menos 8 caracteres.',
    });
  });

  it('rejects an expired or invalid recovery link', async () => {
    const result = await completePasswordReset(
      userClient({
        exchangeError: {
          message: 'invalid request: both auth code and code verifier should be non-empty',
        },
      }),
      'code-caducado',
      'nueva-contra-segura',
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain('caducado');
  });

  it('exchanges the code and updates the password', async () => {
    const client = userClient();
    const result = await completePasswordReset(client, 'code-123', 'nueva-contra-segura');
    expect(result.ok).toBe(true);
    expect(client.auth.exchangeCodeForSession).toHaveBeenCalledWith('code-123');
    expect(client.auth.updateUser).toHaveBeenCalledWith({ password: 'nueva-contra-segura' });
  });

  it('reports failure when the password update fails after a valid exchange', async () => {
    const client = userClient({ updateUserError: { status: 500, message: 'boom' } });
    const result = await completePasswordReset(client, 'code-123', 'nueva-contra-segura');
    expect(result).toEqual({
      ok: false,
      message: 'No se pudo actualizar la contraseña. Inténtalo de nuevo.',
    });
  });
});
