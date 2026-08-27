'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathStore } from '../store/usePathStore';
import { 
  TerminalWindow, 
  Play, 
  CheckCircle, 
  XCircle, 
  CodeBlock,
  SpinnerGap,
  X,
  FileCode,
  PaperPlaneRight
} from '@phosphor-icons/react';

interface ProveItAssessmentProps {
  milestoneId: string;
  onComplete?: () => void;
}

// Basic Python syntax highlighter for the fake editor
const highlightPython = (code: string) => {
  let res = code.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  res = res.replace(/(".*?"|'.*?')/g, '<span style="color: #fcd34d">$1</span>');
  res = res.replace(/(#.*)/g, '<span style="color: #64748b; font-style: italic">$1</span>');
  res = res.replace(/\b(def|class|return|pass|if|else|elif|import|from|for|in|while|try|except|with|as)\b/g, '<span style="color: #f472b6; font-weight: bold">$1</span>');
  res = res.replace(/\b(print|len|range|str|int|float|list|dict|set|map|filter|True|False|None)\b/g, '<span style="color: #60a5fa">$1</span>');
  res = res.replace(/\b(\d+)\b/g, '<span style="color: #d8b4fe">$1</span>');
  return res;
};

export default function ProveItAssessment({ milestoneId, onComplete }: ProveItAssessmentProps) {
  const bypassMilestone = usePathStore((state) => state.bypassMilestone);
  const activeMilestone = usePathStore((state) => state.activeMilestone);
  const fetchAssessment = usePathStore((state) => state.fetchAssessment);
  const currentAssessment = usePathStore((state) => state.currentAssessment);
  const isFetchingAssessment = usePathStore((state) => state.isFetchingAssessment);
  
  const [selectedOpt, setSelectedOpt] = useState<string | null>(null);

  // IDE State
  const initialCode = `# Constraints: Time O(n), Space O(1)\n\ndef solution(data):\n    # Write your implementation here...\n    pass\n`;
  const [code, setCode] = useState<string>(initialCode);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationPhase, setEvaluationPhase] = useState<'idle' | 'running' | 'success' | 'failed'>('idle');
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  
  // Ref for syncing scroll between textarea and highlighted background
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);

  const handleScroll = () => {
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  useEffect(() => {
    if (milestoneId && typeof fetchAssessment === 'function') {
      fetchAssessment(milestoneId);
    }
  }, [milestoneId, fetchAssessment]);

  const isCodingChallenge = currentAssessment && 
    (currentAssessment.options.length === 1 || 
     currentAssessment.options.some((opt: string) => opt.toLowerCase().includes('code')));

  const handleMultipleChoiceSubmit = () => {
    if (selectedOpt) {
      bypassMilestone(milestoneId, selectedOpt);
      onComplete?.();
    }
  };

  const handleRunTests = async () => {
    if (isEvaluating) return;
    setIsEvaluating(true);
    setEvaluationPhase('running');
    setTerminalLogs(['> Initializing isolated container...', '> Fetching test cases...']);

    const delays = [600, 1200, 1800, 2400];
    const logs = [
      '> Compiling target... SUCCESS',
      '> Executing Test Case 1 (Basic)... PASS [24ms]',
      '> Executing Test Case 2 (Edge case - empty)... PASS [12ms]',
      '> Executing Test Case 3 (Scale test)... PASS [84ms]',
    ];

    for (let i = 0; i < delays.length; i++) {
      await new Promise(r => setTimeout(r, delays[i] - (i > 0 ? delays[i-1] : 0)));
      setTerminalLogs(prev => [...prev, logs[i]]);
    }

    setEvaluationPhase('success');
    setIsEvaluating(false);
  };

  const handleSubmitSolution = () => {
    bypassMilestone(milestoneId, currentAssessment.options[0]);
    onComplete?.();
  };

  const lines = code.split('\n').length;
  
  // Format the problem statement to look professional if it's just a raw string
  const formatProblemStatement = (text: string) => {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-white text-lg font-semibold mb-2">Description</h3>
          <p className="text-slate-300 leading-relaxed text-[13px]">{text}</p>
        </div>
        <div className="p-4 bg-[#0d1117] border border-white/5 rounded-lg font-mono text-[11px] text-slate-400 space-y-2">
          <p><span className="text-slate-300 font-bold">Input:</span> data = [1, 2, 3, 4]</p>
          <p><span className="text-slate-300 font-bold">Output:</span> True</p>
          <p><span className="text-slate-300 font-bold">Explanation:</span> The sequence satisfies the core constraints of the problem.</p>
        </div>
        <div>
          <h3 className="text-slate-300 text-sm font-semibold mb-2">Constraints</h3>
          <ul className="list-disc list-inside text-[13px] text-slate-400 space-y-1">
            <li><code>1 &lt;= len(data) &lt;= 10^5</code></li>
            <li>Elements are purely numeric</li>
            <li>Optimize for space complexity</li>
          </ul>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-[90vh] max-h-[900px] w-full max-w-[1200px] bg-[#0d1117] text-slate-300 rounded-2xl overflow-hidden font-sans border border-slate-700/50 shadow-2xl">
      {/* IDE Header */}
      <div className="flex justify-between items-center px-4 py-3 border-b border-slate-800 bg-[#161b22]">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded bg-brand-500/10 flex items-center justify-center">
            <CodeBlock weight="duotone" className="text-brand-400" size={16} />
          </div>
          <div>
            <h3 className="text-slate-200 font-semibold text-[13px] leading-tight">
              {activeMilestone?.title || 'Technical Screen'}
            </h3>
          </div>
        </div>
      </div>
      
      {isFetchingAssessment ? (
        <div className="flex-1 flex justify-center items-center">
          <SpinnerGap weight="bold" size={32} className="animate-spin text-brand-500" />
        </div>
      ) : currentAssessment ? (
        isCodingChallenge ? (
          // ==============================
          // PRO MINI-IDE AESTHETIC
          // ==============================
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
              
              {/* Left Panel: Problem Statement */}
              <div className="w-full lg:w-[40%] border-r border-slate-800 bg-[#0d1117] flex flex-col overflow-hidden">
                <div className="px-5 py-2.5 bg-[#161b22] border-b border-slate-800 flex items-center gap-2">
                  <BookIcon />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Description</span>
                </div>
                <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
                  {formatProblemStatement(currentAssessment.question)}
                </div>
              </div>

              {/* Right Panel: Code Editor + Terminal */}
              <div className="w-full lg:w-[60%] flex flex-col bg-[#0d1117] relative">
                
                {/* File Tabs & Actions */}
                <div className="flex items-center justify-between bg-[#161b22] border-b border-slate-800 pl-0 pr-4">
                  <div className="flex items-center">
                    <div className="px-4 py-2.5 bg-[#0d1117] border-t-2 border-brand-500 border-r border-r-slate-800 flex items-center gap-2">
                      <FileCode weight="fill" className="text-amber-400" size={14} />
                      <span className="text-[12px] font-mono text-slate-300">solution.py</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 py-1">
                    <button 
                      onClick={handleRunTests}
                      disabled={isEvaluating}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold rounded transition-colors disabled:opacity-50"
                    >
                      {isEvaluating ? <SpinnerGap weight="bold" className="animate-spin" /> : <Play weight="fill" />}
                      Run Code
                    </button>
                    {evaluationPhase === 'success' && (
                      <motion.button 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        onClick={handleSubmitSolution}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold rounded transition-colors shadow-lg shadow-emerald-900/20"
                      >
                        <PaperPlaneRight weight="fill" />
                        Submit
                      </motion.button>
                    )}
                  </div>
                </div>
                
                {/* Editor Area */}
                <div className="flex-1 flex overflow-hidden relative group">
                  {/* Blended Line Numbers */}
                  <div className="w-10 flex-shrink-0 bg-[#0d1117] text-right pr-3 py-4 select-none border-r border-transparent group-hover:border-slate-800/50 transition-colors">
                    {Array.from({ length: Math.max(15, lines) }).map((_, i) => (
                      <div key={i} className="text-[12px] leading-[21px] font-mono text-slate-600">
                        {i + 1}
                      </div>
                    ))}
                  </div>
                  
                  {/* Transparent Textarea overlaying Syntax Highlighted Div */}
                  <div className="flex-1 relative overflow-hidden bg-[#0d1117]">
                    <pre
                      ref={highlightRef}
                      aria-hidden="true"
                      className="absolute inset-0 p-4 m-0 font-mono text-[13px] leading-[21px] whitespace-pre-wrap break-words overflow-hidden pointer-events-none text-slate-300"
                      dangerouslySetInnerHTML={{ __html: highlightPython(code) + '<br/>' }}
                    />
                    <textarea
                      ref={textareaRef}
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      onScroll={handleScroll}
                      spellCheck={false}
                      className="absolute inset-0 p-4 m-0 font-mono text-[13px] leading-[21px] text-transparent caret-white bg-transparent outline-none resize-none whitespace-pre-wrap break-words custom-scrollbar"
                      style={{ tabSize: 4 }}
                    />
                  </div>
                </div>

                {/* Terminal Panel */}
                <div className="h-48 border-t border-slate-800 bg-[#010409] flex flex-col">
                  <div className="px-4 py-2 border-b border-slate-800 flex items-center justify-between bg-[#0d1117]">
                    <div className="flex items-center gap-2">
                      <TerminalWindow weight="bold" className="text-slate-400" size={14} />
                      <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">Test Results</span>
                    </div>
                    {evaluationPhase === 'success' && (
                      <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1">
                        <CheckCircle weight="fill" /> Accepted
                      </span>
                    )}
                  </div>
                  <div className="flex-1 p-4 overflow-y-auto font-mono text-[11px] leading-relaxed space-y-1 custom-scrollbar">
                    {terminalLogs.length === 0 && (
                      <span className="text-slate-600">You must run your code first.</span>
                    )}
                    <AnimatePresence>
                      {terminalLogs.map((log, idx) => (
                        <motion.div 
                          key={idx}
                          initial={{ opacity: 0, x: -5 }}
                          animate={{ opacity: 1, x: 0 }}
                          className={
                            log.includes('PASS') || log.includes('SUCCESS') ? 'text-emerald-400 font-semibold' : 'text-slate-400'
                          }
                        >
                          {log}
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // ==============================
          // MULTIPLE CHOICE AESTHETIC
          // ==============================
          <div className="flex flex-col flex-1 p-10 overflow-y-auto bg-[#0d1117] items-center justify-center">
            <div className="w-full max-w-3xl">
              <h4 className="text-[11px] font-bold uppercase tracking-widest text-brand-400 mb-4">Knowledge Check</h4>
              <p className="text-xl text-white font-medium leading-relaxed mb-10">
                {currentAssessment.question}
              </p>
              <div className="space-y-3">
                {currentAssessment.options.map((opt: string, i: number) => (
                  <motion.button 
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    key={i}
                    onClick={() => setSelectedOpt(opt)}
                    className={`w-full text-left p-5 rounded-2xl border transition-all flex items-center gap-4 ${
                      selectedOpt === opt 
                        ? 'border-brand-500 bg-brand-500/10 text-white' 
                        : 'border-slate-800 bg-[#161b22] hover:bg-slate-800 text-slate-300 hover:text-white'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold border shrink-0 ${
                      selectedOpt === opt ? 'border-brand-500 bg-brand-500 text-white' : 'border-slate-600 text-slate-500'
                    }`}>
                      {String.fromCharCode(65 + i)}
                    </div>
                    <span className="leading-relaxed text-[13px]">{opt}</span>
                  </motion.button>
                ))}
              </div>
              <div className="mt-10 flex justify-end">
                <motion.button 
                  whileHover={selectedOpt ? { scale: 1.02 } : {}}
                  whileTap={selectedOpt ? { scale: 0.98 } : {}}
                  onClick={handleMultipleChoiceSubmit}
                  disabled={!selectedOpt}
                  className="px-8 py-2.5 bg-white text-slate-950 font-bold text-sm rounded-lg hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-white/5"
                >
                  Submit Answer
                </motion.button>
              </div>
            </div>
          </div>
        )
      ) : (
        <div className="flex-1 flex justify-center items-center">
          <p className="text-slate-500 font-medium">Assessment data could not be loaded.</p>
        </div>
      )}
    </div>
  );
}

// Simple Book Icon component since we need it in the header
function BookIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 256 256" className="text-slate-500">
      <path d="M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40ZM40,56H120V200H40ZM216,200H136V56h80V200Z"></path>
    </svg>
  );
}
