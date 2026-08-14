import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { initialAuthFormState, zodFieldErrors } from '@/lib/auth/form-state';

describe('zodFieldErrors', () => {
  it('maps each field to its first error message', () => {
    const schema = z.object({
      email: z.string().min(1, 'El email es obligatorio.').email('El email no es válido.'),
      phone: z.string().min(3, 'El teléfono no es válido.'),
    });
    const result = schema.safeParse({ email: '', phone: 'a' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(zodFieldErrors(result.error)).toEqual({
        email: 'El email es obligatorio.',
        phone: 'El teléfono no es válido.',
      });
    }
  });

  it('keeps the first message when a field has several issues', () => {
    const schema = z.object({ email: z.string().min(1, 'uno').email('dos') });
    const result = schema.safeParse({ email: 'xxx' });
    if (!result.success) {
      expect(zodFieldErrors(result.error).email).toBe('dos'); // min(1) passes, email fails
    }
    const empty = schema.safeParse({ email: '' });
    if (!empty.success) {
      expect(zodFieldErrors(empty.error).email).toBe('uno');
    }
  });
});

describe('initialAuthFormState', () => {
  it('starts idle with no message', () => {
    expect(initialAuthFormState).toEqual({ status: 'idle' });
  });
});
