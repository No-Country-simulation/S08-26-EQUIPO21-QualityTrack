import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../base/dialog';

function CancelWorkOrderDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button">Cancelar OT</button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancelar orden de trabajo</DialogTitle>
          <DialogDescription>Ingresar un motivo.</DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}

describe('Dialog', () => {
  it('does not render the content until opened', () => {
    render(<CancelWorkOrderDialog />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens from the trigger, moves focus inside, and closes on Escape', async () => {
    const user = userEvent.setup();
    render(<CancelWorkOrderDialog />);

    const trigger = screen.getByRole('button', { name: 'Cancelar OT' });
    await user.click(trigger);

    const dialog = screen.getByRole('dialog', {
      name: 'Cancelar orden de trabajo',
    });
    expect(dialog).toBeInTheDocument();
    expect(dialog).toContainElement(document.activeElement as HTMLElement);

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
