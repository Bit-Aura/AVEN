import React from 'react';
import { render, screen } from '@testing-library/react';
import OfflineSyncBanner from '../OfflineSyncBanner';
import { usePathStore } from '../../store/usePathStore';

jest.mock('../../store/usePathStore', () => ({
  usePathStore: jest.fn()
}));

describe('OfflineSyncBanner Component', () => {
  beforeEach(() => {
    (usePathStore as unknown as jest.Mock).mockImplementation((selector) => {
      return selector({ isOffline: true, syncQueue: ['n1', 'n2'], toggleOffline: jest.fn() });
    });
  });

  it('renders offline warning and queue size', () => {
    render(<OfflineSyncBanner />);
    expect(screen.getByText(/You are offline/i)).toBeInTheDocument();
    expect(screen.getByText(/2 items queued/i)).toBeInTheDocument();
  });
});\n