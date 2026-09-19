import { fireEvent, render, screen } from '@testing-library/react';

import { SearchInput } from '../SearchInput';

describe('SearchInput', () => {
  it('renders a searchbox with the given placeholder', () => {
    render(<SearchInput onSearch={vi.fn()} placeholder="Buscar cliente…" />);

    expect(screen.getByRole('searchbox')).toHaveAttribute(
      'placeholder',
      'Buscar cliente…',
    );
  });

  it('debounces onSearch by 300ms after the last keystroke', () => {
    vi.useFakeTimers();
    const onSearch = vi.fn();
    render(<SearchInput onSearch={onSearch} />);

    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'AC' } });
    vi.advanceTimersByTime(200);
    fireEvent.change(input, { target: { value: 'ACME' } });

    expect(onSearch).not.toHaveBeenCalledWith('ACME');

    vi.advanceTimersByTime(300);

    expect(onSearch).toHaveBeenLastCalledWith('ACME');
    expect(onSearch).not.toHaveBeenCalledWith('AC');

    vi.useRealTimers();
  });
});
