import React from 'react';
import { render } from '@testing-library/react';
import MicroCelebration from '../MicroCelebration';
import { usePathStore } from '../../store/usePathStore';

jest.mock('../../store/usePathStore', () => ({
  usePathStore: jest.fn()
}));

describe('MicroCelebration Component', () => {
  beforeEach(() => {
    (usePathStore as unknown as jest.Mock).mockImplementation((selector) => {
      return selector({ showCelebration: true, hideCelebration: jest.fn() });
    });
  });

  it('renders celebration overlay', () => {
    const { container } = render(<MicroCelebration />);
    expect(container.firstChild).toBeInTheDocument();
  });
});\n