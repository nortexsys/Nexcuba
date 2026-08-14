import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';

describe('Card', () => {
  it('renders flat card styling: radius-16, border gray-100, white, no shadow', () => {
    render(<Card>Contenido</Card>);
    const card = screen.getByText('Contenido');
    expect(card.className).toContain('rounded-card');
    expect(card.className).toContain('border-gray-100');
    expect(card.className).toContain('bg-white');
    expect(card.className).not.toContain('shadow');
  });

  it('becomes a link when href is provided', () => {
    render(
      <Card href="/empresas/acme">
        <span>Acme</span>
      </Card>,
    );
    expect(screen.getByRole('link', { name: 'Acme' })).toHaveAttribute('href', '/empresas/acme');
  });
});

describe('Badge', () => {
  it('renders a verified pill', () => {
    render(<Badge variant="verified">Verificada</Badge>);
    const badge = screen.getByText('Verificada');
    expect(badge.className).toContain('rounded-full');
    expect(badge.className).toContain('text-xs');
  });

  it('renders a premium pill with gold treatment', () => {
    render(<Badge variant="premium">Premium</Badge>);
    expect(screen.getByText('Premium').className).toContain('text-ink');
  });
});

describe('Chip', () => {
  it('marks the active state with aria-pressed and dark styles', () => {
    render(<Chip active>Tecnología</Chip>);
    const chip = screen.getByRole('button', { name: 'Tecnología' });
    expect(chip).toHaveAttribute('aria-pressed', 'true');
    expect(chip.className).toContain('bg-ink');
  });

  it('inactive state is white with gray text', () => {
    render(<Chip>Servicios</Chip>);
    const chip = screen.getByRole('button', { name: 'Servicios' });
    expect(chip).toHaveAttribute('aria-pressed', 'false');
    expect(chip.className).toContain('bg-white');
  });
});
