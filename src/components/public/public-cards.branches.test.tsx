import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CompanyCard } from '@/components/public/CompanyCard';
import { ContentCard } from '@/components/public/ContentCard';
import type { PublicCompanyCard, PublicContentItem } from '@/lib/public/queries';
import { es } from '@/locales/es';

const full: PublicCompanyCard = {
  id: 'c-1',
  slug: 'x',
  name: 'X',
  entityType: 'mipyme',
  description: 'Desc',
  logoUrl: 'https://media.example/media/c-1/logo.jpg',
  municipalityName: 'La Habana',
  provinceName: 'La Habana',
  sectorNames: ['S1'],
  createdAt: '2026-01-01T00:00:00Z',
};

describe('CompanyCard branch coverage', () => {
  it('renders the logo image when present', () => {
    const { container } = render(<CompanyCard company={full} />);
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    // next/image serves the CDN-transformed URL through the optimizer.
    const src = img?.getAttribute('src');
    expect(src).toContain(
      encodeURIComponent(
        'https://media.example/media/c-1/logo.jpg?width=96&height=96&resize=cover&quality=80',
      ),
    );
  });

  it('hides description/sector blocks and falls back on empty fields', () => {
    render(
      <CompanyCard
        company={{
          ...full,
          description: null,
          sectorNames: [],
          municipalityName: null,
          provinceName: null,
          entityType: 'desconocido',
        }}
        productsCount={0}
      />,
    );
    expect(screen.queryByText('Desc')).not.toBeInTheDocument();
    expect(screen.queryByText('S1')).not.toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument(); // empty location
    expect(screen.getByText('desconocido')).toBeInTheDocument(); // unknown type fallback
    expect(screen.queryByText(/productos/)).not.toBeInTheDocument(); // zero products
  });

  it('caps the number of sector chips at three', () => {
    render(<CompanyCard company={{ ...full, sectorNames: ['S1', 'S2', 'S3', 'S4', 'S5'] }} />);
    expect(screen.getByText('S1')).toBeInTheDocument();
    expect(screen.getByText('S3')).toBeInTheDocument();
    expect(screen.queryByText('S4')).not.toBeInTheDocument();
  });
});

const item: PublicContentItem = {
  id: 'i-1',
  name: 'Ítem',
  description: 'Desc',
  createdAt: '2026-01-01T00:00:00Z',
  companyName: 'Empresa',
  companySlug: 'empresa',
  detail: '',
  categoryName: null,
};

describe('ContentCard branch coverage', () => {
  it('renders no badge when the section has no detail/category', () => {
    const { container } = render(<ContentCard item={item} type="products" />);
    expect(container.querySelector('span.rounded-full')).toBeNull();
  });

  it('falls back to the raw detail when the label is unknown', () => {
    render(<ContentCard item={{ ...item, detail: 'cobertura-rara' }} type="services" />);
    expect(screen.getByText('cobertura-rara')).toBeInTheDocument();
    render(<ContentCard item={{ ...item, detail: 'tipo-raro' }} type="opportunities" />);
    expect(screen.getByText('tipo-raro')).toBeInTheDocument();
  });

  it('renders without description', () => {
    render(<ContentCard item={{ ...item, description: null, detail: 'local' }} type="services" />);
    expect(screen.getByText(es.public.content.coverage.local)).toBeInTheDocument();
  });

  it('projects without status show no badge', () => {
    const { container } = render(<ContentCard item={item} type="projects" />);
    expect(container.querySelector('span.rounded-full')).toBeNull();
  });
});
