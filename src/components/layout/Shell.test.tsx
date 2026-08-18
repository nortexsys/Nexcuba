import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

  it('opens and closes the mobile menu with the burger button', async () => {
    const user = userEvent.setup();
    render(<Header />);

    const open = screen.getByRole('button', { name: es.header.openMenu });
    await user.click(open);

    const mobileNav = screen.getByRole('navigation', { name: 'Menú de navegación' });
    for (const label of Object.values(es.header.nav)) {
      expect(within(mobileNav).getByRole('link', { name: label })).toBeInTheDocument();
    }
    expect(within(mobileNav).getByRole('link', { name: es.header.login })).toBeInTheDocument();
    expect(within(mobileNav).getByRole('link', { name: es.header.register })).toBeInTheDocument();

    // A nav link closes the menu (aria-expanded flips back).
    await user.click(within(mobileNav).getByRole('link', { name: es.header.nav.companies }));
    expect(screen.queryByRole('navigation', { name: 'Menú de navegación' })).not.toBeInTheDocument();

    // Reopen and close explicitly with the X button.
    await user.click(screen.getByRole('button', { name: es.header.openMenu }));
    await user.click(screen.getByRole('button', { name: es.header.closeMenu }));
    expect(screen.queryByRole('navigation', { name: 'Menú de navegación' })).not.toBeInTheDocument();
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
