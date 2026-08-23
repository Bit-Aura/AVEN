import React from 'react';
import { render, screen } from '@testing-library/react';
import ProofCard from '../ProofCard';
import { usePathStore } from '../../store/usePathStore';

jest.mock('../../store/usePathStore', () => ({
  usePathStore: jest.fn()
}));

describe('ProofCard Component', () => {
  beforeEach(() => {
    (usePathStore as unknown as jest.Mock).mockImplementation((selector) => {
      return selector({
        activeProofCard: {
          skillName: 'React JS',
          confidenceScore: 92,
          narrative: 'Built apps.',
          evidenceTags: ['Code', 'Quiz'],
          issueDate: '2026-08-23'
        },
        closeProofCard: jest.fn()
      });
    });
  });

  it('renders proof card details', () => {
    render(<ProofCard />);
    expect(screen.getByText('React JS')).toBeInTheDocument();
    expect(screen.getByText('92%')).toBeInTheDocument();
  });
});\n