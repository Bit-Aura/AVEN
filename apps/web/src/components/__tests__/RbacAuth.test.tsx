import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SignInPage from '../../app/(auth)/sign-in/[[...sign-in]]/page';
import SignUpPage from '../../app/(auth)/sign-up/[[...sign-up]]/page';
import Sidebar from '../layout/Sidebar';
import * as client from '../../api/client';
import { useSafeUser } from '../../lib/clerkSafe';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
  }),
  usePathname: () => '/learner',
}));

jest.mock('../../api/client');
jest.mock('../../lib/clerkSafe', () => ({
  useSafeUser: jest.fn(),
  SafeUserButton: () => <div data-testid="safe-user-button">User</div>,
  isClerkConfigured: false,
}));

describe('RBAC Authentication & User Flows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Sign In Page Role-Based Redirection', () => {
    it('redirects ADMIN to /admin upon successful login', async () => {
      (client.loginUser as jest.Mock).mockResolvedValueOnce({
        access_token: 'fake-jwt-admin',
        user: { id: 1, email: 'admin@aven.com', role: 'ADMIN', name: 'Admin User' },
      });

      render(<SignInPage />);

      fireEvent.change(screen.getByPlaceholderText('name@example.com'), {
        target: { value: 'admin@aven.com' },
      });
      fireEvent.change(screen.getByPlaceholderText('••••••••'), {
        target: { value: 'Aven@123' },
      });

      fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

      await waitFor(() => {
        expect(client.loginUser).toHaveBeenCalledWith({
          email: 'admin@aven.com',
          password: 'Aven@123',
        });
        expect(mockPush).toHaveBeenCalledWith('/admin');
      });
    });

    it('redirects MENTOR to /mentor upon successful login', async () => {
      (client.loginUser as jest.Mock).mockResolvedValueOnce({
        access_token: 'fake-jwt-mentor',
        user: { id: 2, email: 'mentor@pathfinder.dev', role: 'MENTOR', name: 'Mentor User' },
      });

      render(<SignInPage />);

      fireEvent.change(screen.getByPlaceholderText('name@example.com'), {
        target: { value: 'mentor@pathfinder.dev' },
      });
      fireEvent.change(screen.getByPlaceholderText('••••••••'), {
        target: { value: 'Aven@123' },
      });

      fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/mentor');
      });
    });

    it('redirects LEARNER to /learner upon successful login', async () => {
      (client.loginUser as jest.Mock).mockResolvedValueOnce({
        access_token: 'fake-jwt-learner',
        user: { id: 3, email: 'student@example.com', role: 'LEARNER', name: 'Student User' },
      });

      render(<SignInPage />);

      fireEvent.change(screen.getByPlaceholderText('name@example.com'), {
        target: { value: 'student@example.com' },
      });
      fireEvent.change(screen.getByPlaceholderText('••••••••'), {
        target: { value: 'Secret123' },
      });

      fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/learner');
      });
    });
  });

  describe('Sign Up Page Learner Enrollment', () => {
    it('registers user as LEARNER and redirects to /learner', async () => {
      (client.registerUser as jest.Mock).mockResolvedValueOnce({
        access_token: 'fake-jwt-new-learner',
        user: { id: 10, email: 'new@example.com', role: 'LEARNER', name: 'New Student' },
      });

      render(<SignUpPage />);

      fireEvent.change(screen.getByPlaceholderText('Alex Morgan'), {
        target: { value: 'New Student' },
      });
      fireEvent.change(screen.getByPlaceholderText('alex@example.com'), {
        target: { value: 'new@example.com' },
      });
      fireEvent.change(screen.getByPlaceholderText('••••••••'), {
        target: { value: 'NewPass123' },
      });

      fireEvent.click(screen.getByRole('button', { name: /Sign Up & Continue/i }));

      await waitFor(() => {
        expect(client.registerUser).toHaveBeenCalledWith({
          name: 'New Student',
          email: 'new@example.com',
          password: 'NewPass123',
          role: 'LEARNER',
        });
        expect(mockPush).toHaveBeenCalledWith('/learner');
      });
    });
  });

  describe('Dynamic Role-Based Navigation in Sidebar', () => {
    it('renders Learner navigation for LEARNER role', () => {
      (useSafeUser as jest.Mock).mockReturnValue({
        user: {
          id: 1,
          fullName: 'Alice Learner',
          firstName: 'Alice',
          username: 'alice',
          role: 'LEARNER',
          primaryEmailAddress: { emailAddress: 'alice@pathfinder.dev' },
        },
        isLoaded: true,
        isSignedIn: true,
      });

      render(<Sidebar />);

      expect(screen.getByText('Learning Path')).toBeInTheDocument();
      expect(screen.getByText('1-on-1 Mentorship')).toBeInTheDocument();
      expect(screen.getByText('Proof Portfolio')).toBeInTheDocument();
      expect(screen.queryByText('Platform Admin')).not.toBeInTheDocument();
    });

    it('renders Mentor navigation for MENTOR role', () => {
      (useSafeUser as jest.Mock).mockReturnValue({
        user: {
          id: 2,
          fullName: 'Bob Mentor',
          firstName: 'Bob',
          username: 'bob',
          role: 'MENTOR',
          primaryEmailAddress: { emailAddress: 'bob@pathfinder.dev' },
        },
        isLoaded: true,
        isSignedIn: true,
      });

      render(<Sidebar />);

      expect(screen.getByText('Mentor Connect')).toBeInTheDocument();
      expect(screen.getByText('1-on-1 Mentorship Feed')).toBeInTheDocument();
      expect(screen.queryByText('Platform Admin')).not.toBeInTheDocument();
    });

    it('renders Admin navigation for ADMIN role', () => {
      (useSafeUser as jest.Mock).mockReturnValue({
        user: {
          id: 3,
          fullName: 'Charlie Admin',
          firstName: 'Charlie',
          username: 'charlie',
          role: 'ADMIN',
          primaryEmailAddress: { emailAddress: 'admin@aven.com' },
        },
        isLoaded: true,
        isSignedIn: true,
      });

      render(<Sidebar />);

      expect(screen.getByText('Platform Admin')).toBeInTheDocument();
      expect(screen.getByText('Curriculum Explorer')).toBeInTheDocument();
    });
  });
});
