import React from 'react';
import { render, screen } from '@testing-library/react';
import IdeSidecar from '../IdeSidecar';
import { usePathStore } from '../../store/usePathStore';

jest.mock('../../store/usePathStore', () => ({
  usePathStore: jest.fn()
}));

describe('IdeSidecar Component', () => {
  beforeEach(() => {
    (usePathStore as unknown as jest.Mock).mockImplementation((selector) => {
      return selector({ activeIdeNodeId: 'node-1', closeIde: jest.fn(), completeMilestoneViaIde: jest.fn() });
    });
  });

  it('renders IDE sidecar', () => {
    render(<IdeSidecar />);
    expect(screen.getByText(/Code Editor/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Run Code/i })).toBeInTheDocument();
  });
});\n