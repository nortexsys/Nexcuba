import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { CompanyCard } from '@/components/public/CompanyCard';
import { ContentCard } from '@/components/public/ContentCard';
import { DualListing } from '@/components/public/DualListing';
import type { PublicCompanyCard, PublicContentItem } from '@/lib/public/queries';
import { es } from '@/locales/es';

// jsdom has no matchMedia; the preference hook falls back safely.
beforeAll(() => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  );
});
afterEach(() => {
  window.sessionStorage.clear();
  vi.restoreAllMocks();
});

const company: PublicCompanyCard = {
  id: 'c-1',
  slug: 'cafe-de-altura',
  name: 'Café de Altura',
  entityType: 'mipyme',
  description: 'Tostamos café de altura en Pinar del Río con trazabilidad completa del grano.',
  logoUrl: null,
  municipalityName: 'Pinar del Río',
  provinceName: 'Pinar del Río',
  sectorNames: ['Café y Cacao', 'Alimentos'],
  createdAt: '2026-01-15T00:00:00Z',
};

describe('CompanyCard (5.2)', () => {
  it('shows name, verified badge, sectors, location, stats and ficha link', () => {
    render(<CompanyCard company={company} productsCount={3} />);

    expect(screen.getByRole('heading', { name: 'Café de Altura' })).toBeInTheDocument();
    const link = screen.getByRole('link', { name: 'Café de Altura' });
    expect(link).toHaveAttribute('href', '/empresas/cafe-de-altura');
    expect(screen.getByText(es.common.verified)).toBeInTheDocument();
    expect(screen.getByText('Café y Cacao')).toBeInTheDocument();
    expect(screen.getByText('Pinar del Río, Pinar del Río')).toBeInTheDocument();
    expect(screen.getByText(/desde 2026/i)).toBeInTheDocument();
    expect(screen.getByText(/3 productos/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: es.public.directory.viewProfile })).toHaveAttribute(
      'href',
      '/empresas/cafe-de-altura',
    );
  });

  it('falls back to an initial placeholder without logo', () => {
    render(<CompanyCard company={company} />);
    expect(screen.getByText('C')).toBeInTheDocument(); // avatar initial
  });
});

describe('ContentCard (5.4)', () => {
  const item: PublicContentItem = {
    id: 'p-1',
    name: 'Café molido 500 g',
    description: 'Molienda fina.',
    createdAt: '2026-02-01T00:00:00Z',
    companyName: 'Café de Altura',
    companySlug: 'cafe-de-altura',
    detail: '',
    categoryName: 'Alimentos',
  };

  it('shows the product with its category and company link', () => {
    render(<ContentCard item={item} type="products" />);
    expect(screen.getByText('Café molido 500 g')).toBeInTheDocument();
    expect(screen.getByText('Alimentos')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Café de Altura' })).toHaveAttribute(
      'href',
      '/empresas/cafe-de-altura',
    );
  });

  it('labels coverage for services and opportunity type for opportunities', () => {
    render(
      <ContentCard item={{ ...item, detail: 'national', categoryName: null }} type="services" />,
    );
    expect(screen.getByText(es.public.content.coverage.national)).toBeInTheDocument();

    render(
      <ContentCard
        item={{ ...item, detail: 'financiacion', categoryName: null }}
        type="opportunities"
      />,
    );
    expect(screen.getByText(es.public.content.opportunityType.financiacion)).toBeInTheDocument();
  });

  it('labels the project status', () => {
    render(<ContentCard item={{ ...item, detail: 'En ejecución' }} type="projects" />);
    expect(
      screen.getByText(`${es.public.content.projectStatus}: En ejecución`),
    ).toBeInTheDocument();
  });
});

describe('DualListing (D-5)', () => {
  it('renders the cards layout by default and switches to the table', async () => {
    const user = userEvent.setup();
    render(
      <DualListing
        sectionKey="empresas"
        cards={<div>VISTA-TARJETAS</div>}
        table={<div>VISTA-TABLA</div>}
      />,
    );

    expect(screen.getByText('VISTA-TARJETAS')).toBeInTheDocument();
    expect(screen.queryByText('VISTA-TABLA')).not.toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: new RegExp(es.common.viewToggle.table) }));
    expect(await screen.findByText('VISTA-TABLA')).toBeInTheDocument();
    expect(screen.queryByText('VISTA-TARJETAS')).not.toBeInTheDocument();
  });

  it('remembers the choice for the section during the session', async () => {
    const user = userEvent.setup();
    const { unmount } = render(
      <DualListing sectionKey="productos" cards={<div>TARJETAS</div>} table={<div>TABLA</div>} />,
    );
    await user.click(screen.getByRole('radio', { name: new RegExp(es.common.viewToggle.table) }));
    unmount();

    render(
      <DualListing sectionKey="productos" cards={<div>TARJETAS</div>} table={<div>TABLA</div>} />,
    );
    expect(await screen.findByText('TABLA')).toBeInTheDocument();
    expect(screen.queryByText('TARJETAS')).not.toBeInTheDocument();
  });
});
