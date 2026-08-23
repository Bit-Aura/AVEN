'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-neo-bg flex items-center justify-center p-8">
      <div className="bg-neo-red text-white border-8 border-black shadow-brutal p-12 flex flex-col items-center gap-6 max-w-2xl text-center">
        <h2 className="text-4xl font-black uppercase">Something Broke!</h2>
        <p className="text-xl font-bold bg-black p-4">
          The deterministic domain engine encountered an unexpected state. 
        </p>
        <button
          onClick={() => reset()}
          className="bg-white text-black border-4 border-black px-8 py-4 font-black uppercase shadow-brutal hover:shadow-brutal-active hover:translate-y-1 hover:translate-x-1 transition-all"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
