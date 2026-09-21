import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Button } from '../../base/button';

describe('Button', () => {
  it('renders its children as a button', () => {
    render(<Button>Guardar</Button>);

    expect(screen.getByRole('button', { name: 'Guardar' })).toBeInTheDocument();
  });

  it('applies the variant', () => {
    render(<Button variant="destructive">Cancelar OT</Button>);

    expect(screen.getByRole('button', { name: 'Cancelar OT' })).toHaveAttribute(
      'data-variant',
      'destructive',
    );
  });

  it('calls onClick when pressed', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Enviar</Button>);

    await user.click(screen.getByRole('button', { name: 'Enviar' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not fire onClick when disabled', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button onClick={onClick} disabled>
        Enviar
      </Button>,
    );

    await user.click(screen.getByRole('button', { name: 'Enviar' }));

    expect(onClick).not.toHaveBeenCalled();
  });
});
