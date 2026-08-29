'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Lock } from 'lucide-react';
import { useSafeUser } from '../../lib/clerkSafe';
import { updateUserProfile, updateUserPassword } from '../../api/client';

export type Tab = 'account' | 'security';

interface UserSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: Tab;
}

/**
 * Enterprise-grade implementation of UserSettingsModal.
 * Provides production-ready logic and seamless integration within the AVEN ecosystem.
 */
export function UserSettingsModal({ isOpen, onClose, defaultTab = 'account' }: UserSettingsModalProps) {
  const { user } = useSafeUser();
  const [activeTab, setActiveTab] = useState<Tab>(defaultTab);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab);
      setName(user?.fullName || user?.firstName || user?.username || '');
      setEmail(user?.primaryEmailAddress?.emailAddress || '');
      setCurrentPassword('');
      setNewPassword('');
      setSuccessMsg('');
      setErrorMsg('');
    }
  }, [isOpen, defaultTab, user]);

  if (!isOpen) return null;

  const handleSaveAccount = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      setSuccessMsg('');
      const res = await updateUserProfile({ name, email });
      if (typeof window !== 'undefined') {
        localStorage.setItem('aven_auth_user', JSON.stringify(res));
      }
      setSuccessMsg('Account details saved successfully.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update account.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSecurity = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      setSuccessMsg('');
      await updateUserPassword({ current_password: currentPassword, new_password: newPassword });
      setSuccessMsg('Security credentials updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-[#141413]/60 backdrop-blur-sm"
          onClick={onClose}
        />
        
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="relative w-full max-w-xl bg-[#faf9f5] border border-[#d6d3c4] shadow-2xl rounded overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-[#d6d3c4]/50 bg-[#e8e6dc]/30">
            <div>
              <h2 className="text-xl font-black text-[#141413] tracking-tight">Identity & Access</h2>
              <p className="text-xs font-bold text-[#87867f] mt-1 uppercase tracking-widest">Manage your platform presence</p>
            </div>
            <button 
              onClick={onClose}
              className="p-2 -mr-2 text-[#87867f] hover:text-[#141413] hover:bg-[#d6d3c4]/50 rounded transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Navigation - Removed as there is only one tab now */}
          <div className="flex px-6 border-b border-[#d6d3c4]/50 bg-[#e8e6dc]/10 h-2"></div>

          {/* Body */}
          <div className="p-6 flex-1 overflow-y-auto">
            {errorMsg && (
              <div className="mb-6 p-4 bg-[#cf3e3e]/10 border border-[#cf3e3e]/30 rounded flex items-start gap-3 text-[#cf3e3e]">
                <div className="w-1.5 h-1.5 mt-1.5 rounded-full bg-[#cf3e3e] shrink-0" />
                <span className="text-sm font-bold">{errorMsg}</span>
              </div>
            )}
            
            {successMsg && (
              <div className="mb-6 p-4 bg-[#4a7251]/10 border border-[#4a7251]/30 rounded flex items-start gap-3 text-[#4a7251]">
                <div className="w-1.5 h-1.5 mt-1.5 rounded-full bg-[#4a7251] shrink-0" />
                <span className="text-sm font-bold">{successMsg}</span>
              </div>
            )}

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#87867f] uppercase tracking-widest block">
                  Full Name
                </label>
                <input 
                  type="text" 
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-white border border-[#d6d3c4] rounded px-4 py-3 text-sm font-bold text-[#141413] focus:outline-none focus:border-[#141413] focus:ring-1 focus:ring-[#141413] transition-all"
                  placeholder="Enter your full name"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#87867f] uppercase tracking-widest block">
                  Email Address
                </label>
                <input 
                  type="email" 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-white border border-[#d6d3c4] rounded px-4 py-3 text-sm font-bold text-[#141413] focus:outline-none focus:border-[#141413] focus:ring-1 focus:ring-[#141413] transition-all"
                  placeholder="Enter your email"
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-6 border-t border-[#d6d3c4]/50 bg-[#e8e6dc]/30 flex justify-end gap-3">
            <button 
              onClick={onClose}
              className="px-6 py-2.5 rounded border border-[#d6d3c4] text-[#87867f] text-xs font-black uppercase tracking-widest hover:bg-[#d6d3c4]/50 hover:text-[#141413] transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleSaveAccount}
              disabled={loading}
              className="px-6 py-2.5 rounded bg-[#141413] text-[#faf9f5] text-xs font-black uppercase tracking-widest hover:bg-[#3d3d3a] transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-3.5 h-3.5 border-2 border-[#faf9f5]/30 border-t-[#faf9f5] rounded-full animate-spin" />
              ) : (
                <Save size={14} />
              )}
              Save Changes
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
