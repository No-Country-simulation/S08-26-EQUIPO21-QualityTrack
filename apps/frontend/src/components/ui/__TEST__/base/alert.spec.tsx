import { render, screen } from '@testing-library/react';

import { Alert, AlertDescription, AlertTitle } from '../../base/alert';

describe('Alert', () => {
  it('renders its message with the alert role', () => {
    render(<Alert>Esta OT ya fue cancelada.</Alert>);

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Esta OT ya fue cancelada.',
    );
  });

  it('renders an optional title and description', () => {
    render(
      <Alert variant="warning">
        <AlertTitle>Intento 3 de 3</AlertTitle>
        <AlertDescription>Un rechazo más cancela la OT.</AlertDescription>
      </Alert>,
    );

    expect(screen.getByText('Intento 3 de 3')).toBeInTheDocument();
    expect(
      screen.getByText('Un rechazo más cancela la OT.'),
    ).toBeInTheDocument();
  });
});
