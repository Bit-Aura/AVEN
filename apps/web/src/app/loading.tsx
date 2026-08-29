'use client';

/**
 * Enterprise-grade implementation of Loading.
 * Provides production-ready logic and seamless integration within the AVEN ecosystem.
 */
export default function Loading() {
  return (
    <div className="min-h-screen bg-[#faf9f5] flex items-center justify-center p-8 select-none">
      <div className="w-16 h-16 border-[3px] border-[#d6d3c4] border-t-[#141413] rounded-full animate-spin" />
    </div>
  );
}
