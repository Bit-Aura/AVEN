import React from 'react';
import { render, screen } from '@testing-library/react';
import MilestoneCard from '../MilestoneCard';
import { usePathStore } from '../../store/usePathStore';

jest.mock('../../store/usePathStore', () => ({
  usePathStore: jest.fn()
}));

describe('MilestoneCard Component', () => {
  let setActiveMilestoneMock: jest.Mock;
  
  beforeEach(() => {
    setActiveMilestoneMock = jest.fn();
    (usePathStore as unknown as jest.Mock).mockImplementation((selector) => {
      return selector({ 
        activeMilestone: null,
        setActiveMilestone: setActiveMilestoneMock,
        startAssessment: jest.fn(),
        isSimulatingSkip: false,
        simulateSkip: jest.fn()
      });
    });
  });

  it('renders milestone details', () => {
    render(<MilestoneCard id="m1" title="Python Basics" status="active" explanation="Learn python." />);
    expect(screen.getByText('Python Basics')).toBeInTheDocument();
    expect(screen.getByText('Learn python.')).toBeInTheDocument();
  });
});\n