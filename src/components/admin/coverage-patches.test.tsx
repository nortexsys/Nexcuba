import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ActionButton } from '@/components/admin/ActionButton';
import { CreateTaxonomyForm } from '@/components/admin/TaxonomyForms';
import { LoginForm } from '@/components/auth/LoginForm';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';
import { ResetRequestForm } from '@/components/auth/ResetRequestForm';
import { zodFieldErrors } from '@/lib/auth/form-state';
import type { AdminActionState } from '@/lib/admin/form';
import { es } from '@/locales/es';
import { z } from 'zod';

/** Small branch-closing battery for message-optional states. */
describe('message-optional states', () => {
  it('ActionButton: success/error without message render no paragraph', async () => {
    const user = userEvent.setup();
    const success: AdminActionState = { status: 'success' };
    const { rerender } = render(
      <ActionButton action={vi.fn(async () => success)} label="Ok" compact danger />,
    );
    await user.click(screen.getByRole('button', { name: 'Ok' }));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    const error: AdminActionState = { status: 'error' };
    rerender(<ActionButton action={vi.fn(async () => error)} label="Mal" />);
    await user.click(screen.getByRole('button', { name: 'Mal' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('LoginForm surfaces field errors with aria-invalid', async () => {
    const user = userEvent.setup();
    const action = vi.fn(async () => ({
      status: 'error' as const,
      fields: { email: 'El email no es válido.' },
    }));
    render(<LoginForm action={action} />);
    await user.click(screen.getByRole('button', { name: es.auth.login.submit }));
    expect(await screen.findByText('El email no es válido.')).toBeInTheDocument();
    expect(screen.getByLabelText(es.auth.login.email)).toHaveAttribute('aria-invalid', 'true');
  });

  it('ResetRequestForm: error without message shows nothing extra', async () => {
    const user = userEvent.setup();
    render(<ResetRequestForm action={vi.fn(async () => ({ status: 'error' as const }))} />);
    await user.click(screen.getByRole('button', { name: es.auth.recover.submit }));
    expect(await screen.findByRole('button', { name: es.auth.recover.submit })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('ResetPasswordForm: success without message stays silent', async () => {
    const user = userEvent.setup();
    render(
      <ResetPasswordForm action={vi.fn(async () => ({ status: 'success' as const }))} code="c" />,
    );
    await user.click(screen.getByRole('button', { name: es.auth.reset.submit }));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('CreateTaxonomyForm renders the success message with status role', async () => {
    const user = userEvent.setup();
    render(
      <CreateTaxonomyForm
        action={vi.fn(async (): Promise<AdminActionState> => ({
          status: 'success',
          message: es.auth.admin.taxonomies.saved,
        }))}
        kind="sector"
      />,
    );
    await user.click(screen.getByRole('button', { name: es.auth.admin.taxonomies.create }));
    expect(await screen.findByText(es.auth.admin.taxonomies.saved)).toBeInTheDocument();
  });
});

describe('zodFieldErrors root path', () => {
  it('uses the "_" bucket for object-level refinements', () => {
    const schema = z
      .object({ a: z.string() })
      .refine((value) => value.a === 'ok', { message: 'global' });
    const result = schema.safeParse({ a: 'no' });
    if (!result.success) {
      expect(zodFieldErrors(result.error)).toEqual({ _: 'global' });
    }
  });
});
