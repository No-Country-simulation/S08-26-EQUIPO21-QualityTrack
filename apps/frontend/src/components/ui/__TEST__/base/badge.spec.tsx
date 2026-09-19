import { render, screen } from '@testing-library/react';

import { Badge } from '../../base/badge';

describe('Badge', () => {
  it('renders its content', () => {
    render(<Badge>routed</Badge>);

    expect(screen.getByText('routed')).toBeInTheDocument();
  });

  it('applies the variant', () => {
    render(<Badge variant="destructive">cancelled</Badge>);

    expect(screen.getByText('cancelled')).toHaveAttribute(
      'data-variant',
      'destructive',
    );
  });
});
