import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ActionButton } from '@/components/admin/ActionButton';
import { RenameTaxonomyForm } from '@/components/admin/TaxonomyForms';
import { LoginForm } from '@/components/auth/LoginForm';
import { SelectInput, TextInput, TextareaInput } from '@/components/auth/fields';
import type { AdminActionState } from '@/lib/admin/form';
import { es } from '@/locales/es';

type Action = (state: AdminActionState, formData: FormData) => Promise<AdminActionState>;

/** A pending action we can resolve after asserting, so React cleanup runs. */
function deferredAction(): { action: Action; resolve: (state: AdminActionState) => void } {
  let resolveFn!: (state: AdminActionState) => void;
  const action: Action = () =>
    new Promise<AdminActionState>((settled) => {
      resolveFn = settled;
    });
  return {
    action,
    resolve: (state: AdminActionState) => resolveFn(state),
  };
}

describe('pending states', () => {
  it('LoginForm swaps the button label while the action is in flight', async () => {
    const user = userEvent.setup();
    const { action, resolve } = deferredAction();
    render(<LoginForm action={action as never} />);
    await user.click(screen.getByRole('button', { name: es.auth.login.submit }));
    const pending = await screen.findByRole('button', { name: es.auth.login.submitting });
    expect(pending).toBeDisabled();
    resolve({ status: 'idle' });
  });

  it('ActionButton disables while pending', async () => {
    const user = userEvent.setup();
    const { action, resolve } = deferredAction();
    render(<ActionButton action={action} label="Lento" />);
    await user.click(screen.getByRole('button', { name: 'Lento' }));
    expect(await screen.findByRole('button', { name: 'Lento' })).toBeDisabled();
    resolve({ status: 'idle' });
  });
});

describe('RenameTaxonomyForm error feedback', () => {
  it('shows the rename error without losing the row', async () => {
    const user = userEvent.setup();
    const action = vi.fn(async (): Promise<AdminActionState> => ({
      status: 'error',
      message: 'El nombre es obligatorio.',
    }));
    render(<RenameTaxonomyForm action={action} id="s-1" currentName="Viejo" />);
    await user.click(screen.getByRole('button', { name: es.auth.admin.taxonomies.saveRename }));
    expect(await screen.findByText('El nombre es obligatorio.')).toBeInTheDocument();
  });
});

describe('field primitives (a11y wiring)', () => {
  it('TextInput: hint hides when its error shows; aria-invalid set', () => {
    render(
      <TextInput label="Web" name="website" hint="https://…" error="La página web no es válida." />,
    );
    const input = screen.getByLabelText('Web');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByText('https://…')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('La página web no es válida.');
  });

  it('TextInput: hint is associated when there is no error', () => {
    render(<TextInput label="Teléfono" name="phone" hint="Formato libre" />);
    expect(screen.getByText('Formato libre')).toBeInTheDocument();
    expect(screen.getByLabelText('Teléfono')).toHaveAttribute(
      'aria-describedby',
      expect.stringMatching(/-hint$/),
    );
  });

  it('SelectInput: wires label, hint and error', () => {
    const { rerender } = render(
      <SelectInput label="Provincia" name="provinceId" hint="Obligatoria">
        <option value="1">Pinar</option>
      </SelectInput>,
    );
    expect(screen.getByLabelText('Provincia')).toBeInTheDocument();
    expect(screen.getByText('Obligatoria')).toBeInTheDocument();

    rerender(
      <SelectInput label="Provincia" name="provinceId" error="La provincia es obligatoria.">
        <option value="">—</option>
      </SelectInput>,
    );
    expect(screen.getByLabelText('Provincia')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('La provincia es obligatoria.');
  });

  it('TextareaInput: wires label and error', () => {
    render(<TextareaInput label="Notas" name="notes" error="Demasiado largo" />);
    expect(screen.getByLabelText('Notas')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Demasiado largo');
  });
});
