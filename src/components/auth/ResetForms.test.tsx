import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';
import { ResetRequestForm } from '@/components/auth/ResetRequestForm';
import { es } from '@/locales/es';

describe('ResetRequestForm (/recuperar)', () => {
  it('collects the email and submits', async () => {
    const user = userEvent.setup();
    const action = vi.fn(async () => ({
      status: 'success' as const,
      message: 'Si el email está registrado, recibirás un enlace de recuperación de contraseña.',
    }));
    render(<ResetRequestForm action={action} />);

    const email = screen.getByLabelText(es.auth.login.email);
    await user.type(email, 'alguien@empresa.cu');
    await user.click(screen.getByRole('button', { name: es.auth.recover.submit }));

    expect(await screen.findByText(/^Si el email está registrado/)).toBeInTheDocument();
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('shows the invalid-email field error', async () => {
    const user = userEvent.setup();
    const action = vi.fn(async () => ({
      status: 'error' as const,
      fields: { email: 'El email no es válido.' },
    }));
    render(<ResetRequestForm action={action} />);
    await user.click(screen.getByRole('button', { name: es.auth.recover.submit }));
    expect(await screen.findByText('El email no es válido.')).toBeInTheDocument();
  });
});

describe('ResetPasswordForm (/acceso/reset)', () => {
  it('carries the recovery code in a hidden input', () => {
    render(<ResetPasswordForm action={vi.fn()} code="code-abc-123" />);
    const hidden = document.querySelector('input[name="code"]') as HTMLInputElement;
    expect(hidden.type).toBe('hidden');
    expect(hidden.value).toBe('code-abc-123');
  });

  it('asks for the new password twice', () => {
    render(<ResetPasswordForm action={vi.fn()} code="code-abc-123" />);
    expect(screen.getAllByLabelText('Contraseña', { exact: true })).toHaveLength(1);
    expect(screen.getByLabelText('Confirmar contraseña')).toBeInTheDocument();
  });

  it('reports the mismatch error returned by the action', async () => {
    const user = userEvent.setup();
    const action = vi.fn(async () => ({
      status: 'error' as const,
      fields: { confirmPassword: es.auth.reset.mismatch },
    }));
    render(<ResetPasswordForm action={action} code="c" />);
    await user.click(screen.getByRole('button', { name: es.auth.reset.submit }));
    expect(await screen.findByText(es.auth.reset.mismatch)).toBeInTheDocument();
  });

  it('shows the confirmation message on success', async () => {
    const user = userEvent.setup();
    const action = vi.fn(async () => ({
      status: 'success' as const,
      message: 'Tu contraseña ha sido actualizada. Ya puedes iniciar sesión.',
    }));
    render(<ResetPasswordForm action={action} code="c" />);
    await user.click(screen.getByRole('button', { name: es.auth.reset.submit }));
    expect(await screen.findByText(/^Tu contraseña ha sido actualizada/)).toBeInTheDocument();
  });
});
