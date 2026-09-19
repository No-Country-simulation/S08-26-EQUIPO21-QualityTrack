import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';

import { Tabs } from '../Tabs';

function ControlledTabs() {
  const [tab, setTab] = useState('requests');

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <Tabs.List aria-label="Secciones de Comercial">
        <Tabs.Trigger value="requests">Solicitudes</Tabs.Trigger>
        <Tabs.Trigger value="quotes">Cotizaciones</Tabs.Trigger>
      </Tabs.List>
      <Tabs.Panel value="requests">Contenido de solicitudes</Tabs.Panel>
      <Tabs.Panel value="quotes">Contenido de cotizaciones</Tabs.Panel>
    </Tabs>
  );
}

describe('Tabs (wrapper de base/tabs.tsx)', () => {
  it('renders only the panel matching the active value', () => {
    render(<ControlledTabs />);

    expect(screen.getByText('Contenido de solicitudes')).toBeInTheDocument();
    expect(
      screen.queryByText('Contenido de cotizaciones'),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Solicitudes' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('switches panel and selection on click, driven by the controlled value', async () => {
    const user = userEvent.setup();
    render(<ControlledTabs />);

    await user.click(screen.getByRole('tab', { name: 'Cotizaciones' }));

    expect(screen.getByText('Contenido de cotizaciones')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Cotizaciones' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('styles the active trigger with the QualityTrack brand tokens, not the shadcn/ui default', () => {
    render(<ControlledTabs />);

    const activeTrigger = screen.getByRole('tab', { name: 'Solicitudes' });
    expect(activeTrigger.className).toContain('data-active:text-primary');
    expect(activeTrigger.className).toContain('after:bg-primary');
  });

  it('renders the tablist with the underline variant, not the segmented control', () => {
    render(<ControlledTabs />);

    expect(screen.getByRole('tablist')).toHaveAttribute('data-variant', 'line');
  });
});
