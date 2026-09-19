import { render, screen } from '@testing-library/react';

import { Field } from '../Field';

describe('Field', () => {
  it('links the label to the control via htmlFor/id', () => {
    render(
      <Field label="Cliente">
        <input />
      </Field>,
    );

    expect(screen.getByLabelText('Cliente')).toBeInTheDocument();
  });

  it('marks the control as invalid and describes it with the error', () => {
    render(
      <Field label="Email" error="Formato de email inválido">
        <input />
      </Field>,
    );

    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Formato de email inválido',
    );
    expect(input).toHaveAccessibleDescription('Formato de email inválido');
  });

  it('renders a hint when there is no error', () => {
    render(
      <Field label="Cantidad" hint="Número entero mayor a 0">
        <input />
      </Field>,
    );

    expect(screen.getByLabelText('Cantidad')).toHaveAccessibleDescription(
      'Número entero mayor a 0',
    );
  });
});
