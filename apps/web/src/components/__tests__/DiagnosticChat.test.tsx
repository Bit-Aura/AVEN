import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DiagnosticChat from '../DiagnosticChat';
import { usePathStore } from '../../store/usePathStore';

jest.mock('../../store/usePathStore', () => ({ usePathStore: jest.fn() }));

const baseMock = {
  userGoal: 'Backend Engineer',
  diagnosticComplete: false,
  nextQuestion: {
    question_id: 'q1',
    question_text: 'How familiar are you with backend systems?',
    options: ['I know the basics', 'Built production APIs', 'Architected distributed systems']
  },
  isLoading: false,
  pathError: null,
  isSimulatingSkip: false,
  simulatedConsequence: null,
  isTakingAssessment: false,
  isTrustPanelOpen: false,
  activeIdeNodeId: null,
  activeCoachNodeId: null,
  isOffline: false,
  streak: 5,
  xp: 1250,
  showCelebration: false,
  showUndoToast: false,
  isCommandPaletteOpen: false,
  isFocusMode: false,
  activeProofCard: null,
  rankingPreferences: { speedVsDepth: 50, freeVsPaid: 50, videoVsProject: 50 },
  collaborators: [{ id: '1', name: 'Alice', isOnline: true, color: 'bg-red-500' }],
  nodes: [{id: 'node-1', data: {}}],
  edges: [],
  activeMilestone: { id: 'm1', title: 'Test Node', explanation: 'Why this.', status: 'active' },
  setGraph: jest.fn(),
  setActiveMilestone: jest.fn(),
  setUserGoal: jest.fn(),
  completeDiagnostic: jest.fn(),
  simulateSkip: jest.fn(),
  cancelSimulation: jest.fn(),
  startAssessment: jest.fn(),
  stopAssessment: jest.fn(),
  bypassMilestone: jest.fn(),
  completeMilestoneViaIde: jest.fn(),
  toggleTrustPanel: jest.fn(),
  openIde: jest.fn(),
  closeIde: jest.fn(),
  openCoach: jest.fn(),
  closeCoach: jest.fn(),
  toggleOffline: jest.fn(),
  syncOfflineProgress: jest.fn(),
  awardXp: jest.fn(),
  hideCelebration: jest.fn(),
  undoLastAction: jest.fn(),
  hideUndoToast: jest.fn(),
  toggleCommandPalette: jest.fn(),
  closeCommandPalette: jest.fn(),
  toggleFocusMode: jest.fn(),
  openProofCard: jest.fn(),
  closeProofCard: jest.fn(),
  updateRankingPreference: jest.fn(),
};

describe('DiagnosticChat Component', () => {
  it('progresses to next question on option click', async () => {
    const completeDiagnosticMock = jest.fn();
    (usePathStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector({ ...baseMock, completeDiagnostic: completeDiagnosticMock })
    );
    render(<DiagnosticChat />);
    
    const option = screen.getByText(/I know the basics/i);
    await userEvent.click(option);

    expect(completeDiagnosticMock).toHaveBeenCalledWith('q1', 'I know the basics');
  });
});