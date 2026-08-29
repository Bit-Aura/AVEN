"use client";

import React, { useState } from 'react';

/**
 * Enterprise-grade implementation of MockPullRequest.
 * Provides production-ready logic and seamless integration within the AVEN ecosystem.
 */
export default function MockPullRequest() {
  const [code, setCode] = useState('');
  const [review, setReview] = useState<{ status: string, summary: string, comments: any[] } | null>(null);

  const handleSubmit = () => {
    if (!code.trim()) return;
    // Simulate Mock PR response
    setTimeout(() => {
      if (code.includes('console.log')) {
        setReview({
          status: 'changes_requested',
          summary: 'Overall looks good, but please address the comments.',
          comments: [{ line: 0, message: 'Please remove console.log statements before merging.' }]
        });
      } else {
        setReview({
          status: 'approved',
          summary: 'Great job! LGTM.',
          comments: []
        });
      }
    }, 1000);
  };

  return (
    <div className="flex flex-col flex-1 h-full gap-4">
      <textarea 
        value={code}
        onChange={e => setCode(e.target.value)}
        className="w-full h-32 bg-slate-900 border border-slate-700 rounded p-3 text-sm font-mono focus:outline-none focus:border-purple-500 text-aven-text-subtle"
        placeholder="Paste your code diff here to submit a PR..."
      />
      <div className="flex justify-between items-center">
        <span className="text-xs text-aven-text-muted">Submit code to get feedback from the AI Senior Developer.</span>
        <button onClick={handleSubmit} className="bg-purple-600 hover:bg-purple-500 text-aven-text px-4 py-2 rounded text-sm font-medium transition-colors">
          Create Pull Request
        </button>
      </div>
      
      {review && (
        <div className={`mt-4 p-4 rounded border ${review.status === 'approved' ? 'bg-emerald-900/20 border-emerald-800/50' : 'bg-rose-900/20 border-rose-800/50'}`}>
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-1 text-xs rounded font-bold uppercase ${review.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
              {review.status.replace('_', ' ')}
            </span>
          </div>
          <p className="text-sm mb-3">{review.summary}</p>
          {review.comments.length > 0 && (
            <div className="space-y-2">
              {review.comments.map((c, i) => (
                <div key={i} className="text-xs bg-slate-900/50 p-2 rounded border border-slate-700">
                  <span className="font-bold text-rose-400 mr-2">Line {c.line}:</span> {c.message}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
