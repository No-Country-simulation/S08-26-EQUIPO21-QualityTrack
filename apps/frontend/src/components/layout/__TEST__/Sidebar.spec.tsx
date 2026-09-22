import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

import { Sidebar } from '../Sidebar';

describe('Sidebar', () => {
  it('marks the link matching the current route as active', () => {
    render(
      <MemoryRouter initialEntries={['/quality']}>
        <Sidebar />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'Calidad' })).toHaveClass(
      'bg-blue-100',
    );
    expect(screen.getByRole('link', { name: 'Comercial' })).not.toHaveClass(
      'bg-blue-100',
    );
  });

  it('renders a link for each business area', () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    );

    for (const label of ['Comercial', 'Producción', 'Calidad', 'Auditoría']) {
      expect(screen.getByRole('link', { name: label })).toBeInTheDocument();
    }
  });
});
