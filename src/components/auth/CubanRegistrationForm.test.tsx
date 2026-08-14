import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CubanRegistrationForm } from '@/components/auth/CubanRegistrationForm';
import { initialAuthFormState } from '@/lib/auth/form-state';
import { es } from '@/locales/es';

const provinces = [
  { id: 1, name: 'Pinar del Río' },
  { id: 2, name: 'Artemisa' },
];
const municipalities = [
  { id: 1, provinceId: 1, name: 'Pinar del Río' },
  { id: 2, provinceId: 1, name: 'Consolación del Sur' },
  { id: 12, provinceId: 2, name: 'Artemisa' },
];

const props = {
  provinces,
  municipalities,
};

describe('CubanRegistrationForm (spec company-registration §registro cubano)', () => {
  it('renders every §6.1 field plus access credentials', () => {
    render(<CubanRegistrationForm action={vi.fn()} {...props} />);

    const labels = [
      es.auth.register.applicantFirstName,
      es.auth.register.applicantLastName,
      es.auth.register.email,
      es.auth.register.phone,
      es.auth.register.companyName,
      es.auth.register.province,
      es.auth.register.municipality,
      es.auth.register.address,
      es.auth.register.extraIdData,
      es.auth.register.password,
      es.auth.register.confirmPassword,
    ];
    for (const label of labels) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }

    const entity = screen.getByLabelText(es.auth.register.entityType) as HTMLSelectElement;
    expect(within(entity).getByRole('option', { name: 'MIPYME' })).toBeInTheDocument();
    expect(within(entity).getByRole('option', { name: 'Cooperativa' })).toBeInTheDocument();

    const document = screen.getByLabelText(es.auth.register.document) as HTMLInputElement;
    expect(document.type).toBe('file');
    expect(document.getAttribute('accept')).toContain('pdf');
  });

  it('offers only the municipalities of the chosen province', async () => {
    const user = userEvent.setup();
    render(<CubanRegistrationForm action={vi.fn()} {...props} />);

    const province = screen.getByLabelText(es.auth.register.province);
    await user.selectOptions(province, '1');

    const municipality = screen.getByLabelText(es.auth.register.municipality) as HTMLSelectElement;
    const options = within(municipality).getAllByRole('option');
    expect(options.map((option) => option.textContent)).toEqual([
      '—',
      'Pinar del Río',
      'Consolación del Sur',
    ]);
  });

  it('shows the server field errors after submitting', async () => {
    const user = userEvent.setup();
    const action = vi.fn(async () => ({
      status: 'error' as const,
      message: es.auth.register.reviewFields,
      fields: { email: 'El email no es válido.', document: 'El formato no está admitido.' },
    }));
    render(<CubanRegistrationForm action={action} {...props} />);

    await user.click(screen.getByRole('button', { name: es.auth.register.submit }));

    expect(await screen.findByText('El email no es válido.')).toBeInTheDocument();
    expect(await screen.findByText('El formato no está admitido.')).toBeInTheDocument();
    expect(screen.getByText(es.auth.register.reviewFields)).toBeInTheDocument();
    expect(screen.getByLabelText(es.auth.register.email)).toHaveAttribute('aria-invalid', 'true');
  });

  it('replaces the form with the pending-review confirmation on success', async () => {
    const user = userEvent.setup();
    const action = vi.fn(async () => ({ status: 'success' as const }));
    render(<CubanRegistrationForm action={action} {...props} />);

    await user.click(screen.getByRole('button', { name: es.auth.register.submit }));

    expect(await screen.findByText(es.auth.register.successTitle)).toBeInTheDocument();
    expect(screen.getByText(es.auth.register.successBody)).toBeInTheDocument();
    expect(screen.queryByLabelText(es.auth.register.email)).not.toBeInTheDocument();
  });

  it('starts idle with no error shown', () => {
    render(<CubanRegistrationForm action={vi.fn()} {...props} />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(initialAuthFormState.status).toBe('idle');
  });
});
