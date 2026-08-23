import React from 'react';
import { render, screen } from '@testing-library/react';
import RankingSliders from '../RankingSliders';
import { usePathStore } from '../../store/usePathStore';

jest.mock('../../store/usePathStore', () => ({
  usePathStore: jest.fn()
}));

describe('RankingSliders Component', () => {
  beforeEach(() => {
    (usePathStore as unknown as jest.Mock).mockImplementation((selector) => {
      return selector({
        rankingPreferences: { speedVsDepth: 50, freeVsPaid: 50, videoVsProject: 50 },
        updateRankingPreference: jest.fn()
      });
    });
  });

  it('renders sliders', () => {
    render(<RankingSliders />);
    expect(screen.getByText(/Path Parameters/i)).toBeInTheDocument();
    expect(screen.getAllByRole('slider').length).toBeGreaterThan(0);
  });
});\n