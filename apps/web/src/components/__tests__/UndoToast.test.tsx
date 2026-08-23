import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UndoToast from '../UndoToast';
import { usePathStore } from '../../store/usePathStore';

jest.mock('../../store/usePathStore', () => ({
  usePathStore: jest.fn()
}));

describe('UndoToast Component', () => {
  let undoLastActionMock: jest.Mock;

  beforeEach(() => {
    undoLastActionMock = jest.fn();
    (usePathStore as unknown as jest.Mock).mockImplementation((selector) => {
      return selector({
        showUndoToast: true,
        undoLastAction: undoLastActionMock,
        hideUndoToast: jest.fn()
      });
    });
  });

  it('renders undo button and calls action on click', async () => {
    render(<UndoToast />);
    const button = screen.getByRole('button', { name: /Undo/i });
    expect(button).toBeInTheDocument();
    
    await userEvent.click(button);
    expect(undoLastActionMock).toHaveBeenCalled();
  });
});\n