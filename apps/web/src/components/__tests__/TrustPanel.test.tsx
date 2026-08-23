import React from 'react';
import { render, screen } from '@testing-library/react';
import TrustPanel from '../TrustPanel';
import { usePathStore } from '../../store/usePathStore';

jest.mock('../../store/usePathStore', () => ({
  usePathStore: jest.fn()
}));

describe('TrustPanel Component', () => {
  beforeEach(() => {
    (usePathStore as unknown as jest.Mock).mockImplementation((selector) => {
      return selector({
        isTrustPanelOpen: true,
        toggleTrustPanel: jest.fn(),
        activeMilestone: { title: 'Test', explanation: 'Why this.' }
      });
    });
  });

  it('renders readiness stats and explanation', () => {
    render(<TrustPanel />);
    expect(screen.getByText(/Trust & Readiness/i)).toBeInTheDocument();
    expect(screen.getByText('Why this.')).toBeInTheDocument();
  });
});\n