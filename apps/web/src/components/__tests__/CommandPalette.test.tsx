import React from 'react';
import { render, screen } from '@testing-library/react';
import CommandPalette from '../CommandPalette';
import { usePathStore } from '../../store/usePathStore';

jest.mock('../../store/usePathStore', () => ({ usePathStore: jest.fn() }));

const baseMock = {
  userGoal: 'Backend Engineer',
  diagnosticComplete: true,
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

describe('CommandPalette Component', () => {
  it('renders command palette', () => {
    (usePathStore as unknown as jest.Mock).mockImplementation((selector) => selector({ ...baseMock, isCommandPaletteOpen: true }));
    render(<CommandPalette />);
    expect(screen.getByPlaceholderText(/Search commands/i)).toBeInTheDocument();
  });
});