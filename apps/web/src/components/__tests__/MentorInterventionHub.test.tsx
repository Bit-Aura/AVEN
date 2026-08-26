import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import LearnerMentorSessions from '../mentor/LearnerMentorSessions';
import * as client from '../../api/client';

jest.mock('../../api/client');

describe('LearnerMentorSessions Component', () => {
  const mockLearnerSessions = {
    requests: [
      {
        id: 301,
        profile_id: 10,
        learner_name: 'Jane Doe',
        learner_email: 'jane@pathfinder.dev',
        skill_id: 'system_design',
        title: 'Sharding & Consistent Hashing',
        description: 'Need assistance understanding dynamic rebalancing in distributed hash rings.',
        reason: 'Stuck on assignment question #3',
        status: 'SCHEDULED',
        duration_minutes: 45,
        scheduled_at: '2026-08-29T15:00:00Z',
        mentor_name: 'Sarah Connor',
        meeting_room_id: 'aven-connect-room-301',
        meeting_url: 'https://meet.jit.si/aven-connect-room-301',
        created_at: '2026-08-26T10:00:00Z',
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (client.fetchLearnerSessionRequests as jest.Mock).mockResolvedValue(mockLearnerSessions);
  });

  it('renders learner sessions list with scheduled status and join meeting action', async () => {
    render(<LearnerMentorSessions />);

    expect(screen.getByText('My 1-on-1 Mentor Sessions')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Sharding & Consistent Hashing')).toBeInTheDocument();
      expect(screen.getByText('Skill: system_design')).toBeInTheDocument();
      expect(screen.getByText('Sarah Connor')).toBeInTheDocument();
      expect(screen.getByText('Join Meeting')).toBeInTheDocument();
    });
  });
});
