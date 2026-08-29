'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { Star, Send, ArrowRight } from 'lucide-react';
import { submitP2PFeedback } from '@/api/client';

export default function P2PFeedbackPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params?.id;
  const { user } = useUser();

  const [commScore, setCommScore] = useState<number>(0);
  const [techScore, setTechScore] = useState<number>(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user || !commScore || !techScore) {
      alert("Please provide both communication and technical ratings.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (typeof sessionId === 'string') {
        await submitP2PFeedback(sessionId, {
          user_id: user.id,
          communication_score: commScore,
          technical_score: techScore,
          feedback_text: feedbackText
        });
      }
      router.push('/learner/p2p-interview');
    } catch (err) {
      console.error(err);
      alert("Failed to submit feedback. Please try again.");
      setIsSubmitting(false);
    }
  };

  const StarRating = ({ score, setScore, label }: { score: number, setScore: (s: number) => void, label: string }) => (
    <div className="space-y-2">
      <label className="text-sm font-bold text-aven-text">{label}</label>
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            onClick={() => setScore(s)}
            className={`p-2 rounded-xl transition-all ${
              score >= s ? 'text-amber-500 bg-amber-50' : 'text-slate-300 hover:text-amber-300'
            }`}
          >
            <Star className="w-8 h-8" fill={score >= s ? 'currentColor' : 'none'} />
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-20 pt-12 px-4">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-aven-text">Session Complete!</h1>
        <p className="text-aven-text-subtle">
          Please provide feedback for your peer. This helps them grow and ensures a high-quality community.
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-aven-border shadow-xl p-8 space-y-8">
        <StarRating 
          score={commScore} 
          setScore={setCommScore} 
          label="Communication & Clarity" 
        />
        
        <StarRating 
          score={techScore} 
          setScore={setTechScore} 
          label="Technical Accuracy & Problem Solving" 
        />

        <div className="space-y-2">
          <label className="text-sm font-bold text-aven-text">Constructive Written Feedback</label>
          <textarea
            rows={4}
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            placeholder="What did they do well? What could they improve on?"
            className="w-full p-4 rounded-xl border border-aven-border focus:border-aven-primary focus:ring-4 focus:ring-aven-primary/10 text-sm outline-none transition-all"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-aven-primary text-white font-bold text-lg hover:opacity-90 shadow-md transition-all disabled:opacity-50"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Feedback & Exit'}
          {!isSubmitting && <ArrowRight className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
}
