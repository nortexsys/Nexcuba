import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ViewToggle } from '@/components/ui/ViewToggle';
import { es } from '@/locales/es';

function renderToggle(value: 'cards' | 'table', onChange: (m: 'cards' | 'table') => void) {
  return render(
    <ViewToggle
      value={value}
      onChange={onChange}
      cardsLabel={es.common.viewToggle.cards}
      tableLabel={es.common.viewToggle.table}
      legendLabel={es.common.viewToggle.legend}
    />,
  );
}

describe('ViewToggle (dual list view, D-5)', () => {
  it('renders a radiogroup with the two modes', () => {
    renderToggle('cards', vi.fn());
    const group = screen.getByRole('radiogroup', { name: es.common.viewToggle.legend });
    expect(group).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /tarjetas/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /tabla/i })).toBeInTheDocument();
  });

  it('marks the active mode as checked', () => {
    renderToggle('table', vi.fn());
    expect(screen.getByRole('radio', { name: /tabla/i })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: /tarjetas/i })).toHaveAttribute(
      'aria-checked',
      'false',
    );
  });

  it('emits the selected mode on click', async () => {
    const onChange = vi.fn();
    renderToggle('cards', onChange);
    await userEvent.setup().click(screen.getByRole('radio', { name: /tabla/i }));
    expect(onChange).toHaveBeenCalledWith('table');
  });
});
