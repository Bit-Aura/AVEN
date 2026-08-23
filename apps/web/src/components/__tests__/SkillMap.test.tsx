import React from 'react';
import { render } from '@testing-library/react';
import SkillMap from '../SkillMap';
import { usePathStore } from '../../store/usePathStore';

// Mock child component
jest.mock('../SkillGraph', () => () => <div data-testid="skill-graph" />);

jest.mock('../../store/usePathStore', () => ({
  usePathStore: jest.fn()
}));

describe('SkillMap Component', () => {
  beforeEach(() => {
    (usePathStore as unknown as jest.Mock).mockImplementation((selector) => {
      return selector({
        isFocusMode: false,
        nodes: [],
        edges: []
      });
    });
  });

  it('renders the skill graph wrapper', () => {
    const { getByTestId } = render(<SkillMap />);
    expect(getByTestId('skill-graph')).toBeInTheDocument();
  });
});\n