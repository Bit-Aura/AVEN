import React from 'react';
import { render, screen } from '@testing-library/react';
import CommandPalette from '../CommandPalette';
import { usePathStore } from '../../store/usePathStore';

jest.mock('../../store/usePathStore', () => ({
  usePathStore: jest.fn()
}));

describe('CommandPalette Component', () => {
  beforeEach(() => {
    (usePathStore as unknown as jest.Mock).mockImplementation((selector) => {
      return selector({ isCommandPaletteOpen: true, closeCommandPalette: jest.fn() });
    });
  });

  it('renders command palette', () => {
    render(<CommandPalette />);
    expect(screen.getByPlaceholderText(/Type a command/i)).toBeInTheDocument();
  });
});\n