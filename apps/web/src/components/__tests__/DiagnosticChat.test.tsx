import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DiagnosticChat from '../DiagnosticChat';
import { usePathStore } from '../../store/usePathStore';

jest.mock('../../store/usePathStore', () => ({
  usePathStore: jest.fn()
}));

describe('DiagnosticChat Component', () => {
  let completeDiagnosticMock: jest.Mock;

  beforeEach(() => {
    completeDiagnosticMock = jest.fn();
    (usePathStore as unknown as jest.Mock).mockImplementation((selector) => {
      return selector({
        userGoal: 'Backend Engineer',
        completeDiagnostic: completeDiagnosticMock
      });
    });
  });

  it('renders initial question and options', () => {
    render(<DiagnosticChat />);
    expect(screen.getByText(/Skill Baseline Diagnostic/i)).toBeInTheDocument();
    expect(screen.getByText(/You want to: "Backend Engineer"/i)).toBeInTheDocument();
    expect(screen.getByText(/I've never coded before/i)).toBeInTheDocument();
  });

  it('progresses to next question on option click', async () => {
    render(<DiagnosticChat />);
    const option = screen.getByText(/I know the basics/i);
    await userEvent.click(option);

    expect(screen.getByText(/I know the basics/i)).toBeInTheDocument(); // user message
    
    // Check if next question loads
    await waitFor(() => {
      expect(screen.getByText(/interacted with a database/i)).toBeInTheDocument();
    });
  });
});\n