'use client';

import { useState } from 'react';
import { 
  AlertCircle, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  Zap, 
  Loader2, 
  Sparkles, 
  FileText, 
  HelpCircle,
  TrendingUp,
  ShieldCheck
} from 'lucide-react';
import { checkRoadmapSanity } from '../../api/client';

const SAMPLE_ROADMAPS = [
  {
    title: "Overhyped YouTube Roadmap",
    text: "Start directly with Kubernetes and Kafka. Then learn XML-RPC and SOAP API. After that, pick up Python and Django."
  },
  {
    title: "Pragmatic SWE Curriculum",
    text: "First learn Python basics and SQL relational database design. Next build HTTP REST APIs with FastAPI, then master PostgreSQL and system design."
  }
];

export default function RoadmapNoiseChecker() {
  const [isOpen, setIsOpen] = useState(true);
  const [adviceText, setAdviceText] = useState(SAMPLE_ROADMAPS[0].text);
  const [sourceLabel, setSourceLabel] = useState('YouTube Tutorial');
  const [report, setReport] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async (customText?: string) => {
    const textToSubmit = customText || adviceText;
    if (!textToSubmit || textToSubmit.length < 10) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await checkRoadmapSanity({
        advice_text: textToSubmit,
        source_label: sourceLabel
      });
      setReport(res);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to analyze roadmap advice.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full bg-surface border border-border rounded-2xl overflow-hidden shadow-glass">
      {/* Header Accordion Bar */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-6 flex justify-between items-center hover:bg-surface-secondary/50 transition-colors select-none"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center">
            <Zap className="text-indigo-400" size={18} />
          </div>
          <div className="text-left">
            <h3 className="text-sm md:text-base font-extrabold text-white uppercase tracking-wider">
              Tutor Noise & Roadmap Sanity Filter
            </h3>
            <p className="text-xs text-slate-400">
              Audit external influencer roadmaps against deterministic Neo4j dependencies & live market demand
            </p>
          </div>
        </div>
        {isOpen ? <ChevronUp className="text-slate-400" size={18} /> : <ChevronDown className="text-slate-400" size={18} />}
      </button>

      {isOpen && (
        <div className="p-6 border-t border-border bg-surface-secondary/30 space-y-6">
          {/* Input Textarea & Presets */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <FileText size={14} className="text-indigo-400" />
                <span>Paste external advice or course outline:</span>
              </label>
              
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500">Sample presets:</span>
                {SAMPLE_ROADMAPS.map((sample, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setAdviceText(sample.text);
                      handleAnalyze(sample.text);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-surface border border-border text-[11px] font-semibold text-slate-300 hover:text-white transition-colors"
                  >
                    {sample.title}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              value={adviceText}
              onChange={(e) => setAdviceText(e.target.value)}
              placeholder="e.g. You must learn Assembly before Python, then jump straight into Kubernetes and Microservices..."
              className="w-full min-h-[110px] bg-surface border border-border rounded-xl p-4 text-xs md:text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50 resize-none transition-all leading-relaxed"
            />

            <div className="flex justify-end">
              <button
                onClick={() => handleAnalyze()}
                disabled={isLoading || adviceText.length < 10}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:bg-surface-tertiary text-white font-bold text-xs shadow-glow-indigo transition-all disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Analyzing DAG Dependencies...</span>
                  </>
                ) : (
                  <>
                    <Zap size={14} />
                    <span>Audit Roadmap Sanity</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Analysis Report Output */}
          {report && (
            <div className="space-y-5 pt-4 border-t border-border animate-in fade-in duration-300">
              {/* Overall Rating Banner */}
              <div className={`p-5 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                report.overall_rating === 'TRUSTWORTHY' || report.overall_rating === 'MOSTLY_OK'
                  ? 'bg-emerald-500/10 border-emerald-500/30'
                  : 'bg-rose-500/10 border-rose-500/30'
              }`}>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Overall Curriculum Rating
                  </div>
                  <div className="text-xl font-extrabold text-white mt-0.5 flex items-center gap-2">
                    <span>{report.overall_rating.replace(/_/g, ' ')}</span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 max-w-xl">
                    {report.summary}
                  </p>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <div className="px-3 py-1.5 rounded-xl bg-surface border border-border text-center">
                    <span className="block text-emerald-400 font-extrabold text-sm">{report.aligned_count}</span>
                    <span className="text-[10px] text-slate-400">Aligned</span>
                  </div>
                  <div className="px-3 py-1.5 rounded-xl bg-surface border border-border text-center">
                    <span className="block text-amber-400 font-extrabold text-sm">{report.harmless_extra_count}</span>
                    <span className="text-[10px] text-slate-400">Extras</span>
                  </div>
                  <div className="px-3 py-1.5 rounded-xl bg-surface border border-border text-center">
                    <span className="block text-rose-400 font-extrabold text-sm">{report.misleading_count}</span>
                    <span className="text-[10px] text-slate-400">Misleading</span>
                  </div>
                </div>
              </div>

              {/* Individual Verdict Breakdown */}
              {report.verdicts && report.verdicts.length > 0 && (
                <div className="space-y-2.5">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Skill-by-Skill Graph & Market Validation
                  </div>
                  <div className="grid grid-cols-1 gap-2.5">
                    {report.verdicts.map((v: any, idx: number) => {
                      const isAligned = v.label === 'ALIGNED';
                      const isMisleading = v.label === 'MISLEADING';
                      return (
                        <div 
                          key={idx}
                          className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs ${
                            isAligned
                              ? 'bg-emerald-500/5 border-emerald-500/20'
                              : isMisleading
                              ? 'bg-rose-500/5 border-rose-500/20'
                              : 'bg-amber-500/5 border-amber-500/20'
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-base">{v.label_emoji}</span>
                              <span className="font-bold text-white text-sm">
                                {v.matched_skill_name || v.extracted_mention}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                isAligned ? 'bg-emerald-500/20 text-emerald-300' : isMisleading ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'
                              }`}>
                                {v.label.replace(/_/g, ' ')}
                              </span>
                            </div>
                            <p className="text-slate-400 text-xs pl-6 leading-relaxed">
                              {v.reason}
                            </p>
                          </div>

                          {v.market_demand_score && (
                            <div className="text-right shrink-0 pl-6 md:pl-0">
                              <span className="text-[10px] text-slate-500 uppercase">Demand Score</span>
                              <div className="font-bold text-slate-200 text-xs">
                                {Math.round(v.market_demand_score * 100)}%
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
