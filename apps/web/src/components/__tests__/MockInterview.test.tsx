import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import MockInterviewHubPage from '../../app/(dashboard)/learner/interview/page';
import LiveInterviewRoomPage from '../../app/(dashboard)/learner/interview/[id]/page';
import InterviewReportPage from '../../app/(dashboard)/learner/interview/[id]/report/page';
import * as client from '../../api/client';

jest.mock('../../api/client');
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
  useParams: () => ({ id: '42' }),
  usePathname: () => '/learner/interview/42',
}));

describe('AI Mock Interview Feature Suite', () => {
  const mockResume: client.ResumeRecord = {
    id: 1,
    profile_id: 10,
    original_filename: 'john_doe_resume.pdf',
    content_type: 'application/pdf',
    raw_text: 'John Doe - Backend Engineer with Python, FastAPI, PostgreSQL',
    parsed_data: {
      summary: 'Backend Engineer with hands-on API experience.',
      technical_skills: ['Python', 'FastAPI', 'PostgreSQL', 'Docker'],
      projects: [
        {
          name: 'E-Commerce Cloud API',
          technologies: ['FastAPI', 'PostgreSQL'],
          summary: 'High throughput checkout service.',
          claimed_responsibilities: ['Async connection pooling'],
        },
      ],
      work_experience: [],
      education: [],
      certifications: [],
      claimed_roles: ['Backend Software Engineer'],
    },
    created_at: '2026-08-27T10:00:00Z',
    updated_at: '2026-08-27T10:00:00Z',
  };

  const mockSessions: client.MockInterviewSessionSummary[] = [
    {
      id: 42,
      profile_id: 10,
      target_role: 'Backend Software Engineer',
      interview_type: 'COMPREHENSIVE',
      status: 'IN_PROGRESS',
      current_phase: 'TECHNICAL_FUNDAMENTALS',
      current_turn_index: 1,
      overall_score: 78.0,
      technical_score: 75.0,
      communication_score: 82.0,
      resume_verification_score: 76.0,
      confidence_score: 80.0,
      created_at: '2026-08-27T11:00:00Z',
    },
  ];

  const mockSessionDetail: client.MockInterviewSessionDetail = {
    id: 42,
    profile_id: 10,
    target_role: 'Backend Software Engineer',
    interview_type: 'COMPREHENSIVE',
    status: 'IN_PROGRESS',
    current_phase: 'TECHNICAL_FUNDAMENTALS',
    current_turn_index: 0,
    created_at: '2026-08-27T11:00:00Z',
    turns: [
      {
        id: 101,
        turn_index: 0,
        category: 'INTRODUCTION',
        question_text: 'Could you introduce yourself and describe your technical background?',
        expected_rubrics: ['Clear introduction', 'Relevant projects'],
        input_mode: 'VOICE',
        created_at: '2026-08-27T11:00:00Z',
      },
    ],
  };

  const mockReport: client.InterviewReportSummary = {
    overall_score: 82.0,
    technical_score: 80.0,
    communication_score: 85.0,
    resume_verification_score: 80.0,
    confidence_score: 88.0,
    verified_strengths: [
      'Strong foundational Python problem solving',
      'Clear verbal communication structure',
    ],
    development_areas: [
      'Database transaction isolation and concurrent race conditions',
    ],
    canonical_skill_gaps: [
      {
        canonical_skill_id: 'sql_basics',
        canonical_skill_name: 'SQL Basics',
        similarity: 0.82,
        description: 'Candidate struggled with database concurrency and transaction isolation.',
        confidence: 0.85,
        severity: 'HIGH',
        evidence: 'Candidate stated they were unsure how connection locks prevent race conditions.',
      },
    ],
    resume_verification_matrix: [
      {
        claim: 'FastAPI',
        status: 'SUPPORTED',
        evidence: 'Demonstrated solid grasp of dependency injection and routing.',
      },
    ],
    summary: 'Candidate demonstrated satisfactory technical competency with identified gap in database concurrency.',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (client.getMyResume as jest.Mock).mockResolvedValue(mockResume);
    (client.listMyInterviewSessions as jest.Mock).mockResolvedValue(mockSessions);
    (client.getInterviewSession as jest.Mock).mockResolvedValue(mockSessionDetail);
    (client.getInterviewReport as jest.Mock).mockResolvedValue(mockReport);
  });

  it('renders Mock Interview Hub with parsed resume claims and session history', async () => {
    render(<MockInterviewHubPage />);

    await waitFor(() => {
      expect(screen.getByText(/Voice-First AI Mock Interview/i)).toBeInTheDocument();
      expect(screen.getByText(/john_doe_resume.pdf/i)).toBeInTheDocument();
      expect(screen.getByText(/Claimed Technical Skills/i)).toBeInTheDocument();
      expect(screen.getAllByText(/FastAPI/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/Start Voice Interview/i)).toBeInTheDocument();
    });
  });

  it('renders Live Interview Room with question audio prompt and speech controls', async () => {
    render(<LiveInterviewRoomPage />);

    await waitFor(() => {
      expect(screen.getByText(/Could you introduce yourself and describe your technical background/i)).toBeInTheDocument();
      expect(screen.getByText(/Start Speaking/i)).toBeInTheDocument();
      expect(screen.getByText(/Submit Answer/i)).toBeInTheDocument();
      expect(screen.getByText(/Replay Audio/i)).toBeInTheDocument();
    });
  });

  it('renders Calibration Report with score metrics, canonical skill gaps, and learning path link', async () => {
    render(<InterviewReportPage />);

    await waitFor(() => {
      expect(screen.getByText(/Calibration Report/i)).toBeInTheDocument();
      expect(screen.getByText(/82%/i)).toBeInTheDocument();
      expect(screen.getByText(/Verified Technical Strengths/i)).toBeInTheDocument();
      expect(screen.getByText(/Identified Gaps \(Mapped to Curriculum\)/i)).toBeInTheDocument();
      expect(screen.getByText(/SQL Basics/i)).toBeInTheDocument();
      expect(screen.getByText(/Resume Claim Verification Matrix/i)).toBeInTheDocument();
      expect(screen.getByText(/View Updated Learning Path/i)).toBeInTheDocument();
    });
  });
});
