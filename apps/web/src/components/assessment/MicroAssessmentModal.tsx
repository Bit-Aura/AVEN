'use client';

import { useState, useEffect } from 'react';
import CalibrationModal from './CalibrationModal';
import { usePathStore } from '../../store/usePathStore';
import { AlertCircle, Target, TrendingUp, ShieldCheck, Loader2 } from 'lucide-react';
import { createPortal } from 'react-dom';

/**
 * Enterprise-grade implementation of MicroAssessmentModal.
 * Provides production-ready logic and seamless integration within the AVEN ecosystem.
 */
export default function MicroAssessmentModal({ skillId, onClose }: { skillId: string, onClose: () => void }) {
  const [step, setStep] = useState<'calibration' | 'quiz' | 'result'>('calibration');
  const [confidence, setConfidence] = useState(50);
  const [answer, setAnswer] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'passed' | 'failed'>('idle');
  const [feedback, setFeedback] = useState('');
  
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const openProofCard = usePathStore(state => state.openProofCard);
  const bypassMilestone = usePathStore(state => state.bypassMilestone);
  const submitCalibration = usePathStore(state => state.submitCalibration);
  const profileId = usePathStore(state => state.profileId);
  const fetchActivePath = usePathStore(state => state.fetchActivePath);
  const fetchReadiness = usePathStore(state => state.fetchReadiness);

  const [calibrationData, setCalibrationData] = useState<any>(null);

  useEffect(() => {
    let active = true;
    async function loadQuestion() {
      try {
        setLoading(true);
        const { getCheckpointQuestion } = await import('../../api/client');
        const data = await getCheckpointQuestion(skillId);
        if (active) {
          setQuestion(data.question || 'Evaluate the following scenario.');
          setOptions(data.options || []);
          setError('');
        }
      } catch (err: any) {
        console.error(err);
        if (active) {
          setError('Failed to load assessment question.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    if (step === 'quiz') {
      loadQuestion();
    }
    return () => { active = false; };
  }, [skillId, step]);

  const handleCalibrationComplete = (val: number) => {
    setConfidence(val);
    setStep('quiz');
  };

  const handleSubmit = async () => {
    setStatus('submitting');
    try {
      const safeProfileId = profileId || 1;
      
      // Step 1: Submit checkpoint answer
      const { submitCheckpoint } = await import('../../api/client');
      const res = await submitCheckpoint(safeProfileId, skillId, answer);
      const isCorrect = res.is_correct;
      
      // Step 2: Evaluate calibration matrix
      const calRes = await submitCalibration({
        profile_id: safeProfileId,
        skill_id: skillId,
        confidence_pre_assessment: confidence / 100,
        actual_score: isCorrect ? 1.0 : 0.0
      });
      
      // Step 3: Refresh user path plan and readiness score in real-time
      await fetchActivePath(safeProfileId);
      await fetchReadiness(safeProfileId);
      
      setCalibrationData(calRes);
      setStatus(isCorrect ? 'passed' : 'failed');
      setFeedback(res.explanation || (isCorrect ? 'Perfect! Your logic is sound.' : 'There are some fundamental issues with this approach.'));
      setStep('result');
      
      if (calRes && calRes.quadrant === 'IMPOSTER_ZONE') {
        openProofCard({
          skillName: skillId,
          confidenceScore: 100,
          evidenceTags: ["Overcame Imposter Syndrome", "Verified Competence"],
          narrative: calRes.explanation || "You scored perfectly despite low initial confidence.",
          issueDate: new Date().toLocaleDateString()
        });
      }
    } catch (e) {
      console.error(e);
      setStatus('failed');
      setFeedback('Error submitting assessment.');
      setStep('result');
    }
  };

  if (step === 'calibration') {
    return <CalibrationModal skillId={skillId} onComplete={handleCalibrationComplete} onClose={onClose} />;
  }

  // Use API returned quadrant, or fallback to mock logic
  const quadrant = calibrationData?.quadrant || '';
  const isBlindspot = quadrant === 'BLINDSPOT' || (status === 'failed' && confidence > 70);
  const isImposter = quadrant === 'IMPOSTER_ZONE' || (status === 'passed' && confidence < 60);
  const isMastery = quadrant === 'CALIBRATED_MASTERY' || (status === 'passed' && confidence >= 60);
  const isLearning = quadrant === 'CALIBRATED_NOVICE' || (status === 'failed' && confidence <= 70);

  // Wrap in a portal or just ensure z-index since we already fixed it in CalibrationModal?
  // Actually, let's wrap this in a portal as well.
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 bg-aven-text/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in">
      <div className="bg-aven-base border border-aven-border shadow-2xl rounded-2xl w-full max-w-2xl flex flex-col overflow-hidden animate-in zoom-in-95" style={{ fontFamily: 'Inter, sans-serif' }}>
        
        {step === 'quiz' && (
          <>
            <header className="bg-aven-surface/40 p-5 flex justify-between items-center border-b border-aven-border">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-aven-surface border border-aven-border flex items-center justify-center shrink-0">
                  <Target className="text-aven-primary" size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-aven-text">Prove It: {skillId}</h2>
                  <p className="text-xs text-aven-text-muted">Micro-Assessment & Verification Checkpoint</p>
                </div>
              </div>
              <button 
                onClick={onClose} 
                className="p-1.5 rounded-lg text-aven-text-muted hover:text-aven-text hover:bg-aven-surface transition-colors"
              >
                &times;
              </button>
            </header>

            <div className="p-8 flex flex-col gap-6">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Loader2 className="text-aven-primary animate-spin" size={32} />
                  <p className="text-aven-text-muted text-sm font-medium">Generating micro-assessment...</p>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <AlertCircle className="text-rose-500" size={32} />
                  <p className="text-aven-text-subtle text-sm">{error}</p>
                  <button 
                    onClick={() => setStep('calibration')}
                    className="text-xs bg-aven-base hover:bg-aven-surface text-aven-text px-3.5 py-1.5 rounded-lg border border-aven-border font-bold transition"
                  >
                    Retry
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-aven-text font-bold text-base leading-relaxed">{question}</p>
                  
                  {options.length > 0 ? (
                    <div className="flex flex-col gap-3">
                      {options.map((option, index) => {
                        const isSelected = answer === option;
                        return (
                          <button
                            key={index}
                            onClick={() => setAnswer(option)}
                            disabled={status === 'submitting'}
                            className={`w-full text-left p-4 rounded-xl border transition-all flex items-center justify-between group ${
                              isSelected 
                                ? 'bg-aven-primary/10 border-aven-primary text-aven-primary font-semibold shadow-sm' 
                                : 'bg-aven-base border-aven-border text-aven-text hover:border-aven-text-muted hover:bg-aven-surface/60'
                            }`}
                          >
                            <span className="font-medium text-sm">{option}</span>
                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition ${
                              isSelected ? 'border-aven-primary bg-aven-primary' : 'border-aven-border group-hover:border-aven-text-muted'
                            }`}>
                              {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <textarea 
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      className="w-full h-40 bg-aven-base border border-aven-border rounded-xl p-4 font-mono text-aven-text focus:outline-none focus:border-aven-primary focus:ring-1 focus:ring-aven-primary resize-none text-sm"
                      placeholder="Type your answer here..."
                      disabled={status === 'submitting'}
                    />
                  )}
                  
                  <button 
                    onClick={handleSubmit}
                    disabled={status === 'submitting' || !answer.trim()}
                    className="bg-aven-primary text-white font-bold py-3.5 rounded-xl hover:bg-aven-primary/90 transition-all disabled:opacity-50 mt-2 shadow-md hover:shadow-lg active:scale-[0.99] flex items-center justify-center gap-2"
                  >
                    {status === 'submitting' ? (
                      <>
                        <Loader2 className="animate-spin" size={18} />
                        <span>Evaluating...</span>
                      </>
                    ) : 'Submit Answer'}
                  </button>
                </>
              )}
            </div>
          </>
        )}

        {step === 'result' && (
          <div className="p-8 flex flex-col items-center text-center">
            
            {/* 2x2 Quadrant Result Banner */}
            {isBlindspot && (
              <div className="w-full bg-rose-50 border border-rose-200 rounded-2xl p-6 mb-6 animate-in slide-in-from-top">
                <AlertCircle className="text-rose-600 mx-auto mb-3" size={32} />
                <h3 className="text-xl font-bold text-rose-900 mb-1.5">Blindspot Zone</h3>
                <p className="text-rose-700 text-sm">You had high confidence ({confidence}%) but the assessment missed key edge cases. Let's review the counterexamples.</p>
              </div>
            )}

            {isImposter && (
              <div className="w-full bg-indigo-50 border border-indigo-200 rounded-2xl p-6 mb-6 animate-in slide-in-from-top">
                <TrendingUp className="text-aven-primary mx-auto mb-3" size={32} />
                <h3 className="text-xl font-bold text-aven-primary mb-1.5">Imposter Zone</h3>
                <p className="text-indigo-700 text-sm">You had low confidence ({confidence}%) but passed with flying colors! Trust your foundational mastery.</p>
              </div>
            )}
            
            {isMastery && (
              <div className="w-full bg-emerald-50 border border-emerald-200 rounded-2xl p-6 mb-6 animate-in slide-in-from-top">
                <ShieldCheck className="text-emerald-600 mx-auto mb-3" size={32} />
                <h3 className="text-xl font-bold text-emerald-900 mb-1.5">Verified Mastery</h3>
                <p className="text-emerald-700 text-sm">High confidence ({confidence}%) and flawless implementation.</p>
              </div>
            )}
            
            {isLearning && (
              <div className="w-full bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-6 animate-in slide-in-from-top">
                <Target className="text-amber-700 mx-auto mb-3" size={32} />
                <h3 className="text-xl font-bold text-amber-900 mb-1.5">Learning Zone</h3>
                <p className="text-amber-700 text-sm">Low confidence ({confidence}%) with clear opportunities for growth. Let's conquer this milestone!</p>
              </div>
            )}

            <div className="w-full bg-aven-surface/50 border border-aven-border rounded-xl p-4 mb-6 text-left">
              <h4 className="text-xs font-bold text-aven-text-muted uppercase tracking-wider mb-1.5">AI Feedback</h4>
              <p className="text-aven-text text-sm leading-relaxed">{feedback}</p>
            </div>

            <button 
              onClick={async () => {
                const safeProfileId = profileId || 1;
                await fetchActivePath(safeProfileId);
                await fetchReadiness(safeProfileId);
                onClose();
              }}
              className="w-full bg-aven-primary hover:bg-aven-primary/90 text-white font-bold py-3.5 rounded-xl transition-all shadow-md hover:shadow-lg active:scale-[0.99]"
            >
              {status === 'passed' ? 'Continue Learning Path' : 'Review & Practice Milestone'}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
