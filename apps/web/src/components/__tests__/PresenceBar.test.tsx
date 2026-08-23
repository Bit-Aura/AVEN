import React from 'react';
import { render, screen } from '@testing-library/react';
import PresenceBar from '../PresenceBar';
import { usePathStore } from '../../store/usePathStore';

jest.mock('../../store/usePathStore', () => ({
  usePathStore: jest.fn()
}));

describe('PresenceBar Component', () => {
  beforeEach(() => {
    (usePathStore as unknown as jest.Mock).mockImplementation((selector) => {
      return selector({
        collaborators: [
          { id: '1', name: 'Alice', isOnline: true, color: 'bg-red-500' },
          { id: '2', name: 'Bob', isOnline: false, color: 'bg-blue-500' }
        ]
      });
    });
  });

  it('renders collaborators', () => {
    render(<PresenceBar />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });
});\n