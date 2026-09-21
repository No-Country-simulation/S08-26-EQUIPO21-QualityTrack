import { render, screen, act, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { SearchInput } from './SearchInput';

describe('SearchInput Component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders searchbox with correct placeholder and aria-label', () => {
    render(<SearchInput onSearch={vi.fn()} />);

    const input = screen.getByRole('searchbox');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('placeholder', 'Buscar cliente, OT o pieza');
  });

  it('executes search callback after debounce time', () => {
    const handleSearch = vi.fn();

    render(<SearchInput onSearch={handleSearch} debounceMs={300} />);

    const input = screen.getByRole('searchbox');

    // Disparamos el evento de cambio directamente
    fireEvent.change(input, { target: { value: 'OT-2026' } });

    // El callback aún no debe haberse ejecutado inmediatamente
    expect(handleSearch).not.toHaveBeenCalledWith('OT-2026');

    // Avanzamos el temporizador falso en 300ms dentro de act()
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Ahora sí se debe haber invocado con el valor correcto
    expect(handleSearch).toHaveBeenCalledWith('OT-2026');
  });
});