import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LoginForm } from '@/components/auth/LoginForm';
import { es } from '@/locales/es';

describe('LoginForm', () => {
  it('renders email + password fields and the recovery link', () => {
    render(<LoginForm action={vi.fn()} />);

    expect(screen.getByLabelText(es.auth.login.email)).toBeInTheDocument();
    expect(screen.getByLabelText(es.auth.login.password)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: es.auth.login.forgot })).toHaveAttribute(
      'href',
      '/recuperar',
    );
  });

  it('shows mapped credential errors from the action', async () => {
    const user = userEvent.setup();
    const action = vi.fn(async () => ({
      status: 'error' as const,
      message: 'Email o contraseña incorrectos.',
    }));
    render(<LoginForm action={action} />);

    await user.click(screen.getByRole('button', { name: es.auth.login.submit }));

    expect(await screen.findByText('Email o contraseña incorrectos.')).toBeInTheDocument();
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('renders the pending state label on the submit button', () => {
    render(<LoginForm action={vi.fn()} />);
    expect(screen.getByRole('button', { name: es.auth.login.submit })).toBeInTheDocument();
  });
});
