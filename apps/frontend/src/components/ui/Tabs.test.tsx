import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Tabs, type TabItem } from './Tabs';

const mockItems: TabItem[] = [
  { id: 'general', label: 'General', content: <div>Contenido General</div> },
  { id: 'history', label: 'Historial', content: <div>Contenido Historial</div> },
  { id: 'docs', label: 'Documentos', content: <div>Contenido Documentos</div> },
];

describe('Tabs Component - Accessibility & Navigation', () => {
  it('renders tablist and default active tab content correctly', () => {
    render(<Tabs items={mockItems} />);

    const tablist = screen.getByRole('tablist');
    expect(tablist).toBeInTheDocument();

    const generalTab = screen.getByRole('tab', { name: 'General' });
    expect(generalTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Contenido General')).toBeInTheDocument();
  });

  it('switches tab content on click', async () => {
    const handleChange = vi.fn();
    render(<Tabs items={mockItems} onChange={handleChange} />);

    const historyTab = screen.getByRole('tab', { name: 'Historial' });
    await userEvent.click(historyTab);

    expect(historyTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Contenido Historial')).toBeInTheDocument();
    expect(screen.queryByText('Contenido General')).not.toBeInTheDocument();
    expect(handleChange).toHaveBeenCalledWith('history');
  });

  it('navigates through tabs using ArrowRight and ArrowLeft keys', async () => {
    render(<Tabs items={mockItems} />);

    const generalTab = screen.getByRole('tab', { name: 'General' });
    generalTab.focus();

    // Flecha Derecha -> Pasa a Historial
    await userEvent.keyboard('{ArrowRight}');
    const historyTab = screen.getByRole('tab', { name: 'Historial' });
    expect(historyTab).toHaveAttribute('aria-selected', 'true');
    expect(historyTab).toHaveFocus();

    // Flecha Derecha -> Pasa a Documentos
    await userEvent.keyboard('{ArrowRight}');
    const docsTab = screen.getByRole('tab', { name: 'Documentos' });
    expect(docsTab).toHaveAttribute('aria-selected', 'true');
    expect(docsTab).toHaveFocus();

    // Flecha Izquierda -> Vuelve a Historial
    await userEvent.keyboard('{ArrowLeft}');
    expect(historyTab).toHaveAttribute('aria-selected', 'true');
    expect(historyTab).toHaveFocus();
  });
});