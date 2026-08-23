import React from 'react';
import { render } from '@testing-library/react';
import SkillGraph from '../SkillGraph';

// Mock react flow to prevent resize observer errors
jest.mock('@xyflow/react', () => ({
  ReactFlow: () => <div data-testid="react-flow-mock"></div>,
  Background: () => <div />,
  Controls: () => <div />,
  MiniMap: () => <div />
}));

describe('SkillGraph Component', () => {
  it('renders without crashing', () => {
    const { getByTestId } = render(<SkillGraph />);
    expect(getByTestId('react-flow-mock')).toBeInTheDocument();
  });
});\n