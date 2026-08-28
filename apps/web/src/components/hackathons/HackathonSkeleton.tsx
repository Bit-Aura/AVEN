'use client';

import React from 'react';

export default function HackathonSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="bg-white border border-[#141413]/10 rounded-2xl p-5 space-y-4 animate-pulse shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div className="h-4 w-16 bg-[#e8e6dc] rounded-md" />
            <div className="h-4 w-20 bg-[#e8e6dc] rounded-md" />
          </div>
          <div className="space-y-2">
            <div className="h-5 w-3/4 bg-[#e8e6dc] rounded-md" />
            <div className="h-3 w-1/2 bg-[#e8e6dc] rounded-md" />
          </div>
          <div className="h-4 w-1/3 bg-[#e8e6dc] rounded-md" />
          <div className="pt-3 border-t border-[#141413]/10 flex items-center justify-between">
            <div className="h-4 w-20 bg-[#e8e6dc] rounded-md" />
            <div className="h-6 w-16 bg-[#e8e6dc] rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}
