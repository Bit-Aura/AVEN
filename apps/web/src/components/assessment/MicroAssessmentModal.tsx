'use client';

import { useState, useEffect } from 'react';
import CalibrationModal from './CalibrationModal';
import { usePathStore } from '../../store/usePathStore';
import { AlertCircle, Target, TrendingUp, ShieldCheck, Loader2 } from 'lucide-react';
import { createPortal } from 'react-dom';

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
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-slate-900 border border-slate-700 shadow-2xl rounded-2xl w-full max-w-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
        
        {step === 'quiz' && (
          <>
            <header className="bg-slate-800 p-4 flex justify-between items-center border-b border-slate-700">
              <div className="flex items-center gap-2">
                <Target className="text-aven-primary" size={20} />
                <h2 className="text-lg font-bold text-aven-text">Prove It: {skillId}</h2>
              </div>
              <button onClick={onClose} className="text-aven-text-subtle hover:text-aven-text transition-colors">&times;</button>
            </header>

            <div className="p-8 flex flex-col gap-6">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Loader2 className="text-indigo-500 animate-spin" size={32} />
                  <p className="text-aven-text-subtle text-sm">Generating micro-assessment...</p>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <AlertCircle className="text-rose-500" size={32} />
                  <p className="text-aven-text-subtle text-sm">{error}</p>
                  <button 
                    onClick={() => setStep('calibration')}
                    className="text-xs bg-slate-800 hover:bg-slate-700 text-aven-text-subtle px-3 py-1.5 rounded-lg border border-slate-700"
                  >
                    Retry
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-aven-text font-semibold text-base leading-relaxed">{question}</p>
                  
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
                                ? 'bg-indigo-600/20 border-indigo-500 text-aven-primary' 
                                : 'bg-slate-950 border-slate-800 text-aven-text-subtle hover:border-slate-700 hover:bg-slate-900/30'
                            }`}
                          >
                            <span className="font-medium text-sm">{option}</span>
                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                              isSelected ? 'border-indigo-500 bg-indigo-600' : 'border-slate-700 group-hover:border-slate-600'
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
                      className="w-full h-40 bg-slate-950 border border-slate-700 rounded-xl p-4 font-mono text-aven-text-subtle focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none"
                      placeholder="Type your answer here..."
                      disabled={status === 'submitting'}
                    />
                  )}
                  
                  <button 
                    onClick={handleSubmit}
                    disabled={status === 'submitting' || !answer.trim()}
                    className="bg-indigo-600 text-aven-text font-bold py-3 rounded-xl hover:bg-indigo-500 transition-all disabled:opacity-50 mt-2"
                  >
                    {status === 'submitting' ? 'Evaluating...' : 'Submit Answer'}
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
              <div className="w-full bg-rose-950/40 border border-rose-500/50 rounded-xl p-6 mb-8 animate-in slide-in-from-top">
                <AlertCircle className="text-rose-500 mx-auto mb-3" size={32} />
                <h3 className="text-xl font-bold text-rose-400 mb-2">Blindspot Zone</h3>
                <p className="text-aven-text-subtle text-sm">You had high confidence ({confidence}%) but the assessment failed. Let's review the counterexamples.</p>
              </div>
            )}

            {isImposter && (
              <div className="w-full bg-indigo-950/40 border border-indigo-500/50 rounded-xl p-6 mb-8 animate-in slide-in-from-top">
                <TrendingUp className="text-aven-primary mx-auto mb-3" size={32} />
                <h3 className="text-xl font-bold text-aven-primary mb-2">Imposter Zone</h3>
                <p className="text-aven-text-subtle text-sm">You had low confidence ({confidence}%) but passed perfectly! Trust your skills.</p>
              </div>
            )}
            
            {isMastery && (
              <div className="w-full bg-emerald-950/40 border border-emerald-500/50 rounded-xl p-6 mb-8 animate-in slide-in-from-top">
                <ShieldCheck className="text-emerald-400 mx-auto mb-3" size={32} />
                <h3 className="text-xl font-bold text-emerald-400 mb-2">Verified Mastery</h3>
                <p className="text-aven-text-subtle text-sm">High confidence ({confidence}%) and perfect execution.</p>
              </div>
            )}
            
            {isLearning && (
              <div className="w-full bg-slate-800/80 border border-slate-700 rounded-xl p-6 mb-8 animate-in slide-in-from-top">
                <Target className="text-aven-text-subtle mx-auto mb-3" size={32} />
                <h3 className="text-xl font-bold text-aven-text-subtle mb-2">Learning Zone</h3>
                <p className="text-aven-text-subtle text-sm">Low confidence ({confidence}%) and room for improvement. Let's keep learning!</p>
              </div>
            )}

            <div className="w-full bg-slate-950/50 border border-slate-800 rounded-lg p-4 mb-8 text-left">
              <h4 className="text-xs font-bold text-aven-text-muted uppercase tracking-wider mb-2">AI Feedback</h4>
              <p className="text-aven-text-subtle">{feedback}</p>
            </div>

            <button 
              onClick={async () => {
                const safeProfileId = profileId || 1;
                await fetchActivePath(safeProfileId);
                await fetchReadiness(safeProfileId);
                onClose();
              }}
              className={`w-full font-bold py-3 rounded-xl transition-all ${
                status === 'passed' ? 'bg-emerald-600 hover:bg-emerald-500 text-aven-text' : 'bg-slate-700 hover:bg-slate-600 text-aven-text'
              }`}
            >
              {status === 'passed' ? 'Continue Path' : 'Diagnose Root Cause'}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
