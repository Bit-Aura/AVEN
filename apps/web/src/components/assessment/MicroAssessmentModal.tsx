'use client';

import { useState } from 'react';

export default function MicroAssessmentModal({ skillId, onClose }: { skillId: string, onClose: () => void }) {
  const [answer, setAnswer] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'passed' | 'failed'>('idle');
  const [feedback, setFeedback] = useState('');

  const handleSubmit = async () => {
    setStatus('submitting');
    try {
      const res = await fetch('/api/assessment/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillId, answer })
      });
      const data = await res.json();
      
      setStatus(data.isCorrect ? 'passed' : 'failed');
      setFeedback(data.feedback);
    } catch (e) {
      setStatus('failed');
      setFeedback('Error submitting assessment.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-white border-8 border-black shadow-brutal w-full max-w-2xl flex flex-col">
        <header className="bg-black text-white p-4 flex justify-between items-center">
          <h2 className="text-2xl font-black uppercase">Prove It: {skillId}</h2>
          <button onClick={onClose} className="text-2xl font-bold hover:text-neo-red">&times;</button>
        </header>

        <div className="p-8 flex flex-col gap-6">
          {status === 'idle' || status === 'submitting' ? (
            <>
              <p className="text-xl font-bold">Write a simple code snippet demonstrating this concept:</p>
              <textarea 
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                className="w-full h-40 border-4 border-black p-4 font-mono focus:outline-none focus:ring-4 focus:ring-neo-blue shadow-brutal-active resize-none"
                placeholder="def my_function():..."
                disabled={status === 'submitting'}
              />
              <button 
                onClick={handleSubmit}
                disabled={status === 'submitting'}
                className="bg-neo-blue text-white border-4 border-black text-2xl font-black uppercase py-4 shadow-brutal hover:shadow-brutal-active hover:translate-y-1 hover:translate-x-1 transition-all disabled:opacity-50"
              >
                {status === 'submitting' ? 'Evaluating...' : 'Submit'}
              </button>
            </>
          ) : (
            <div className={`p-6 border-4 border-black shadow-brutal ${status === 'passed' ? 'bg-neo-green' : 'bg-neo-red text-white'}`}>
              <h3 className="text-3xl font-black uppercase mb-4">
                {status === 'passed' ? 'Verified!' : 'Not Quite.'}
              </h3>
              <p className="text-xl font-bold bg-white text-black p-4 border-4 border-black">
                {feedback}
              </p>
              <button 
                onClick={onClose}
                className="mt-6 w-full bg-black text-white border-4 border-white text-xl font-black uppercase py-3 hover:bg-gray-800"
              >
                {status === 'passed' ? 'Continue Path' : 'Diagnose Root Cause'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
