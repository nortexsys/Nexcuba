import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Button } from '@/components/ui/Button';

describe('Button', () => {
  it('renders a dark pill button by default', () => {
    render(<Button>Registrar</Button>);
    const button = screen.getByRole('button', { name: 'Registrar' });
    expect(button).toBeInTheDocument();
    expect(button.className).toContain('bg-ink');
    expect(button.className).toContain('rounded-full');
  });

  it('renders the ghost and light variants', () => {
    const { rerender } = render(<Button variant="ghost">Entrar</Button>);
    expect(screen.getByRole('button', { name: 'Entrar' }).className).toContain('bg-transparent');

    rerender(<Button variant="light">CTA</Button>);
    expect(screen.getByRole('button', { name: 'CTA' }).className).toContain('bg-white');
  });

  it('renders as a Next link when href is provided', () => {
    render(<Button href="/registro">Registrar Empresa</Button>);
    const link = screen.getByRole('link', { name: 'Registrar Empresa' });
    expect(link).toHaveAttribute('href', '/registro');
  });

  it('forwards disabled state', () => {
    render(<Button disabled>Enviar</Button>);
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeDisabled();
  });

  it('fires click handlers', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Clic</Button>);
    screen.getByRole('button', { name: 'Clic' }).click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
