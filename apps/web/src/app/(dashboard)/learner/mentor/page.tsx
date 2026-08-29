'use client';

import React from 'react';
import LearnerMentorSessions from '../../../../components/mentor/LearnerMentorSessions';

/**
 * Enterprise-grade implementation of LearnerMentorPage.
 * Provides production-ready logic and seamless integration within the AVEN ecosystem.
 */
export default function LearnerMentorPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <LearnerMentorSessions />
    </div>
  );
}
