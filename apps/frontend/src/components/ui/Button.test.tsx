import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './Button';

describe('Button Component', () => {
  it('renders correctly with default primary variant', () => {
    render(<Button>Guardar</Button>);
    const button = screen.getByRole('button', { name: /guardar/i });

    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('bg-[var(--color-primary)]');
  });

  it('applies secondary variant styles correctly', () => {
    render(<Button variant="secondary">Secundario</Button>);
    const button = screen.getByRole('button', { name: /secundario/i });

    expect(button).toHaveClass('bg-[var(--color-neutral-dark)]');
  });

  it('applies destructive variant styles correctly (ADR-0006)', () => {
    render(<Button variant="destructive">Cancelar</Button>);
    const button = screen.getByRole('button', { name: /cancelar/i });

    expect(button).toHaveClass('bg-[var(--color-destructive)]');
  });

  it('applies outline variant styles correctly', () => {
    render(<Button variant="outline">Volver</Button>);
    const button = screen.getByRole('button', { name: /volver/i });

    expect(button).toHaveClass('border-slate-300');
  });

  it('triggers onClick handler when clicked', async () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Acción</Button>);

    await userEvent.click(screen.getByRole('button', { name: /acción/i }));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('disables interaction and applies disabled styles when disabled prop is true', async () => {
    const handleClick = vi.fn();
    render(
      <Button disabled onClick={handleClick}>
        Deshabilitado
      </Button>
    );
    const button = screen.getByRole('button', { name: /deshabilitado/i });

    expect(button).toBeDisabled();
    expect(button).toHaveClass('disabled:cursor-not-allowed');

    await userEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });
});