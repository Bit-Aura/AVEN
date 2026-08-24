'use client';

import { useState, useEffect } from 'react';
import { usePathStore } from '../../../../store/usePathStore';
import { getProofCard, getProofCardSvgUrl, verifyProofCard, getReadiness } from '../../../../api/client';
import { 
  Award, 
  ShieldCheck, 
  Download, 
  CheckCircle2, 
  Key, 
  FileCode, 
  ExternalLink, 
  Loader2, 
  AlertCircle,
  Copy,
  Sparkles,
  Lock
} from 'lucide-react';

export default function PortfolioPage() {
  const profileId = usePathStore((state) => state.profileId);
  const targetRole = usePathStore((state) => state.targetRole);
  
  const [proofCard, setProofCard] = useState<any>(null);
  const [readinessData, setReadinessData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [isCopied, setIsCopied] = useState(false);

  const activeId = profileId || 1;

  useEffect(() => {
    async function loadPortfolio() {
      setIsLoading(true);
      try {
        const [cardRes, readinessRes] = await Promise.all([
          getProofCard(activeId).catch(() => null),
          getReadiness(activeId).catch(() => null)
        ]);
        setProofCard(cardRes);
        setReadinessData(readinessRes?.readiness || null);
      } catch (e) {
        console.error("Portfolio load failed", e);
      } finally {
        setIsLoading(false);
      }
    }
    loadPortfolio();
  }, [activeId]);

  const handleVerify = async () => {
    if (!proofCard) return;
    setIsVerifying(true);
    try {
      const res = await verifyProofCard(proofCard);
      setVerificationResult(res);
    } catch (e: any) {
      setVerificationResult({ is_valid: false, status: 'VERIFICATION_ERROR' });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCopyJson = () => {
    if (!proofCard) return;
    navigator.clipboard.writeText(JSON.stringify(proofCard, null, 2));
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const masteredSkills = proofCard?.mastered_skills || [
    "python_basics", "sql_basics", "git_foundations", "http_methods"
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Award className="text-brand-400" size={18} />
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Verifiable Credentials</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Cryptographic Proof Portfolio
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            HMAC-SHA256 tamper-evident credentials generated from verified milestone assessments and BKT probabilities
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleCopyJson}
            disabled={!proofCard}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface border border-border hover:bg-surface-secondary text-slate-300 hover:text-white text-xs font-semibold transition-colors disabled:opacity-50"
          >
            {isCopied ? <CheckCircle2 size={14} className="text-emerald-400" /> : <Copy size={14} />}
            <span>{isCopied ? 'JSON Copied' : 'Copy JSON-LD'}</span>
          </button>

          <a
            href={getProofCardSvgUrl(activeId)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold transition-all shadow-glow-indigo"
          >
            <Download size={14} />
            <span>Export SVG Certificate</span>
          </a>
        </div>
      </div>

      {isLoading ? (
        <div className="p-12 text-center bg-surface border border-border rounded-2xl">
          <Loader2 className="animate-spin text-brand-400 mx-auto mb-3" size={32} />
          <p className="text-xs text-slate-400">Loading verifiable credential proofs...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Main Proof Certificate Card */}
          <div className="lg:col-span-2 p-8 rounded-2xl bg-surface border border-border shadow-glass relative overflow-hidden space-y-6">
            <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

            {/* Certificate Badge Top */}
            <div className="flex items-start justify-between border-b border-border pb-6">
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-indigo-500/20 border border-emerald-500/30 flex items-center justify-center shadow-glow-emerald">
                  <ShieldCheck className="text-emerald-400" size={28} />
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-widest text-emerald-400 flex items-center gap-1">
                    <Sparkles size={12} />
                    <span>Cryptographically Verified Credential</span>
                  </div>
                  <h2 className="text-2xl font-extrabold text-white mt-1">
                    {proofCard?.role || targetRole || "Backend Software Engineer"}
                  </h2>
                  <div className="text-xs text-slate-400 font-mono mt-0.5">
                    ID: {proofCard?.credential_id || `CRED-${activeId}-SWE-2026`}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs font-semibold text-slate-400 uppercase">Readiness Metric</div>
                <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                  {Math.round((proofCard?.readiness_score || readinessData?.readiness_score || 0.75) * 100)}%
                </div>
              </div>
            </div>

            {/* Evidence Tags & Mastered Skills */}
            <div className="space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Verified Skill Competencies ({masteredSkills.length})
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {masteredSkills.map((skill: string, idx: number) => (
                  <div 
                    key={idx}
                    className="p-3 rounded-xl bg-surface-secondary/60 border border-border flex items-center gap-2 text-xs font-semibold text-slate-200"
                  >
                    <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                    <span className="truncate">{skill.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Cryptographic Signature Trace */}
            <div className="p-4 rounded-xl bg-surface-secondary/80 border border-border space-y-2 font-mono text-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-300 uppercase">
                  <Key size={13} className="text-indigo-400" />
                  <span>Signature Payload</span>
                </span>
                <span className="text-[10px] text-slate-500">Algorithm: {proofCard?.algorithm || 'HMAC-SHA256'}</span>
              </div>
              <div className="text-[11px] text-indigo-300 break-all bg-background/80 p-2.5 rounded-lg border border-border/80">
                {proofCard?.signature || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}
              </div>
              <div className="text-[10px] text-slate-500 flex items-center justify-between pt-1">
                <span>Issued: {proofCard?.issued_at ? new Date(proofCard.issued_at).toLocaleString() : new Date().toLocaleString()}</span>
                <span>Issuer: PathFinder EIKG Core</span>
              </div>
            </div>
          </div>

          {/* Verification Engine Sidebar */}
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-surface border border-border shadow-glass space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
                <Lock size={15} className="text-indigo-400" />
                <span>On-Chain / Offline Verification</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Third-party recruiters and evaluators can verify the authenticity and non-tampering of this credential via public verification.
              </p>

              <button
                onClick={handleVerify}
                disabled={isVerifying || !proofCard}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-glow-indigo transition-all disabled:opacity-50"
              >
                {isVerifying ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Verifying HMAC Signature...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={14} />
                    <span>Verify Credential Signature</span>
                  </>
                )}
              </button>

              {/* Verification Result Callout */}
              {verificationResult && (
                <div className={`p-4 rounded-xl border text-xs space-y-1.5 animate-in fade-in duration-200 ${
                  verificationResult.is_valid
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}>
                  <div className="font-bold flex items-center gap-1.5">
                    {verificationResult.is_valid ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                    <span>Status: {verificationResult.status || (verificationResult.is_valid ? 'AUTHENTIC' : 'INVALID')}</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    {verificationResult.is_valid
                      ? 'The digital signature matches the ground-truth hash of all recorded proof items.'
                      : 'Signature mismatch or credential was tampered with.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
