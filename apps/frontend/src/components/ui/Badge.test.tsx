import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Badge } from './Badge';

describe('Badge Component', () => {
  it('renders correctly with default label for QUOTE status', () => {
    render(<Badge status="pending_approval" />);
    expect(screen.getByRole('status')).toHaveTextContent('Pendiente');
  });

  it('renders correctly with default label for WORK_ORDER status', () => {
    render(<Badge status="in_production" />);
    expect(screen.getByRole('status')).toHaveTextContent('En Producción');
  });

  it('allows overriding the label via props', () => {
    render(<Badge status="approved" label="Aprobado por Calidad" />);
    expect(screen.getByRole('status')).toHaveTextContent('Aprobado por Calidad');
  });
});