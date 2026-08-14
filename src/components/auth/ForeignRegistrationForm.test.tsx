import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ForeignRegistrationForm } from '@/components/auth/ForeignRegistrationForm';
import { es } from '@/locales/es';

describe('ForeignRegistrationForm (spec: website required, no document)', () => {
  it('collects applicant, company, website and credentials — no document upload', () => {
    render(<ForeignRegistrationForm action={vi.fn()} />);

    for (const label of [
      es.auth.register.applicantFirstName,
      es.auth.register.applicantLastName,
      es.auth.register.email,
      es.auth.register.phone,
      es.auth.register.companyName,
      es.auth.register.country,
      es.auth.register.website,
      es.auth.register.password,
      es.auth.register.confirmPassword,
    ]) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
    expect(screen.queryByLabelText(es.auth.register.document)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(es.auth.register.province)).not.toBeInTheDocument();
    const website = screen.getByLabelText(es.auth.register.website) as HTMLInputElement;
    expect(website.required).toBe(true);
  });

  it('shows the missing-website validation error from the server', async () => {
    const user = userEvent.setup();
    const action = vi.fn(async () => ({
      status: 'error' as const,
      message: es.auth.register.reviewFields,
      fields: { website: 'La página web es obligatoria.' },
    }));
    render(<ForeignRegistrationForm action={action} />);

    await user.click(screen.getByRole('button', { name: es.auth.register.submit }));

    expect(await screen.findByText('La página web es obligatoria.')).toBeInTheDocument();
    expect(screen.getByText(es.auth.register.reviewFields)).toBeInTheDocument();
  });

  it('hides the website hint while its error is shown', async () => {
    const user = userEvent.setup();
    const action = vi.fn(async () => ({
      status: 'error' as const,
      fields: { website: 'La página web no es válida.' },
    }));
    render(<ForeignRegistrationForm action={action} />);

    await user.click(screen.getByRole('button', { name: es.auth.register.submit }));

    expect(await screen.findByText('La página web no es válida.')).toBeInTheDocument();
    expect(screen.queryByText(es.auth.register.websiteHint)).not.toBeInTheDocument();
  });

  it('renders the pending-review confirmation on success', async () => {
    const user = userEvent.setup();
    const action = vi.fn(async () => ({ status: 'success' as const }));
    render(<ForeignRegistrationForm action={action} />);

    await user.click(screen.getByRole('button', { name: es.auth.register.submit }));

    expect(await screen.findByText(es.auth.register.successTitle)).toBeInTheDocument();
  });
});
