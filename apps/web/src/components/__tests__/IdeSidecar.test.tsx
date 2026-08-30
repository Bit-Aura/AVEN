import React from 'react';
import { render, screen } from '@testing-library/react';
import IdeSidecar from '../IdeSidecar';
import { usePathStore } from '../../store/usePathStore';

jest.mock('../../store/usePathStore', () => ({ usePathStore: jest.fn() }));

jest.mock('@monaco-editor/react', () => {
  return function DummyEditor(props: any) {
    return <div data-testid="monaco-editor">{props.value}</div>;
  };
});

jest.mock('../../api/client', () => ({
  generateCodingChallenge: jest.fn().mockResolvedValue({
    question_id: 'q_test_1',
    title: 'Test Coding Challenge',
    problem_statement: 'Write a solution for this test challenge.',
    skill: 'Python Basics',
    difficulty: 'Intermediate',
    programming_language: 'python',
    starter_code: 'def solve():\n    return True\n',
    constraints: ['O(N) time'],
    examples: [{ input: 'solve()', output: 'True' }],
    expected_concepts: ['Functions'],
    evaluation_rubric: ['Correctness: 100%'],
    hints: ['Hint 1']
  }),
  executeCode: jest.fn().mockResolvedValue({
    stdout: 'OK',
    stderr: '',
    code: 0,
    is_passing: true
  }),
  evaluateCodeSolution: jest.fn().mockResolvedValue({
    score: 95,
    verdict: 'excellent',
    summary: 'Great static reasoning score.',
    correctness_score: 95,
    reasoning_score: 95,
    code_quality_score: 95,
    strengths: ['Clean code'],
    issues: [],
    improvements: [],
    detailed_feedback: 'Well done.',
    complexity_analysis: {
      time_complexity: 'O(N)',
      space_complexity: 'O(1)',
      details: 'Linear pass'
    },
    next_steps: ['Continue learning'],
    is_passing: true,
    evaluation_type: 'ai_static_reasoning',
    evaluation_note: 'AI evaluation is based on code analysis and reasoning.'
  })
}));

jest.mock('../../hooks/api/useQueries', () => ({
  useActivePathQuery: () => ({ refetch: jest.fn(), data: {} }),
  useReadinessQuery: () => ({ refetch: jest.fn(), data: {} }),
}));
jest.mock('../../hooks/api/useMutations', () => ({
  useSubmitIdeTelemetryMutation: () => ({ mutateAsync: jest.fn() }),
}));

const baseMock = {
  userGoal: 'Backend Engineer',
  targetRole: 'Backend Software Engineer',
  profileId: 1,
  activeIdeNodeId: null,
  closeIde: jest.fn(),
  completeMilestoneViaIde: jest.fn(),
};

describe('IdeSidecar Component', () => {
  it('renders nothing when activeIdeNodeId is null', () => {
    (usePathStore as unknown as jest.Mock).mockImplementation((selector) => selector(baseMock));
    const { container } = render(<IdeSidecar />);
    expect(container.firstChild).toBeNull();
  });

  it('renders AI Coding Sandbox sidecar when activeIdeNodeId is provided', async () => {
    (usePathStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector({ ...baseMock, activeIdeNodeId: 'python_basics' })
    );
    render(<IdeSidecar />);
    expect(screen.getByText(/AI Coding Sandbox/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Evaluate Solution/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Run Tests/i })).toBeInTheDocument();

    // Await async challenge resolution to complete all state updates
    expect(await screen.findByText('Test Coding Challenge')).toBeInTheDocument();
  });
});