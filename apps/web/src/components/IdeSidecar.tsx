'use client';

import { usePathStore } from '../store/usePathStore';
import {
  Play,
  CheckCircle,
  TerminalSquare,
  Sparkles,
  AlertTriangle,
  Lightbulb,
  BookOpen,
  ArrowRight,
  TrendingUp,
  Cpu,
  Layers,
  RotateCcw,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Loader2
} from 'lucide-react';
import { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import {
  executeCode,
  generateCodingChallenge,
  evaluateCodeSolution,
  CodingQuestionResponse,
  CodeEvaluationResponse
} from '../api/client';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';

const DEFAULT_PYTHON = `def solve(*args, **kwargs):\n    # Write your solution here\n    return False\n`;
const DEFAULT_TYPESCRIPT = `export function solve(...args: any[]) {\n  // Write your solution here\n  return false;\n}\n`;

export default function IdeSidecar() {
  const activeIdeNodeId = usePathStore((state) => state.activeIdeNodeId);
  const closeIde = usePathStore((state) => state.closeIde);
  const completeMilestoneViaIde = usePathStore((state) => state.completeMilestoneViaIde);
  const submitIdeTelemetry = usePathStore((state) => state.submitIdeTelemetry);
  const profileId = usePathStore((state) => state.profileId);
  const targetRole = usePathStore((state) => state.targetRole) || "Backend Software Engineer";
  const fetchActivePath = usePathStore((state) => state.fetchActivePath);
  const fetchReadiness = usePathStore((state) => state.fetchReadiness);

  const [language, setLanguage] = useState<'python' | 'typescript'>('python');
  const [code, setCode] = useState(DEFAULT_PYTHON);
  const [output, setOutput] = useState<string | null>(null);

  // Local execution state
  const [isRunning, setIsRunning] = useState(false);
  const [isLocalPassed, setIsLocalPassed] = useState(false);

  // Challenge Generation state
  const [challenge, setChallenge] = useState<CodingQuestionResponse | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [challengeError, setChallengeError] = useState<string | null>(null);

  // AI Evaluation state
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<CodeEvaluationResponse | null>(null);
  const [evalError, setEvalError] = useState<string | null>(null);

  // Navigation tab for the sidecar panel
  const [activeTab, setActiveTab] = useState<'problem' | 'examples' | 'hints' | 'evaluation'>('problem');
  const [showHints, setShowHints] = useState<boolean[]>([]);
  
  // Custom dropdown state
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);

  // 1. Fetch AI coding question when active node or language changes
  useEffect(() => {
    if (!activeIdeNodeId) return;

    let isMounted = true;
    const fetchChallenge = async () => {
      setIsGenerating(true);
      setChallengeError(null);
      setEvaluation(null);
      setEvalError(null);
      setOutput(null);
      setIsLocalPassed(false);
      setActiveTab('problem');

      try {
        const generated = await generateCodingChallenge({
          node_id: activeIdeNodeId,
          target_role: targetRole,
          skill_name: activeIdeNodeId.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          difficulty: "Intermediate",
          programming_language: language,
          profile_id: profileId || undefined
        });

        if (isMounted) {
          setChallenge(generated);
          setShowHints(new Array(generated.hints?.length || 0).fill(false));

          // Check if learner has saved code in localStorage, otherwise use AI starter code
          const storageKey = `aven_ide_${activeIdeNodeId}_${language}`;
          const saved = localStorage.getItem(storageKey);
          if (saved) {
            setCode(saved);
          } else if (generated.starter_code) {
            setCode(generated.starter_code);
          } else {
            setCode(language === 'python' ? DEFAULT_PYTHON : DEFAULT_TYPESCRIPT);
          }
        }
      } catch (err: any) {
        console.error("Failed to generate challenge", err);
        if (isMounted) {
          setChallengeError("Could not generate AI challenge. Using standard milestone template.");
          const defaultCode = language === 'python' ? DEFAULT_PYTHON : DEFAULT_TYPESCRIPT;
          setCode(defaultCode);
        }
      } finally {
        if (isMounted) setIsGenerating(false);
      }
    };

    fetchChallenge();

    return () => {
      isMounted = false;
    };
  }, [activeIdeNodeId, language, targetRole, profileId]);

  // 2. Auto-save code to localStorage
  useEffect(() => {
    if (!activeIdeNodeId) return;
    const storageKey = `aven_ide_${activeIdeNodeId}_${language}`;
    localStorage.setItem(storageKey, code);
  }, [code, activeIdeNodeId, language]);

  if (!activeIdeNodeId) return null;

  // Handle local Python sandbox run
  const handleRunLocal = async () => {
    setIsRunning(true);
    setOutput('> Compiling and testing solution...');
    const startTime = performance.now();

    try {
      const res = await executeCode(
        language,
        code,
        activeIdeNodeId,
        challenge?.hidden_tests || ""
      );
      const executionTimeMs = Math.round(performance.now() - startTime);

      let newOutput = "";
      if (res.stdout) newOutput += res.stdout + "\n";
      if (res.stderr) newOutput += "ERROR:\n" + res.stderr + "\n";

      const hasSyntaxError =
        res.stderr &&
        (res.stderr.includes("SyntaxError") || res.stderr.includes("IndentationError"));

      if (res.is_passing) {
        newOutput += "\n✅ Local test assertions passed! Ready for Claude AI Comprehensive Evaluation.";
        setIsLocalPassed(true);

        try {
          await submitIdeTelemetry({
            milestone_id: activeIdeNodeId,
            code: code,
            passed: true,
            execution_time_ms: executionTimeMs,
            language,
            error_type: null
          });
        } catch (e) {
          console.error("Telemetry error", e);
        }
      } else {
        newOutput += "\n❌ Tests or assertions failed. Review your logic or run Claude AI Evaluation for feedback.";
        setIsLocalPassed(false);

        try {
          await submitIdeTelemetry({
            milestone_id: activeIdeNodeId,
            code: code,
            passed: false,
            execution_time_ms: executionTimeMs,
            language,
            error_type: hasSyntaxError ? 'syntax_error' : 'test_failure'
          });
        } catch (e) {
          console.error("Telemetry error", e);
        }
      }

      setOutput(newOutput);
    } catch (e: any) {
      setOutput(`Failed to run code: ${e.message}`);
      setIsLocalPassed(false);
    } finally {
      setIsRunning(false);
    }
  };

  // Handle Claude AI Comprehensive Evaluation
  const handleEvaluateSolution = async () => {
    if (isEvaluating) return;
    setIsEvaluating(true);
    setEvalError(null);
    setActiveTab('evaluation');

    try {
      const result = await evaluateCodeSolution({
        node_id: activeIdeNodeId,
        programming_language: language,
        submitted_code: code,
        problem_statement: challenge?.problem_statement || "Implement solution for milestone.",
        problem_title: challenge?.title || activeIdeNodeId,
        question_id: challenge?.question_id,
        profile_id: profileId || undefined,
        target_role: targetRole,
        skill_name: challenge?.skill || activeIdeNodeId,
        expected_concepts: challenge?.expected_concepts,
        evaluation_rubric: challenge?.evaluation_rubric,
        hints: challenge?.hints
      });

      setEvaluation(result);

      // Submit telemetry if score is good
      if (result.is_passing) {
        try {
          await submitIdeTelemetry({
            milestone_id: activeIdeNodeId,
            code: code,
            passed: true,
            execution_time_ms: 120,
            language,
            error_type: null
          });
        } catch (e) {
          console.error("Telemetry error", e);
        }
      }
    } catch (err: any) {
      console.error("Evaluation failed", err);
      setEvalError(err.message || "Claude AI evaluation encountered an error. Please try again.");
    } finally {
      setIsEvaluating(false);
    }
  };

  // Handle Complete Milestone
  const handleCompleteMilestone = async () => {
    completeMilestoneViaIde(activeIdeNodeId);
    if (profileId) {
      await fetchActivePath(profileId);
      await fetchReadiness(profileId);
    }
  };

  // Reset starter code
  const handleResetCode = () => {
    if (challenge?.starter_code) {
      setCode(challenge.starter_code);
    } else {
      setCode(language === 'python' ? DEFAULT_PYTHON : DEFAULT_TYPESCRIPT);
    }
  };

  const getVerdictBadge = (verdict: string) => {
    switch (verdict) {
      case 'excellent':
        return <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-[#141413] text-[#faf9f5] border border-[#141413]">🏆 Excellent</span>;
      case 'good':
        return <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-[#3d3d3a] text-[#faf9f5] border border-[#3d3d3a]">✅ Good</span>;
      case 'partial':
        return <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-[#e8e6dc] text-[#141413] border border-[#d6d3c4]">⚠️ Partial</span>;
      case 'needs_improvement':
        return <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-[#faf9f5] text-[#141413] border border-[#141413]">🔄 Needs Improvement</span>;
      default:
        return <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-[#faf9f5] text-[#141413] border-2 border-[#141413]">❌ Incorrect</span>;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-[#faf9f5] border-[#141413] bg-[#141413]';
    if (score >= 70) return 'text-[#faf9f5] border-[#3d3d3a] bg-[#3d3d3a]';
    if (score >= 50) return 'text-[#141413] border-[#d6d3c4] bg-[#e8e6dc]';
    return 'text-[#141413] border-[#141413] bg-[#faf9f5]';
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#141413]/20 backdrop-blur-sm font-sans antialiased">
      <div className="flex flex-col h-[90vh] max-h-[900px] w-full max-w-[1200px] bg-[#faf9f5] text-[#141413] rounded-2xl overflow-hidden border border-[#d6d3c4] shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#d6d3c4] bg-[#e8e6dc] shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#141413] border border-[#141413] flex items-center justify-center text-[#faf9f5] shadow-sm">
            <TerminalSquare size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-[#141413] tracking-tight">AI Coding Sandbox</span>
              <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-[#3d3d3a] text-[#faf9f5] border border-[#3d3d3a]">
                Claude Sonnet
              </span>
            </div>
            <p className="text-[11px] text-[#3d3d3a] truncate max-w-[320px] font-medium">
              {targetRole} • {activeIdeNodeId.replace(/_/g, ' ')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
              className="bg-[#faf9f5] text-xs text-[#141413] px-3 py-1.5 rounded-md outline-none border border-[#d6d3c4] hover:border-[#141413] font-bold transition-colors flex items-center gap-2 min-w-[120px] justify-between"
            >
              <span>{language === 'python' ? 'Python 3.10' : 'TypeScript 5.0'}</span>
              <span className="text-[10px]">▼</span>
            </button>
            {isLangDropdownOpen && (
              <div className="absolute top-full mt-1 right-0 w-full bg-[#faf9f5] border border-[#d6d3c4] rounded-md shadow-xl overflow-hidden z-[120]">
                <button
                  onClick={() => { setLanguage('python'); setIsLangDropdownOpen(false); }}
                  className={`w-full text-left px-3 py-2 text-xs font-bold hover:bg-[#d6d3c4] transition-colors ${language === 'python' ? 'bg-[#e8e6dc] text-[#141413]' : 'text-[#3d3d3a]'}`}
                >
                  Python 3.10
                </button>
                <button
                  onClick={() => { setLanguage('typescript'); setIsLangDropdownOpen(false); }}
                  className={`w-full text-left px-3 py-2 text-xs font-bold hover:bg-[#d6d3c4] transition-colors ${language === 'typescript' ? 'bg-[#e8e6dc] text-[#141413]' : 'text-[#3d3d3a]'}`}
                >
                  TypeScript 5.0
                </button>
              </div>
            )}
          </div>
          <button
            onClick={closeIde}
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[#d6d3c4] text-[#87867f] hover:text-[#141413] transition-colors"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Main Panels */}
      <div className="flex-1 overflow-hidden">
        <PanelGroup orientation="horizontal" className="h-full w-full">
          {/* Left Panel: Context, Challenge, Examples, Hints, Evaluation */}
          <Panel defaultSize={40} minSize={20} className="border-r border-[#d6d3c4]">
            <div className="h-full flex flex-col bg-[#faf9f5]">
              {/* Tab Navigation */}
              <div className="flex items-center gap-1 px-3 pt-2 border-b border-[#d6d3c4] bg-[#e8e6dc] shrink-0 text-xs">
                <button
                  onClick={() => setActiveTab('problem')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 border-b-2 font-medium transition-colors ${
                    activeTab === 'problem'
                      ? 'border-[#141413] text-[#141413] bg-[#faf9f5] font-bold'
                      : 'border-transparent text-[#87867f] hover:text-[#141413]'
                  }`}
                >
                  <BookOpen size={14} /> Problem
                </button>
                <button
                  onClick={() => setActiveTab('examples')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 border-b-2 font-medium transition-colors ${
                    activeTab === 'examples'
                      ? 'border-[#141413] text-[#141413] bg-[#faf9f5] font-bold'
                      : 'border-transparent text-[#87867f] hover:text-[#141413]'
                  }`}
                >
                  <Layers size={14} /> Examples ({challenge?.examples?.length || 0})
                </button>
                <button
                  onClick={() => setActiveTab('hints')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 border-b-2 font-medium transition-colors ${
                    activeTab === 'hints'
                      ? 'border-[#141413] text-[#141413] bg-[#faf9f5] font-bold'
                      : 'border-transparent text-[#87867f] hover:text-[#141413]'
                  }`}
                >
                  <Lightbulb size={14} /> Hints ({challenge?.hints?.length || 0})
                </button>
                {evaluation && (
                  <button
                    onClick={() => setActiveTab('evaluation')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 border-b-2 font-medium transition-colors ${
                      activeTab === 'evaluation'
                        ? 'border-[#141413] text-[#141413] bg-[#faf9f5] font-bold'
                        : 'border-transparent text-[#141413] hover:opacity-70 font-bold'
                    }`}
                  >
                    <Sparkles size={14} /> AI Review ({evaluation.score}/100)
                  </button>
                )}
              </div>

              {/* Tab Content Area */}
              <div className="flex-1 overflow-y-auto p-4 text-sm text-[#3d3d3a]">
                {isGenerating ? (
                  <div className="flex flex-col items-center justify-center h-full py-8 text-center space-y-3">
                    <Loader2 className="animate-spin text-[#141413]" size={28} />
                    <p className="text-sm text-[#3d3d3a] font-medium">Generating Claude AI coding challenge...</p>
                    <p className="text-xs text-[#87867f] max-w-sm">
                      Aligning problem parameters with {targetRole} requirements and your skill graph.
                    </p>
                  </div>
                ) : challengeError ? (
                  <div className="p-3 bg-[#e8e6dc] border border-[#141413] rounded-lg text-[#141413] font-bold text-xs">
                    {challengeError}
                  </div>
                ) : activeTab === 'problem' ? (
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h2 className="text-base font-bold text-[#141413] tracking-tight">
                          {challenge?.title || activeIdeNodeId.replace(/_/g, ' ').toUpperCase()}
                        </h2>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="px-2 py-0.5 text-[11px] rounded font-medium bg-[#3d3d3a] text-[#faf9f5] border border-[#3d3d3a]">
                            {challenge?.skill || activeIdeNodeId}
                          </span>
                          <span className="px-2 py-0.5 text-[11px] rounded font-medium bg-[#e8e6dc] text-[#141413] border border-[#d6d3c4]">
                            {challenge?.difficulty || "Intermediate"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="prose prose-sm max-w-none text-[#3d3d3a] leading-relaxed whitespace-pre-wrap">
                      {challenge?.problem_statement || "Implement the solution to pass evaluation."}
                    </div>

                    {challenge?.constraints && challenge.constraints.length > 0 && (
                      <div className="pt-2 border-t border-[#27272a]">
                        <h4 className="text-xs font-semibold text-[#141413] mb-1.5 flex items-center gap-1">
                          <Cpu size={13} className="text-[#3d3d3a]" /> Constraints:
                        </h4>
                        <ul className="list-disc list-inside space-y-1 text-xs text-[#3d3d3a] font-mono">
                          {challenge.constraints.map((c, i) => (
                            <li key={i}>{c}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : activeTab === 'examples' ? (
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold text-[#3d3d3a]">Input & Output Specifications</h3>
                    {challenge?.examples && challenge.examples.length > 0 ? (
                      challenge.examples.map((ex, idx) => (
                        <div key={idx} className="p-3 bg-[#e8e6dc] border border-[#d6d3c4] rounded-lg text-xs space-y-2">
                          <div className="font-semibold text-[#141413] font-bold">Example {idx + 1}</div>
                          <div>
                            <span className="text-[#87867f] font-mono">Input: </span>
                            <span className="text-[#141413] font-mono bg-[#faf9f5] px-1.5 py-0.5 rounded">{ex.input}</span>
                          </div>
                          <div>
                            <span className="text-[#87867f] font-mono">Output: </span>
                            <span className="text-[#141413] font-bold font-mono bg-[#faf9f5] px-1.5 py-0.5 rounded">{ex.output}</span>
                          </div>
                          {ex.explanation && (
                            <div className="text-[#3d3d3a] italic pt-1 border-t border-[#d6d3c4]">
                              {ex.explanation}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-[#87867f]">No examples provided for this challenge.</p>
                    )}
                  </div>
                ) : activeTab === 'hints' ? (
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold text-[#3d3d3a] flex items-center gap-1.5">
                      <Lightbulb size={14} className="text-[#141413]" /> Progressive Guidance
                    </h3>
                    {challenge?.hints && challenge.hints.length > 0 ? (
                      challenge.hints.map((hint, idx) => (
                        <div key={idx} className="border border-[#d6d3c4] rounded-lg bg-[#e8e6dc] overflow-hidden">
                          <button
                            onClick={() => {
                              const updated = [...showHints];
                              updated[idx] = !updated[idx];
                              setShowHints(updated);
                            }}
                            className="w-full text-left px-3 py-2 text-xs font-medium text-[#3d3d3a] hover:bg-[#d6d3c4] flex justify-between items-center transition-colors"
                          >
                            <span>Hint {idx + 1}</span>
                            <span className="text-[#87867f] text-[10px]">{showHints[idx] ? 'Hide' : 'Reveal'}</span>
                          </button>
                          {showHints[idx] && (
                            <div className="px-3 py-2 text-xs text-[#3d3d3a] bg-[#faf9f5] border-t border-[#d6d3c4] leading-relaxed">
                              {hint}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-[#87867f]">No hints available.</p>
                    )}
                  </div>
                ) : activeTab === 'evaluation' ? (
                  <div className="space-y-4">
                    {isEvaluating ? (
                      <div className="py-10 text-center space-y-3">
                        <Loader2 className="animate-spin text-[#141413] mx-auto" size={32} />
                        <h4 className="text-sm font-bold text-[#141413] tracking-tight">Claude AI Evaluation in Progress</h4>
                        <p className="text-xs text-[#3d3d3a] max-w-md mx-auto leading-relaxed">
                          Performing static algorithmic inspection, time/space complexity derivation, edge-case coverage, and clean code scoring...
                        </p>
                      </div>
                    ) : evalError ? (
                      <div className="p-3 bg-[#faf9f5] border-2 border-[#141413] rounded-lg text-[#141413] font-bold text-xs">
                        <div className="font-semibold mb-1">Evaluation Error</div>
                        {evalError}
                      </div>
                    ) : evaluation ? (
                      <div className="space-y-4 animate-in fade-in duration-200">
                        {/* Score Card Banner */}
                        <div className="p-4 rounded-xl bg-[#e8e6dc] border border-[#d6d3c4] flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`w-14 h-14 rounded-full flex flex-col items-center justify-center border-2 font-bold ${getScoreColor(evaluation.score)}`}>
                              <span className="text-base leading-none">{evaluation.score}</span>
                              <span className="text-[9px] opacity-70">/100</span>
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-bold text-[#141413] text-base">Evaluation Verdict</h3>
                                {getVerdictBadge(evaluation.verdict)}
                              </div>
                              <p className="text-xs text-[#3d3d3a] mt-0.5">{evaluation.summary}</p>
                            </div>
                          </div>
                        </div>

                        {/* Notice on Methodology */}
                        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-[#faf9f5] border border-[#d6d3c4] text-[11px] text-[#141413] font-bold">
                          <Sparkles size={14} className="shrink-0 text-[#141413]" />
                          <span>{evaluation.evaluation_note || "AI evaluation is based on static code analysis and algorithmic reasoning."}</span>
                        </div>

                        {/* Dimension Subscores */}
                        <div className="grid grid-cols-3 gap-2">
                          <div className="p-2.5 rounded-lg bg-[#faf9f5] border border-[#d6d3c4] text-center">
                            <div className="text-[10px] text-[#3d3d3a] uppercase font-medium">Correctness</div>
                            <div className="text-base font-bold text-[#141413] mt-0.5">{evaluation.correctness_score}%</div>
                          </div>
                          <div className="p-2.5 rounded-lg bg-[#faf9f5] border border-[#d6d3c4] text-center">
                            <div className="text-[10px] text-[#3d3d3a] uppercase font-medium">Algorithm / Logic</div>
                            <div className="text-base font-bold text-[#141413] mt-0.5">{evaluation.reasoning_score}%</div>
                          </div>
                          <div className="p-2.5 rounded-lg bg-[#faf9f5] border border-[#d6d3c4] text-center">
                            <div className="text-[10px] text-[#3d3d3a] uppercase font-medium">Code Quality</div>
                            <div className="text-base font-bold text-[#141413] mt-0.5">{evaluation.code_quality_score}%</div>
                          </div>
                        </div>

                        {/* Complexity Cards */}
                        {evaluation.complexity_analysis && (
                          <div className="p-3 bg-[#faf9f5] border border-[#d6d3c4] rounded-lg text-xs space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-[#141413] flex items-center gap-1.5">
                                <TrendingUp size={14} className="text-[#141413]" /> Complexity Analysis
                              </span>
                              <div className="flex items-center gap-2 font-mono">
                                <span className="bg-[#141413] text-[#faf9f5] font-bold px-2 py-0.5 rounded border border-[#141413] text-[10px]">
                                  Time: {evaluation.complexity_analysis.time_complexity}
                                </span>
                                <span className="bg-[#3d3d3a] text-[#faf9f5] font-bold px-2 py-0.5 rounded border border-[#3d3d3a] text-[10px]">
                                  Space: {evaluation.complexity_analysis.space_complexity}
                                </span>
                              </div>
                            </div>
                            <p className="text-[#3d3d3a] leading-relaxed">{evaluation.complexity_analysis.details}</p>
                          </div>
                        )}

                        {/* Strengths */}
                        {evaluation.strengths && evaluation.strengths.length > 0 && (
                          <div className="space-y-1.5">
                            <h4 className="text-xs font-semibold text-[#141413] flex items-center gap-1">
                              <CheckCircle2 size={13} /> Strengths
                            </h4>
                            <ul className="space-y-1 text-xs text-[#3d3d3a]">
                              {evaluation.strengths.map((s, i) => (
                                <li key={i} className="flex items-start gap-1.5">
                                  <span className="text-[#141413] font-bold">•</span>
                                  <span>{s}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Issues / Deficiencies */}
                        {evaluation.issues && evaluation.issues.length > 0 && (
                          <div className="space-y-1.5">
                            <h4 className="text-xs font-semibold text-[#141413] flex items-center gap-1">
                              <AlertTriangle size={13} /> Areas for Review
                            </h4>
                            <ul className="space-y-1 text-xs text-[#3d3d3a]">
                              {evaluation.issues.map((issue, i) => (
                                <li key={i} className="flex items-start gap-1.5">
                                  <span className="text-[#141413] font-bold">•</span>
                                  <span>{issue}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Improvements */}
                        {evaluation.improvements && evaluation.improvements.length > 0 && (
                          <div className="space-y-1.5">
                            <h4 className="text-xs font-semibold text-[#141413] flex items-center gap-1">
                              <Lightbulb size={13} /> Actionable Recommendations
                            </h4>
                            <ul className="space-y-1 text-xs text-[#3d3d3a]">
                              {evaluation.improvements.map((imp, i) => (
                                <li key={i} className="flex items-start gap-1.5">
                                  <span className="text-[#141413] font-bold">•</span>
                                  <span>{imp}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Detailed Instructor Feedback */}
                        {evaluation.detailed_feedback && (
                          <div className="p-3 bg-[#e8e6dc] border border-[#141413] rounded-lg text-xs space-y-1">
                            <span className="font-bold text-[#141413]">Instructor Commentary:</span>
                            <p className="text-[#141413] font-medium leading-relaxed">{evaluation.detailed_feedback}</p>
                          </div>
                        )}

                        {/* Next Steps */}
                        {evaluation.next_steps && evaluation.next_steps.length > 0 && (
                          <div className="space-y-1.5">
                            <h4 className="text-xs font-semibold text-[#141413] font-bold flex items-center gap-1">
                              <ArrowRight size={13} /> Next Learning Steps
                            </h4>
                            <ul className="space-y-1 text-xs text-[#3d3d3a]">
                              {evaluation.next_steps.map((step, i) => (
                                <li key={i} className="flex items-start gap-1.5">
                                  <span className="text-[#141413]">→</span>
                                  <span>{step}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-[#87867f]">Submit your code for Claude AI evaluation.</p>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          </Panel>

          <PanelResizeHandle className="w-1 bg-[#d6d3c4] hover:bg-[#141413] transition-colors flex items-center justify-center cursor-col-resize">
            <div className="h-10 w-1 bg-[#87867f] rounded-full" />
          </PanelResizeHandle>

          {/* Right Panel: Monaco Code Editor + Terminal */}
          <Panel defaultSize={60} minSize={30}>
            <PanelGroup orientation="vertical">
              {/* Code Editor */}
              <Panel defaultSize={70} minSize={30}>
                <div className="h-full w-full bg-[#faf9f5] flex flex-col">
              <div className="flex items-center justify-between px-3 py-1.5 bg-[#e8e6dc] border-b border-[#d6d3c4] text-[11px] text-[#3d3d3a]">
                <span className="font-mono font-bold text-[#141413]">solution.{language === 'python' ? 'py' : 'ts'}</span>
                <button
                  onClick={handleResetCode}
                  className="flex items-center gap-1 hover:text-[#141413] transition-colors"
                  title="Reset to starter boilerplate"
                >
                  <RotateCcw size={12} /> Reset Template
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <Editor
                  height="100%"
                  language={language}
                  theme="light"
                  value={code}
                  onChange={(val) => setCode(val || "")}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 13,
                    wordWrap: "on",
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    padding: { top: 12 }
                  }}
                />
              </div>
            </div>
          </Panel>

          <PanelResizeHandle className="h-1 bg-[#d6d3c4] hover:bg-[#141413] transition-colors flex items-center justify-center cursor-row-resize">
            <div className="w-10 h-1 bg-[#87867f] rounded-full" />
          </PanelResizeHandle>

          {/* Bottom Panel: Local Terminal / Diagnostics Output */}
          <Panel defaultSize={20} minSize={10}>
            <div className="h-full w-full bg-[#141413] flex flex-col font-mono">
              <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#d6d3c4] bg-[#e8e6dc] text-[11px]">
                <span className="font-bold text-[#141413]">Terminal & Test Output</span>
                {isLocalPassed && (
                  <span className="text-[#141413] text-[10px] flex items-center gap-1 font-sans font-bold">
                    <CheckCircle2 size={12} /> Local Tests Passed
                  </span>
                )}
              </div>
              <div className="p-3 flex-1 overflow-y-auto text-xs whitespace-pre-wrap text-[#faf9f5] bg-[#141413]">
                {output || '> Ready. Press "Run Tests" to test locally or "Evaluate Solution" for Claude AI review.'}
              </div>
            </div>
          </Panel>
            </PanelGroup>
          </Panel>
        </PanelGroup>
      </div>

      {/* Action Bar Footer */}
      <div className="p-3 border-t border-[#d6d3c4] bg-[#e8e6dc] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 text-xs text-[#3d3d3a]">
          {evaluation && (
            <span className="flex items-center gap-1 text-[#3d3d3a]">
              Score: <strong className="text-[#141413]">{evaluation.score}/100</strong>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRunLocal}
            disabled={isRunning || isEvaluating}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#faf9f5] hover:bg-[#d6d3c4] disabled:opacity-50 text-[#141413] border border-[#d6d3c4] rounded-lg text-xs font-bold transition-colors"
          >
            <Play size={14} /> {isRunning ? 'Running...' : 'Run Tests'}
          </button>

          <button
            onClick={handleEvaluateSolution}
            disabled={isEvaluating || isRunning}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#3d3d3a] hover:opacity-90 disabled:opacity-50 text-[#faf9f5] rounded-lg text-xs font-bold transition-all active:scale-95"
          >
            <Sparkles size={14} className={isEvaluating ? "animate-spin" : ""} />
            {isEvaluating ? 'Evaluating with Claude...' : 'Evaluate Solution'}
          </button>

          <button
            onClick={handleCompleteMilestone}
            disabled={!(evaluation?.is_passing || isLocalPassed)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#141413] hover:opacity-90 disabled:opacity-50 disabled:bg-[#d6d3c4] disabled:text-[#87867f] text-[#faf9f5] rounded-lg text-xs font-bold transition-colors"
          >
            <CheckCircle size={14} /> Submit & Pass
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}
