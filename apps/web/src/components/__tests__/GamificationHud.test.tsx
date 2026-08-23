import React from 'react';
import { render, screen } from '@testing-library/react';
import GamificationHud from '../GamificationHud';
import { usePathStore } from '../../store/usePathStore';

jest.mock('../../store/usePathStore', () => ({
  usePathStore: jest.fn()
}));

describe('GamificationHud Component', () => {
  beforeEach(() => {
    (usePathStore as unknown as jest.Mock).mockImplementation((selector) => {
      return selector({ streak: 5, xp: 1200 });
    });
  });

  it('displays correct streak and xp', () => {
    render(<GamificationHud />);
    expect(screen.getByText(/5/i)).toBeInTheDocument(); // Streak
    expect(screen.getByText(/1,200/i)).toBeInTheDocument(); // XP
  });
});\n