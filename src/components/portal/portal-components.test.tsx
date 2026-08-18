import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PortalNav } from '@/components/portal/PortalNav';
import { ProfileForm } from '@/components/portal/ProfileForm';
import { GalleryManager } from '@/components/portal/GalleryManager';
import { ContentManager } from '@/components/portal/ContentManager';
import { EmailChangeForm, PasswordForm } from '@/components/portal/AccountForms';
import { AcceptContactRequestButton } from '@/components/portal/AcceptContactRequestButton';
import { ContactRequestForm } from '@/components/portal/ContactRequestForm';
import { MarkNotificationsRead } from '@/components/portal/MarkNotificationsRead';
import { initialAdminActionState, type AdminActionState } from '@/lib/admin/form';
import { es } from '@/locales/es';

type Action = (state: AdminActionState, formData: FormData) => Promise<AdminActionState>;

const idleAction: Action = async () => initialAdminActionState;

const c = es.auth.portal;

describe('PortalNav (6.1)', () => {
  it('exposes the nine portal sections with Spanish routes', () => {
    render(<PortalNav />);
    const nav = screen.getByRole('navigation', { name: es.auth.portal.title });
    const entries = Object.entries(c.nav);
    expect(entries).toHaveLength(9);
    for (const [, label] of entries) {
      expect(nav).toContainElement(screen.getByRole('link', { name: label }));
    }
    expect(screen.getByRole('link', { name: c.nav.products })).toHaveAttribute(
      'href',
      '/portal/productos',
    );
    expect(screen.getByRole('link', { name: c.nav.settings })).toHaveAttribute(
      'href',
      '/portal/configuracion',
    );
  });

  it('marks the current section with aria-current', () => {
    render(<PortalNav currentPath="/portal/empresa" />);
    expect(screen.getByRole('link', { name: c.nav.company })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });
});

describe('ProfileForm (6.2)', () => {
  const baseProps = {
    profile: {
      displayName: 'Portal',
      description: 'Desc',
      phone: '+53 5 000 0000',
      website: 'https://portal.cu',
      address: 'Calle 1',
      provinceId: 1,
      municipalityId: 3,
      socials: [{ platform: 'instagram', url: 'https://instagram.com/portal' }],
      sectorIds: ['s-1'],
    },
    provinces: [
      { id: 1, name: 'La Habana' },
      { id: 2, name: 'Matanzas' },
    ],
    municipalities: [
      { id: 3, name: 'Playa', provinceId: 1 },
      { id: 4, name: 'Centro Habana', provinceId: 1 },
      { id: 5, name: 'Cárdenas', provinceId: 2 },
    ],
    sectors: [
      { id: 's-1', name: 'Turismo' },
      { id: 's-2', name: 'Alimentación' },
    ],
  };

  it('prefills fields and filters municipalities by province', () => {
    render(<ProfileForm action={idleAction} {...baseProps} />);
    expect(screen.getByLabelText(c.company.displayName)).toHaveValue('Portal');
    const municipality = screen.getByLabelText(c.company.municipality) as HTMLSelectElement;
    const options = within(municipality).getAllByRole('option');
    expect(options.map((option) => option.textContent)).toEqual([
      c.company.municipalityEmpty,
      'Playa',
      'Centro Habana',
    ]);
  });

  it('submits profile fields, sectors and social rows', async () => {
    const user = userEvent.setup();
    const action = vi.fn(async (_s: AdminActionState, formData: FormData) => {
      expect(formData.get('displayName')).toBe('Portal Renovado');
      expect(formData.getAll('sector')).toEqual(['s-1', 's-2']);
      expect(formData.getAll('socialPlatform')).toEqual(['instagram', 'facebook']);
      return initialAdminActionState;
    }) as unknown as Action;
    render(<ProfileForm action={action} {...baseProps} />);

    await user.clear(screen.getByLabelText(c.company.displayName));
    await user.type(screen.getByLabelText(c.company.displayName), 'Portal Renovado');
    await user.click(screen.getByRole('checkbox', { name: 'Alimentación' }));
    await user.click(screen.getByRole('button', { name: `+ ${c.company.addSocial}` }));
    await user.type(screen.getAllByLabelText(c.company.socialPlatform)[1]!, 'facebook');
    await user.type(screen.getAllByLabelText(c.company.socialUrl)[1]!, 'https://facebook.com/x');
    await user.click(screen.getByRole('button', { name: c.company.save }));
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('adds and removes social rows', async () => {
    const user = userEvent.setup();
    render(<ProfileForm action={idleAction} {...baseProps} />);
    expect(screen.getAllByLabelText(c.company.socialPlatform)).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: `+ ${c.company.addSocial}` }));
    expect(screen.getAllByLabelText(c.company.socialPlatform)).toHaveLength(2);
    await user.click(screen.getAllByRole('button', { name: c.company.removeSocial })[0]!);
    expect(screen.getAllByLabelText(c.company.socialPlatform)).toHaveLength(1);
  });

  it('shows the action error message', async () => {
    const user = userEvent.setup();
    const action = vi.fn(async () => ({
      status: 'error',
      message: 'El municipio no pertenece a la provincia.',
    })) as unknown as Action;
    render(<ProfileForm action={action} {...baseProps} />);
    await user.click(screen.getByRole('button', { name: c.company.save }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El municipio no pertenece a la provincia.',
    );
  });
});

describe('GalleryManager (6.2)', () => {
  const images = [{ id: 'i-1', url: 'https://media.example/media/a.jpg', alt: 'Logo' }];

  it('renders thumbnails and uploads with alt', async () => {
    const user = userEvent.setup();
    const uploadAction = vi.fn(async (_s: AdminActionState, formData: FormData) => {
      // jsdom + React 19 actions rebuild FormData: the File arrives with an
      // empty name — asserting the wiring (field presence), not the payload.
      expect(formData.get('file')).toBeInstanceOf(File);
      expect(formData.get('alt')).toBe('Local');
      return initialAdminActionState;
    }) as unknown as Action;
    render(
      <GalleryManager uploadAction={uploadAction} removeAction={idleAction} images={images} />,
    );

    expect(screen.getByRole('img', { name: 'Logo' })).toHaveAttribute(
      'src',
      'https://media.example/media/a.jpg?width=480&resize=cover&quality=80',
    );
    await user.upload(
      screen.getByLabelText(c.gallery.add),
      new File(['x'], 'foto.jpg', { type: 'image/jpeg' }),
    );
    await user.type(screen.getByPlaceholderText(c.gallery.altPlaceholder), 'Local');
    await user.click(screen.getByRole('button', { name: c.gallery.add }));
    expect(uploadAction).toHaveBeenCalledTimes(1);
  });

  it('shows the empty state without images', () => {
    render(<GalleryManager uploadAction={idleAction} removeAction={idleAction} images={[]} />);
    expect(screen.getByText(c.gallery.empty)).toBeInTheDocument();
  });
});

describe('ContentManager (6.3)', () => {
  const item = {
    id: 'p-1',
    name: 'Miel de abejas',
    description: '500 g',
    categoryId: 'cat-1',
    coverage: null as string | null,
    statusLabel: null as string | null,
    needs: null as string | null,
    location: null as string | null,
    opportunityType: null as string | null,
    createdAt: '2026-01-01',
    tagNames: ['Cacao'],
    images: [{ id: 'i-1', url: 'https://media.example/media/a.jpg', alt: null }],
  };

  const props = {
    type: 'products' as const,
    items: [item],
    categories: [{ id: 'cat-1', name: 'Alimentos' }],
    deleteAction: idleAction,
    addImageAction: idleAction,
    removeImageAction: idleAction,
  };

  it('lists items with detail line and edit affordances', () => {
    render(<ContentManager {...props} saveAction={idleAction} />);
    expect(screen.getByText('Miel de abejas')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: c.content.edit })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: c.content.delete })).toBeInTheDocument();
    expect(screen.queryByText(c.content.empty)).not.toBeInTheDocument();
  });

  it('creates new content through the type-parameterized form', async () => {
    const user = userEvent.setup();
    const saveAction = vi.fn(async (_s: AdminActionState, formData: FormData) => {
      expect(formData.get('type')).toBe('opportunities');
      expect(formData.get('id')).toBe(null);
      expect(formData.get('name')).toBe('Buscamos socio');
      expect(formData.get('opportunityType')).toBe('socio');
      expect(formData.get('tags')).toBe('inversión, agro');
      return initialAdminActionState;
    }) as unknown as Action;
    render(<ContentManager {...props} type="opportunities" items={[]} saveAction={saveAction} />);

    await user.click(screen.getByRole('button', { name: `+ ${c.content.new}` }));
    await user.type(screen.getByLabelText(c.content.form.name), 'Buscamos socio');
    await user.selectOptions(screen.getByLabelText(c.content.form.opportunityType), 'socio');
    await user.type(screen.getByLabelText(c.content.form.tags), 'inversión, agro');
    await user.click(screen.getByRole('button', { name: c.content.form.save }));
    expect(saveAction).toHaveBeenCalledTimes(1);
  });

  it('edits an item: hidden id, prefilled tags and the image manager', async () => {
    const user = userEvent.setup();
    const saveAction = vi.fn(async (_s: AdminActionState, formData: FormData) => {
      expect(formData.get('id')).toBe('p-1');
      expect(formData.get('name')).toBe('Miel Premium');
      return initialAdminActionState;
    }) as unknown as Action;
    render(<ContentManager {...props} saveAction={saveAction} />);

    await user.click(screen.getByRole('button', { name: c.content.edit }));
    expect(screen.getByLabelText(c.content.form.name)).toHaveValue('Miel de abejas');
    expect(screen.getByLabelText(c.content.form.tags)).toHaveValue('Cacao');
    expect(screen.getByText(c.content.form.images)).toBeInTheDocument();
    await user.clear(screen.getByLabelText(c.content.form.name));
    await user.type(screen.getByLabelText(c.content.form.name), 'Miel Premium');
    await user.click(screen.getByRole('button', { name: c.content.form.save }));
    expect(saveAction).toHaveBeenCalledTimes(1);
  });

  it('does not delete without confirmation', async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const deleteAction = vi.fn(async () => initialAdminActionState) as unknown as Action;
    render(<ContentManager {...props} saveAction={idleAction} deleteAction={deleteAction} />);

    await user.click(screen.getByRole('button', { name: c.content.delete }));
    expect(confirmSpy).toHaveBeenCalledWith(c.content.confirmDelete);
    expect(deleteAction).not.toHaveBeenCalled();
  });
});

describe('ContactRequestForm (8.1)', () => {
  it('submits subject, message and the hidden target slug', async () => {
    const user = userEvent.setup();
    const action = vi.fn(async (_s: AdminActionState, formData: FormData) => {
      expect(formData.get('targetSlug')).toBe('mihotel');
      expect(formData.get('subject')).toBe('Colaboración');
      expect(formData.get('message')).toBe('Hola, queremos colaborar.');
      return { status: 'success', message: es.auth.portal.networking.requestSent };
    }) as unknown as Action;
    render(<ContactRequestForm action={action} targetSlug="mihotel" />);

    await user.type(screen.getByLabelText(c.networking.subject), 'Colaboración');
    await user.type(screen.getByLabelText(c.networking.message), 'Hola, queremos colaborar.');
    await user.click(screen.getByRole('button', { name: c.networking.send }));
    expect(action).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(es.auth.portal.networking.requestSent)).toBeInTheDocument();
  });

  it('shows the action error message', async () => {
    const user = userEvent.setup();
    const action = vi.fn(async () => ({
      status: 'error',
      message: 'Ya tienes una solicitud pendiente hacia esta empresa.',
    })) as unknown as Action;
    render(<ContactRequestForm action={action} targetSlug="mihotel" />);
    await user.click(screen.getByRole('button', { name: c.networking.send }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Ya tienes una solicitud pendiente hacia esta empresa.',
    );
  });
});

describe('AcceptContactRequestButton (8.2)', () => {
  it('submits the hidden request id', async () => {
    const user = userEvent.setup();
    const action = vi.fn(async (_s: AdminActionState, formData: FormData) => {
      expect(formData.get('requestId')).toBe('req-1');
      return { status: 'success', message: 'Solicitud de contacto aceptada.' };
    }) as unknown as Action;
    render(<AcceptContactRequestButton action={action} requestId="req-1" />);
    await user.click(screen.getByRole('button', { name: c.networking.accept }));
    expect(action).toHaveBeenCalledTimes(1);
  });
});

describe('MarkNotificationsRead (8.3)', () => {
  it('invokes the action and reflects the disabled state', async () => {
    const user = userEvent.setup();
    const action = vi.fn(async () => ({
      status: 'success',
    })) as unknown as () => Promise<AdminActionState>;
    const { rerender } = render(<MarkNotificationsRead action={action} disabled={false} />);
    await user.click(screen.getByRole('button', { name: c.notifications.markAllRead }));
    expect(action).toHaveBeenCalledTimes(1);

    rerender(<MarkNotificationsRead action={action} disabled={true} />);
    expect(screen.getByRole('button', { name: c.notifications.markAllRead })).toBeDisabled();
  });
});

describe('AccountForms (6.4)', () => {
  it('submits the new email', async () => {
    const user = userEvent.setup();
    const action = vi.fn(async (_s: AdminActionState, formData: FormData) => {
      expect(formData.get('email')).toBe('nueva@portal.cu');
      return { status: 'success', message: 'Enviado.' };
    }) as unknown as Action;
    render(<EmailChangeForm action={action} />);
    await user.type(screen.getByLabelText(c.settings.newEmail), 'nueva@portal.cu');
    await user.click(screen.getByRole('button', { name: c.settings.emailSubmit }));
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('submits password and confirmation', async () => {
    const user = userEvent.setup();
    const action = vi.fn(async (_s: AdminActionState, formData: FormData) => {
      expect(formData.get('password')).toBe('secreto123');
      expect(formData.get('confirm')).toBe('secreto123');
      return { status: 'success', message: 'Tu contraseña ha sido actualizada.' };
    }) as unknown as Action;
    render(<PasswordForm action={action} />);
    await user.type(screen.getByLabelText(c.settings.newPassword), 'secreto123');
    await user.type(screen.getByLabelText(c.settings.confirmPassword), 'secreto123');
    await user.click(screen.getByRole('button', { name: c.settings.passwordSubmit }));
    expect(action).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('Tu contraseña ha sido actualizada.')).toBeInTheDocument();
  });
});
