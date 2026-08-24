'use client';

import { ShieldCheck, CheckCircle2 } from 'lucide-react';

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
    <div className="bg-surface border border-border rounded-2xl p-6 shadow-glass space-y-4">
      <div className="flex justify-between items-start border-b border-border pb-4">
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Credential</span>
          <h3 className="text-lg font-bold text-white mt-0.5">{title}</h3>
        </div>
        <span className="bg-brand-500/10 text-brand-300 border border-brand-500/30 font-bold px-2.5 py-0.5 rounded-lg uppercase text-[10px]">
          {type}
        </span>
      </div>
      
      <div className="space-y-1.5 font-mono text-xs text-slate-300">
        <div className="flex justify-between">
          <span className="text-slate-500">Issuer:</span>
          <span>{issuer}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Date Issued:</span>
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
