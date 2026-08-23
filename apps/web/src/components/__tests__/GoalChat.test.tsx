import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GoalChat from '../GoalChat';
import { usePathStore } from '../../store/usePathStore';

// Mock the store
jest.mock('../../store/usePathStore', () => ({
  usePathStore: jest.fn()
}));

describe('GoalChat Component', () => {
  let setUserGoalMock: jest.Mock;

  beforeEach(() => {
    setUserGoalMock = jest.fn();
    (usePathStore as unknown as jest.Mock).mockImplementation((selector) => {
      return selector({ setUserGoal: setUserGoalMock });
    });
  });

  it('renders the chat input correctly', () => {
    render(<GoalChat />);
    expect(screen.getByText('Where are you headed?')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/I want to become/i)).toBeInTheDocument();
  });

  it('submits the goal when clicking send', async () => {
    render(<GoalChat />);
    const input = screen.getByPlaceholderText(/I want to become/i);
    const button = screen.getByRole('button', { name: /start path/i });

    await userEvent.type(input, 'Backend Engineer');
    await userEvent.click(button);

    expect(setUserGoalMock).toHaveBeenCalledWith('Backend Engineer');
  });
});\n