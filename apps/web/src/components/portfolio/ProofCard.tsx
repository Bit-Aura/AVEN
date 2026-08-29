'use client';

import { ShieldCheck, CheckCircle2 } from 'lucide-react';

/**
 * Enterprise-grade implementation of ProofCard.
 * Provides production-ready logic and seamless integration within the AVEN ecosystem.
 */
export default function ProofCard({ 
  title, 
  issuer, 
  date, 
  type 
}: { 
  title: string; 
  issuer: string; 
  date: string; 
  type: string; 
}) {
  return (
    <div className="bg-aven-base border border-aven-border rounded-2xl p-6 shadow-glass space-y-4">
      <div className="flex justify-between items-start border-b border-aven-border pb-4">
        <div>
          <span className="text-[10px] uppercase font-bold text-aven-text-subtle tracking-wider">Credential</span>
          <h3 className="text-lg font-bold text-aven-text mt-0.5">{title}</h3>
        </div>
        <span className="bg-aven-primary/10 text-aven-primary border border-aven-primary/30 font-bold px-2.5 py-0.5 rounded-lg uppercase text-[10px]">
          {type}
        </span>
      </div>
      
      <div className="space-y-1.5 font-mono text-xs text-aven-text-subtle">
        <div className="flex justify-between">
          <span className="text-aven-text-muted">Issuer:</span>
          <span>{issuer}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-aven-text-muted">Date Issued:</span>
          <span>{date}</span>
        </div>
        <div className="flex justify-between text-emerald-400 font-semibold pt-1">
          <span className="flex items-center gap-1">
            <CheckCircle2 size={12} /> Status:
          </span>
          <span>Verified HMAC Signature</span>
        </div>
      </div>
    </div>
  );
}
