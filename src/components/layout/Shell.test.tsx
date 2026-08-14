import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { SearchBar } from '@/components/layout/SearchBar';
import { es } from '@/locales/es';

// next/image in jsdom: render a plain img
vi.mock('next/image', () => ({
  default: (props: { alt?: string } & Record<string, unknown>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={props.alt} {...props} />
  ),
}));

describe('Header', () => {
  it('shows the brand and the five public sections', () => {
    render(<Header />);
    const nav = screen.getByRole('navigation', { name: 'Principal' });
    for (const label of Object.values(es.header.nav)) {
      expect(within(nav).getByRole('link', { name: label })).toBeInTheDocument();
    }
  });

  it('offers login (ghost) and register (primary) actions', () => {
    render(<Header />);
    expect(screen.getByRole('link', { name: es.header.login })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: es.header.register })).toBeInTheDocument();
  });
});

describe('SearchBar (spec search-discovery)', () => {
  it('renders a GET form to /buscar with the exact placeholder and centered field', () => {
    render(<SearchBar />);
    const form = screen.getByRole('search');
    expect(form).toHaveAttribute('action', '/buscar');
    expect(form).toHaveAttribute('method', 'get');

    const input = screen.getByLabelText(es.search.label);
    expect(input).toHaveAttribute('name', 'q');
    expect(input).toHaveAttribute('placeholder', 'Búsqueda general en nexcuba.org');
  });
});

describe('Footer', () => {
  it('renders the four columns with platform and legal links', () => {
    render(<Footer />);
    expect(screen.getByRole('navigation', { name: es.footer.platformTitle })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: es.footer.companyTitle })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: es.footer.legalTitle })).toBeInTheDocument();
    expect(screen.getByText(/© 2026 NexCuba/)).toBeInTheDocument();
  });
});
