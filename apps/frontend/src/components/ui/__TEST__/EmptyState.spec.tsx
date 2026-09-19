import { render, screen } from '@testing-library/react';

import { Button } from '../base/button';
import { EmptyState } from '../EmptyState';

describe('EmptyState', () => {
  it('renders the title and description', () => {
    render(
      <EmptyState
        title="Sin solicitudes"
        description="Todavía no hay solicitudes cargadas."
      />,
    );

    expect(screen.getByText('Sin solicitudes')).toBeInTheDocument();
    expect(
      screen.getByText('Todavía no hay solicitudes cargadas.'),
    ).toBeInTheDocument();
  });

  it('renders an optional action', () => {
    render(
      <EmptyState
        title="Sin solicitudes"
        action={<Button>Nueva solicitud</Button>}
      />,
    );

    expect(
      screen.getByRole('button', { name: 'Nueva solicitud' }),
    ).toBeInTheDocument();
  });
});
