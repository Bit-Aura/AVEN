import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import MentorConnectDashboard from '../../app/(dashboard)/mentor/page';
import RequestMentorModal from '../mentor/RequestMentorModal';
import JitsiMeetingModal from '../mentor/JitsiMeetingModal';
import * as client from '../../api/client';

jest.mock('../../api/client');

describe('Mentor Connect Feature Suite', () => {
  const mockOpenRequests = {
    requests: [
      {
        id: 101,
        profile_id: 12,
        learner_name: 'Alex Chen',
        learner_email: 'alex@pathfinder.dev',
        target_role: 'Distributed Systems SDE',
        skill_id: 'async_python',
        skill_readiness_pct: 45.0,
        title: 'Asyncio Semaphore Deadlocks',
        description: 'Facing timeout issues in worker pool synchronization.',
        reason: 'Repeated failures on concurrency checkpoint',
        status: 'OPEN',
        requested_duration_minutes: 30,
        duration_minutes: 30,
        created_at: '2026-08-26T10:00:00Z',
      },
    ],
  };

  const mockMySessions = {
    sessions: [
      {
        id: 102,
        profile_id: 14,
        learner_name: 'Priya Sharma',
        learner_email: 'priya@pathfinder.dev',
        target_role: 'Backend Engineer',
        skill_id: 'postgres_indexing',
        title: 'PostgreSQL Composite Indexes',
        description: 'Need help tuning sequential scan queries.',
        status: 'SCHEDULED',
        duration_minutes: 45,
        scheduled_at: '2026-08-28T14:00:00Z',
        meeting_room_id: 'aven-connect-abc123xyz',
        meeting_url: 'https://meet.jit.si/aven-connect-abc123xyz',
        created_at: '2026-08-26T10:00:00Z',
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (client.fetchOpenMentorRequests as jest.Mock).mockResolvedValue(mockOpenRequests);
    (client.fetchMentorAssignedSessions as jest.Mock).mockResolvedValue(mockMySessions);
  });

  it('renders Mentor Connect dashboard with open requests and readiness badges', async () => {
    render(<MentorConnectDashboard />);

    expect(screen.getByText('Mentor Connect')).toBeInTheDocument();
    expect(screen.getByText('Mentor Operations')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Alex Chen')).toBeInTheDocument();
      expect(screen.getByText('Asyncio Semaphore Deadlocks')).toBeInTheDocument();
      expect(screen.getByText('Readiness: 45%')).toBeInTheDocument();
      expect(screen.getByText('Accept Request')).toBeInTheDocument();
    });
  });

  it('handles 409 conflict gracefully when another mentor accepts first', async () => {
    (client.acceptMentorRequest as jest.Mock).mockRejectedValueOnce(
      new Error('409 Conflict: This request was just accepted by another mentor.')
    );

    render(<MentorConnectDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Accept Request')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Accept Request'));

    await waitFor(() => {
      expect(screen.getByText('This request was just accepted by another mentor.')).toBeInTheDocument();
    });
  });

  it('submits a learner session request via RequestMentorModal', async () => {
    (client.createMentorSessionRequest as jest.Mock).mockResolvedValueOnce({
      id: 201,
      title: 'Database Partitioning',
      status: 'OPEN',
    });

    const onClose = jest.fn();
    render(<RequestMentorModal isOpen={true} onClose={onClose} defaultSkillId="db_partitioning" />);

    fireEvent.change(screen.getByPlaceholderText(/Debugging async queue timeouts/i), {
      target: { value: 'Database Partitioning Review' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Stuck on deadlock concept/i), {
      target: { value: 'Need guidance on range vs list partitioning strategy' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Describe the exact code behavior/i), {
      target: { value: 'I have tested range partitioning but querying across partitions is slow.' },
    });

    fireEvent.click(screen.getByText('Submit Request'));

    await waitFor(() => {
      expect(client.createMentorSessionRequest).toHaveBeenCalledWith({
        title: 'Database Partitioning Review',
        skill_id: 'db_partitioning',
        reason: 'Need guidance on range vs list partitioning strategy',
        description: 'I have tested range partitioning but querying across partitions is slow.',
        requested_duration_minutes: 30,
      });
    });
  });

  it('renders embedded Jitsi video meeting modal', () => {
    const onClose = jest.fn();
    render(
      <JitsiMeetingModal
        isOpen={true}
        onClose={onClose}
        roomName="aven-connect-test-room-123"
        sessionTitle="System Design Review"
        userName="Marcus Vance"
        userRole="mentor"
        durationMinutes={45}
      />
    );

    expect(screen.getByText('System Design Review')).toBeInTheDocument();
    expect(screen.getByText('Live Meeting')).toBeInTheDocument();
    expect(screen.getByTitle('Mentor Connect Meeting')).toBeInTheDocument();
  });
});
