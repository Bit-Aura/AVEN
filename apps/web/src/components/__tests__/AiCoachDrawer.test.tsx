import React from 'react';
import { render, screen } from '@testing-library/react';
import AiCoachDrawer from '../AiCoachDrawer';
import { usePathStore } from '../../store/usePathStore';

jest.mock('../../store/usePathStore', () => ({
  usePathStore: jest.fn()
}));

describe('AiCoachDrawer Component', () => {
  beforeEach(() => {
    (usePathStore as unknown as jest.Mock).mockImplementation((selector) => {
      return selector({ activeCoachNodeId: 'node-1', closeCoach: jest.fn() });
    });
  });

  it('renders coach drawer when active', () => {
    render(<AiCoachDrawer />);
    expect(screen.getByText(/AI Coach/i)).toBeInTheDocument();
  });
});\n