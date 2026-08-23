import React from 'react';
import { render, screen } from '@testing-library/react';
import ProveItAssessment from '../ProveItAssessment';
import { usePathStore } from '../../store/usePathStore';

jest.mock('../../store/usePathStore', () => ({
  usePathStore: jest.fn()
}));

describe('ProveItAssessment Component', () => {
  beforeEach(() => {
    (usePathStore as unknown as jest.Mock).mockImplementation((selector) => {
      return selector({
        isTakingAssessment: true,
        activeMilestone: { id: 'm1', title: 'Test Node' },
        stopAssessment: jest.fn(),
        bypassMilestone: jest.fn()
      });
    });
  });

  it('renders assessment form', () => {
    render(<ProveItAssessment />);
    expect(screen.getByText(/Prove your skills: Test Node/i)).toBeInTheDocument();
  });
});\n