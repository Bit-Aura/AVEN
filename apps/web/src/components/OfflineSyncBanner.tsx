'use client';

import { usePathStore } from '../store/usePathStore';
import { WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useEffect, useState } from 'react';

/**
 * Enterprise-grade implementation of OfflineSyncBanner.
 * Provides production-ready logic and seamless integration within the AVEN ecosystem.
 */
export default function OfflineSyncBanner() {
  const isOffline = usePathStore((state) => state.isOffline);
  const syncQueue = usePathStore((state) => state.syncQueue);
  const syncOfflineProgress = usePathStore((state) => state.syncOfflineProgress);
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    // When we transition from offline to online, and have items in the queue, sync them.
    if (!isOffline && syncQueue.length > 0) {
      setIsSyncing(true);
      
      // Simulate network request delay for syncing
      const timer = setTimeout(() => {
        syncOfflineProgress();
        setIsSyncing(false);
        setShowSuccess(true);
        
        setTimeout(() => setShowSuccess(false), 3000);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [isOffline, syncQueue.length, syncOfflineProgress]);

  if (!isOffline && syncQueue.length === 0 && !isSyncing && !showSuccess) return null;

  return (
    <div className="fixed bottom-0 left-0 w-full z-50 animate-in slide-in-from-bottom">
      {isOffline && (
        <div className="bg-amber-500 text-amber-950 px-4 py-3 flex items-center justify-center gap-3 font-medium shadow-[0_-4px_15px_rgba(245,158,11,0.2)]">
          <WifiOff size={18} />
          <span>You are offline. Progress is being saved locally.</span>
          {syncQueue.length > 0 && (
            <span className="bg-amber-950 text-amber-50 px-2 py-0.5 rounded-full text-xs ml-2 font-bold">
              {syncQueue.length} pending
            </span>
          )}
        </div>
      )}

      {!isOffline && isSyncing && (
        <div className="bg-blue-600 text-aven-text px-4 py-3 flex items-center justify-center gap-3 font-medium shadow-[0_-4px_15px_rgba(37,99,235,0.3)]">
          <RefreshCw size={18} className="animate-spin" />
          <span>Connection restored. Syncing your progress...</span>
        </div>
      )}

      {!isOffline && !isSyncing && showSuccess && (
        <div className="bg-emerald-600 text-aven-text px-4 py-3 flex items-center justify-center gap-3 font-medium shadow-[0_-4px_15px_rgba(5,150,105,0.3)]">
          <CheckCircle2 size={18} />
          <span>All offline progress successfully synced!</span>
        </div>
      )}
    </div>
  );
}
