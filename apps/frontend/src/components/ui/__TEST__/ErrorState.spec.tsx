import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ErrorState } from '../ErrorState';

describe('ErrorState', () => {
  it('renders the default title with the alert role', () => {
    render(<ErrorState />);

    expect(screen.getByRole('alert')).toHaveTextContent('Ocurrió un error');
  });

  it('calls onRetry when the retry button is pressed', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<ErrorState onRetry={onRetry} />);

    await user.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('does not render a retry button when onRetry is not provided', () => {
    render(<ErrorState />);

    expect(
      screen.queryByRole('button', { name: 'Reintentar' }),
    ).not.toBeInTheDocument();
  });
});
