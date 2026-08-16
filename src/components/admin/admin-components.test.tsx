import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ActionButton } from '@/components/admin/ActionButton';
import { AdminNav } from '@/components/admin/AdminNav';
import { CrmForm } from '@/components/admin/CrmForm';
import { FilterTabs } from '@/components/admin/FilterTabs';
import { CreateTaxonomyForm, RenameTaxonomyForm } from '@/components/admin/TaxonomyForms';
import { initialAdminActionState, type AdminActionState } from '@/lib/admin/form';
import { es } from '@/locales/es';

type Action = (state: AdminActionState, formData: FormData) => Promise<AdminActionState>;

describe('AdminNav (4.1)', () => {
  it('exposes the eight backoffice sections', () => {
    render(<AdminNav />);
    const nav = screen.getByRole('navigation', { name: es.auth.admin.title });
    for (const label of Object.values(es.auth.admin.nav)) {
      expect(nav).toContainElement(screen.getByRole('link', { name: label }));
    }
    expect(screen.getByRole('link', { name: es.auth.admin.nav.applications })).toHaveAttribute(
      'href',
      '/admin/solicitudes',
    );
  });

  it('marks the current section with aria-current', () => {
    render(<AdminNav currentPath="/admin/solicitudes/x" />);
    const link = screen.getByRole('link', { name: es.auth.admin.nav.applications });
    expect(link).toHaveAttribute('aria-current', 'page');
  });
});

describe('ActionButton', () => {
  it('submits hidden fields to the action and shows its success message', async () => {
    const user = userEvent.setup();
    const action = vi.fn(async (_s: AdminActionState, formData: FormData) => {
      expect(formData.get('id')).toBe('a-1');
      return { status: 'success', message: 'Solicitud aprobada.' };
    });
    render(<ActionButton action={action as Action} fields={{ id: 'a-1' }} label="Aprobar" />);

    await user.click(screen.getByRole('button', { name: 'Aprobar' }));
    expect(await screen.findByText('Solicitud aprobada.')).toBeInTheDocument();
  });

  it('shows the error message from the action', async () => {
    const user = userEvent.setup();
    const action = vi.fn(async () => ({ status: 'error', message: 'Ya fue revisada.' }));
    render(<ActionButton action={action as Action} label="Aprobar" />);
    await user.click(screen.getByRole('button', { name: 'Aprobar' }));
    expect(await screen.findByText('Ya fue revisada.')).toBeInTheDocument();
  });

  it('does not submit when the confirmation is rejected', async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const action = vi.fn(async () => ({ status: 'success' }));
    render(<ActionButton action={action as Action} label="Eliminar" confirmMessage="¿Seguro?" />);
    await user.click(screen.getByRole('button', { name: 'Eliminar' }));
    expect(confirmSpy).toHaveBeenCalledWith('¿Seguro?');
    expect(action).not.toHaveBeenCalled();
  });

  it('renders an optional textarea (rejection reason)', () => {
    render(
      <ActionButton
        action={vi.fn() as Action}
        label="Desaprobar"
        textarea={{ name: 'reason', placeholder: 'Motivo…', minLength: 10 }}
      />,
    );
    const textarea = screen.getByPlaceholderText('Motivo…');
    expect(textarea).toHaveAttribute('name', 'reason');
  });
});

describe('FilterTabs', () => {
  it('renders the options as links, marking the current one', () => {
    render(
      <FilterTabs
        label="Filtro"
        options={[
          { value: 'all', label: 'Todas' },
          { value: 'pending', label: 'Pendientes' },
        ]}
        current="pending"
        hrefFor={(value) => `/admin/solicitudes?estado=${value}`}
      />,
    );
    expect(screen.getByRole('link', { name: 'Todas' })).toHaveAttribute(
      'href',
      '/admin/solicitudes?estado=all',
    );
    expect(screen.getByRole('link', { name: 'Pendientes' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });
});

describe('TaxonomyForms (4.5)', () => {
  it('creates with name (+scope when required)', async () => {
    const user = userEvent.setup();
    const action = vi.fn(async (_s: AdminActionState, formData: FormData) => {
      expect(formData.get('name')).toBe('Turismo');
      expect(formData.get('scope')).toBe('service');
      return { status: 'success' };
    });
    render(<CreateTaxonomyForm action={action as Action} kind="category" withScope />);
    await user.type(screen.getByLabelText(es.auth.admin.taxonomies.name), 'Turismo');
    await user.selectOptions(screen.getByLabelText(es.auth.admin.taxonomies.scope), 'service');
    await user.click(screen.getByRole('button', { name: es.auth.admin.taxonomies.create }));
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('shows the duplicate-name error from the server', async () => {
    const user = userEvent.setup();
    const action = vi.fn(async () => ({
      status: 'error',
      message: 'Ya existe un sector con ese nombre.',
    }));
    render(<CreateTaxonomyForm action={action as Action} kind="sector" />);
    await user.click(screen.getByRole('button', { name: es.auth.admin.taxonomies.create }));
    expect(await screen.findByText('Ya existe un sector con ese nombre.')).toBeInTheDocument();
  });

  it('renames with the current name prefilled', async () => {
    const user = userEvent.setup();
    const action = vi.fn(async (_s: AdminActionState, formData: FormData) => {
      expect(formData.get('id')).toBe('s-1');
      expect(formData.get('name')).toBe('Nuevo nombre');
      return { status: 'success' };
    });
    render(<RenameTaxonomyForm action={action as Action} id="s-1" currentName="Viejo" />);
    const input = screen.getByDisplayValue('Viejo');
    await user.clear(input);
    await user.type(input, 'Nuevo nombre');
    await user.click(screen.getByRole('button', { name: es.auth.admin.taxonomies.saveRename }));
    expect(action).toHaveBeenCalledTimes(1);
  });
});

describe('CrmForm (4.9)', () => {
  it('renders every CRM field and prefills the initial record', () => {
    const f = es.auth.admin.crm.form;
    render(
      <CrmForm
        action={vi.fn() as Action}
        initial={{
          hasWebsite: true,
          hasDomain: false,
          hasCorporateEmail: true,
          hasSocials: false,
          digitalNeeds: 'Tienda online',
          commercialPotential: 'high',
          followupStatus: 'primer contacto',
          notes: 'Nota',
        }}
      />,
    );
    expect((screen.getByLabelText(f.hasWebsite) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText(f.hasDomain) as HTMLInputElement).checked).toBe(false);
    expect(screen.getByLabelText(f.digitalNeeds)).toHaveValue('Tienda online');
    expect(screen.getByLabelText(f.potential)).toHaveValue('high');
    expect(screen.getByLabelText(f.notes)).toHaveValue('Nota');
  });

  it('submits checkbox and select values as the action expects', async () => {
    const user = userEvent.setup();
    const action = vi.fn(async (_s: AdminActionState, formData: FormData) => {
      expect(formData.get('hasWebsite')).toBe('on');
      expect(formData.get('hasDomain')).toBe(null);
      expect(formData.get('commercialPotential')).toBe('medium');
      return { status: 'success', message: 'Guardada.' };
    });
    render(<CrmForm action={action as Action} />);
    await user.click(screen.getByLabelText(es.auth.admin.crm.form.hasWebsite));
    await user.selectOptions(screen.getByLabelText(es.auth.admin.crm.form.potential), 'medium');
    await user.click(screen.getByRole('button', { name: es.auth.admin.crm.form.save }));
    expect(action).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('Guardada.')).toBeInTheDocument();
  });

  it('starts idle', () => {
    expect(initialAdminActionState.status).toBe('idle');
    render(<CrmForm action={vi.fn() as Action} />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
