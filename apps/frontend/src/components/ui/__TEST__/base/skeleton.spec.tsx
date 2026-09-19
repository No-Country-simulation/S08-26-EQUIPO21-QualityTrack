import { render } from '@testing-library/react';

import { Skeleton } from '../../base/skeleton';

describe('Skeleton', () => {
  it('renders a placeholder element', () => {
    const { container } = render(<Skeleton className="h-4 w-32" />);

    const skeleton = container.querySelector('[data-slot="skeleton"]');
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveClass('animate-pulse', 'h-4', 'w-32');
  });
});
