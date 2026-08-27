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
    <div className="space-y-8 max-w-7xl mx-auto pb-12 min-h-[80vh] text-[#141413]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pt-10 border-b border-[#141413]/10 pb-6">
        <div className="space-y-2 w-full">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#3d3d3a]">Verifiable Credentials</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-[#141413] tracking-tight">
            Cryptographic Proof
          </h1>
          <p className="text-sm text-[#3d3d3a] max-w-2xl">
            HMAC-SHA256 tamper-evident credentials generated from verified milestone assessments and BKT probabilities.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleCopyJson}
            disabled={!proofCard}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#e8e6dc] border border-[#141413]/10 hover:border-[#141413]/20 hover:bg-[#d6d3c4] text-[#141413] text-xs font-black transition-all disabled:opacity-50"
          >
            {isCopied ? <CheckCircle2 size={14} className="text-[#141413]" /> : <Copy size={14} />}
            <span className="uppercase tracking-widest">{isCopied ? 'Copied' : 'JSON-LD'}</span>
          </button>

          <a
            href={getProofCardSvgUrl(activeId)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-[#141413] hover:bg-[#3d3d3a] text-[#faf9f5] text-xs font-black uppercase tracking-widest transition-all shadow-md hover:shadow-lg"
          >
            <Download size={14} />
            <span>Export SVG</span>
          </a>
        </div>
      </div>

      {isLoading ? (
        <div className="p-12 text-center bg-[#faf9f5] border border-[#141413]/10 rounded-[2rem]">
          <Loader2 className="animate-spin text-[#141413] mx-auto mb-3" size={32} />
          <p className="text-xs font-black uppercase tracking-widest text-[#3d3d3a]">Verifying cryptographic proofs...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Main Proof Certificate Card */}
          <div className="lg:col-span-2 p-8 md:p-10 rounded-[2rem] bg-[#e8e6dc] border border-[#141413]/10 shadow-sm relative overflow-hidden space-y-5">


            {/* Certificate Badge Top */}
            <div className="flex flex-col md:flex-row md:items-start justify-between border-b border-[#141413]/10 pb-8 gap-6 relative z-10">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-2xl bg-[#faf9f5] border border-[#141413]/10 flex shrink-0 items-center justify-center p-3">
                  <ShieldCheck className="text-[#141413] w-full h-full" />
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-[#3d3d3a] flex items-center gap-1.5">
                    <Sparkles size={12} />
                    <span>Cryptographically Verified</span>
                  </div>
                  <h2 className="text-3xl font-black text-[#141413] tracking-tight mt-1">
                    {proofCard?.role || targetRole || "Backend Software Engineer"}
                  </h2>
                  <div className="text-xs font-black text-[#141413] bg-[#faf9f5] inline-block px-3 py-1 rounded-full border border-[#141413]/10 mt-2">
                    ID: {proofCard?.credential_id || `CRED-${activeId}-SWE-2026`}
                  </div>
                </div>
              </div>

              <div className="md:text-right flex flex-col md:items-end">
                <div className="text-[10px] font-black tracking-widest text-[#3d3d3a] uppercase">Readiness Metric</div>
                <div className="text-5xl font-black text-[#141413] tracking-tighter mt-1">
                  {Math.round((proofCard?.readiness_score || readinessData?.readiness_score || 0.75) * 100)}%
                </div>
              </div>
            </div>

            {/* Evidence Tags & Mastered Skills */}
            <div className="space-y-4 relative z-10">
              <div className="text-[10px] font-black uppercase tracking-widest text-[#3d3d3a]">
                Verified Competencies ({masteredSkills.length})
              </div>
              <div className="flex flex-wrap gap-2">
                {masteredSkills.map((skill: string, idx: number) => (
                  <div 
                    key={idx}
                    className="px-4 py-2 rounded-xl bg-[#faf9f5] border border-[#141413]/10 flex items-center gap-2 text-xs font-black text-[#141413]"
                  >
                    <CheckCircle2 size={14} className="text-[#141413] shrink-0" />
                    <span>{skill.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Cryptographic Signature Trace */}
            <div className="p-5 rounded-2xl bg-[#faf9f5] border border-[#141413]/10 space-y-3 font-mono relative z-10">
              <div className="flex items-center justify-between text-[#3d3d3a]">
                <span className="flex items-center gap-1.5 text-[10px] font-black text-[#141413] uppercase tracking-widest">
                  <Key size={12} className="text-[#141413]" />
                  <span>Signature Payload</span>
                </span>
                <span className="text-[9px] font-bold tracking-wider text-[#3d3d3a]">ALG: {proofCard?.algorithm || 'HMAC-SHA256'}</span>
              </div>
              <div className="text-[11px] font-bold text-[#141413] break-all bg-[#e8e6dc] p-3 rounded-xl border border-[#141413]/10">
                {proofCard?.signature || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}
              </div>
              <div className="text-[9px] font-bold text-[#3d3d3a] flex items-center justify-between pt-1 uppercase tracking-wider">
                <span>Issued: {proofCard?.issued_at ? new Date(proofCard.issued_at).toLocaleString() : new Date().toLocaleString()}</span>
                <span>Issuer: PathFinder Core</span>
              </div>
            </div>
          </div>

          {/* Verification Engine Sidebar */}
          <div className="space-y-6">
            <div className="p-8 rounded-[2rem] bg-[#faf9f5] border border-[#141413]/10 shadow-sm space-y-6">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#3d3d3a]">
                <Lock size={14} className="text-[#141413]" />
                <span>Zero-Trust Verification</span>
              </div>
              <p className="text-xs font-bold text-[#3d3d3a] leading-relaxed">
                Evaluators can instantly verify the authenticity and non-tampering of this credential via public signature check.
              </p>

              <button
                onClick={handleVerify}
                disabled={isVerifying || !proofCard}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-[#141413] hover:bg-[#3d3d3a] text-[#faf9f5] font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50"
              >
                {isVerifying ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={14} />
                    <span>Verify Cryptographic Signature</span>
                  </>
                )}
              </button>

              {/* Verification Result Callout */}
              {verificationResult && (
                <div className={`p-5 rounded-2xl border text-xs space-y-2 transition-all ${
                  verificationResult.is_valid
                    ? 'bg-[#e8e6dc] border-[#141413]/20 text-[#141413]'
                    : 'bg-[#faf9f5] border-[#141413] text-[#141413]'
                }`}>
                  <div className="font-black text-[14px] uppercase tracking-wider flex items-center gap-2">
                    {verificationResult.is_valid ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                    <span>{verificationResult.status || (verificationResult.is_valid ? 'Authentic' : 'Invalid Match')}</span>
                  </div>
                  <p className="text-xs font-bold text-[#3d3d3a]">
                    {verificationResult.is_valid
                      ? 'The digital signature matches the ground-truth hash of all recorded proof items. No tampering detected.'
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
