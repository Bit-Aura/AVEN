'use client';

import { usePathStore, ProofCardData } from '../store/usePathStore';
import { Play, CheckCircle, TerminalSquare, Settings2, GripHorizontal } from 'lucide-react';
import { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { executeCode } from '../api/client';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';

const DEFAULT_PYTHON = `def solve():\n    # Write your solution here\n    return False\n`;
const DEFAULT_TYPESCRIPT = `function solve() {\n  // Write your solution here\n  return false;\n}\n`;
// Removed MILESTONE_DESCRIPTIONS

export default function IdeSidecar() {
  const activeIdeNodeId = usePathStore((state) => state.activeIdeNodeId);
  const closeIde = usePathStore((state) => state.closeIde);
  const completeMilestoneViaIde = usePathStore((state) => state.completeMilestoneViaIde);
  const submitIdeTelemetry = usePathStore((state) => state.submitIdeTelemetry);

  const [language, setLanguage] = useState<'python' | 'typescript'>('python');
  const [code, setCode] = useState(DEFAULT_PYTHON);
  const [output, setOutput] = useState<string | null>(null);
  
  const [isRunning, setIsRunning] = useState(false);
  const [isPassed, setIsPassed] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  
  const [dynamicProblem, setDynamicProblem] = useState<{description: string, hidden_tests: string} | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const targetRole = usePathStore((state) => state.targetRole) || "Software Engineer";

  // Initialize and Auto-save
  useEffect(() => {
    if (!activeIdeNodeId) return;
    
    const storageKey = `aven_ide_${activeIdeNodeId}_${language}`;
    
    // Check local storage
    if (!isLoaded) {
      const savedCode = localStorage.getItem(storageKey);
      if (savedCode) {
        setCode(savedCode);
      } else {
        setCode(language === 'python' ? DEFAULT_PYTHON : DEFAULT_TYPESCRIPT);
      }
      setIsLoaded(true);
    } else {
      // Save on change
      localStorage.setItem(storageKey, code);
    }
  }, [language, code, activeIdeNodeId, isLoaded]);

  // Reset isLoaded when milestone changes
  useEffect(() => {
    setIsLoaded(false);
    setDynamicProblem(null);
  }, [activeIdeNodeId, language]);
  
  // Fetch dynamic problem
  useEffect(() => {
    if (!activeIdeNodeId || dynamicProblem || isGenerating) return;
    
    let isMounted = true;
    const fetchProblem = async () => {
        setIsGenerating(true);
        try {
            import('../api/client').then(async ({ getIdeProblem }) => {
                const prob = await getIdeProblem(activeIdeNodeId, targetRole);
                if (isMounted) {
                    setDynamicProblem(prob);
                    // Only override code if they haven't started typing yet
                    const storageKey = `aven_ide_${activeIdeNodeId}_${language}`;
                    if (!localStorage.getItem(storageKey) && prob.default_code) {
                        setCode(prob.default_code);
                    }
                }
            });
        } catch (e) {
            console.error("Failed to generate IDE problem", e);
        } finally {
            if (isMounted) setIsGenerating(false);
        }
    };
    fetchProblem();
    return () => { isMounted = false; };
  }, [activeIdeNodeId, targetRole, dynamicProblem, isGenerating, language]);

  if (!activeIdeNodeId) return null;

  const handleRun = async () => {
    setIsRunning(true);
    setOutput('Compiling and running in secure sandbox...');
    
    const startTime = performance.now();
    
    try {
      const res = await executeCode(language, code, activeIdeNodeId, dynamicProblem?.hidden_tests || "");
      const executionTimeMs = Math.round(performance.now() - startTime);
      
      let newOutput = "";
      if (res.stdout) newOutput += res.stdout + "\n";
      if (res.stderr) newOutput += "ERROR:\n" + res.stderr + "\n";
      
      const hasSyntaxError = res.stderr && (res.stderr.includes("SyntaxError") || res.stderr.includes("IndentationError"));
      
      if (res.is_passing) {
        newOutput += "\n✅ ALL HIDDEN TESTS PASSED! You may now submit your solution.";
        setIsPassed(true);
        
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
          console.error("Failed to submit telemetry", e);
        }
      } else {
        newOutput += "\n❌ Tests failed. Please review your code and try again.";
        setIsPassed(false);
        
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
            console.error("Failed to submit telemetry", e);
          }
      }
      
      setOutput(newOutput);
    } catch (e: any) {
        setOutput("Failed to execute code. " + e.message);
        setIsPassed(false);
    } finally {
        setIsRunning(false);
    }
  };

  const handleSubmit = () => {
    if (!isPassed) return;
    completeMilestoneViaIde(activeIdeNodeId);
  };

  const instructionText = isGenerating ? "🤖 Generating tailored coding challenge..." : (dynamicProblem?.description || "Implement the solution to pass the hidden unit tests for this milestone.");

  return (
    <div className="absolute top-0 right-0 w-[600px] h-full bg-[#1e1e1e] border-l border-[#333] shadow-2xl flex flex-col animate-in slide-in-from-right z-50 text-[#d4d4d4] font-mono">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-[#333] bg-[#252526] shrink-0">
        <div className="flex items-center gap-2">
          <TerminalSquare size={18} className="text-[#4EC9B0]" />
          <span className="text-sm">Sandbox Environment</span>
        </div>
        <div className="flex items-center gap-4">
            <select 
                value={language}
                onChange={(e) => setLanguage(e.target.value as 'python' | 'typescript')}
                className="bg-[#333] text-xs text-white p-1 rounded outline-none border border-[#444]"
            >
                <option value="python">Python 3.10</option>
                <option value="typescript">TypeScript 5.0</option>
            </select>
            <button onClick={closeIde} className="text-[#858585] hover:text-white">✕</button>
        </div>
      </div>
      
      <div className="flex-1 overflow-hidden">
        <PanelGroup orientation="vertical">
            <Panel defaultSize={20} minSize={10}>
                {/* Context Area */}
                <div className="p-4 bg-[#252526] h-full overflow-y-auto text-sm">
                    <h3 className="text-white mb-2 font-sans font-semibold">Problem: {activeIdeNodeId.replace(/_/g, ' ')}</h3>
                    <p className="text-[#cccccc] font-sans leading-relaxed">{instructionText}</p>
                </div>
            </Panel>
            
            <PanelResizeHandle className="h-1 bg-[#333] hover:bg-[#4EC9B0] transition-colors flex items-center justify-center cursor-row-resize">
                <div className="w-8 h-1 bg-[#444] rounded-full" />
            </PanelResizeHandle>
            
            <Panel defaultSize={50} minSize={20}>
                {/* Editor Area */}
                <div className="h-full w-full bg-[#1e1e1e] overflow-hidden">
                    <Editor
                        height="100%"
                        language={language}
                        theme="vs-dark"
                        value={code}
                        onChange={(value) => setCode(value || "")}
                        options={{
                            minimap: { enabled: false },
                            fontSize: 14,
                            wordWrap: "on",
                            scrollBeyondLastLine: false,
                            padding: { top: 16 }
                        }}
                    />
                </div>
            </Panel>

            <PanelResizeHandle className="h-1 bg-[#333] hover:bg-[#4EC9B0] transition-colors flex items-center justify-center cursor-row-resize">
                <div className="w-8 h-1 bg-[#444] rounded-full" />
            </PanelResizeHandle>

            <Panel defaultSize={30} minSize={15}>
                {/* Terminal/Output Area */}
                <div className="h-full w-full bg-[#1e1e1e] flex flex-col">
                    <div className="flex gap-4 px-4 py-2 text-xs border-b border-[#333] uppercase text-[#858585] shrink-0">
                    <span className="text-[#e7e7e7] border-b border-[#e7e7e7] pb-1 cursor-pointer">Terminal Output</span>
                    </div>
                    <div className="p-4 flex-1 overflow-y-auto text-xs whitespace-pre-wrap text-[#4EC9B0] font-mono">
                    {output || '> Ready for execution.'}
                    </div>
                </div>
            </Panel>
        </PanelGroup>
      </div>

      {/* Action Bar */}
      <div className="p-4 border-t border-[#333] bg-[#252526] flex justify-end gap-3 shrink-0">
        <button 
          onClick={handleRun}
          disabled={isRunning}
          className="flex items-center gap-2 px-4 py-2 bg-[#333] hover:bg-[#444] disabled:opacity-50 text-white rounded text-sm transition-colors"
        >
          <Play size={16} /> {isRunning ? 'Running...' : 'Run Code'}
        </button>
        <button 
          onClick={handleSubmit}
          disabled={!isPassed}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-[#333] disabled:text-[#858585] text-white rounded text-sm transition-colors"
        >
          <CheckCircle size={16} /> Submit Solution
        </button>
      </div>
    </div>
  );
}
