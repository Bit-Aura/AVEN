import React from 'react';
import { render } from '@testing-library/react';
import SkillGraph from '../SkillGraph';

jest.mock('@xyflow/react', () => ({
  ReactFlow: () => <div data-testid="react-flow-mock"></div>,
  Background: () => <div />,
  Controls: () => <div />,
  MiniMap: () => <div />,
  useNodesState: (initial: any) => [initial, jest.fn(), jest.fn()],
  useEdgesState: (initial: any) => [initial, jest.fn(), jest.fn()]
}));

describe('SkillGraph Component', () => {
  it('renders without crashing', () => {
    const { getByTestId } = render(<SkillGraph />);
    expect(getByTestId('react-flow-mock')).toBeInTheDocument();
  });
});