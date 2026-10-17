import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SPRING_TRANSITIONS } from '@lfps/ui';
import { useTimetableStore } from '../store/useTimetableStore.js';
import { User, LogOut, X, Check } from 'lucide-react';

export const StaffLoginModal: React.FC = () => {
  const {
    isStaffLoginOpen,
    closeStaffLogin,
    loggedInTeacher,
    login,
    logout,
    directory,
  } = useTimetableStore();

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isStaffLoginOpen) {
        closeStaffLogin();
      }
    };
    if (isStaffLoginOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isStaffLoginOpen, closeStaffLogin]);

  if (!isStaffLoginOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 pointer-events-auto"
        onClick={closeStaffLogin}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 12 }}
          transition={SPRING_TRANSITIONS.bouncy}
          onClick={(e) => e.stopPropagation()}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-4 max-h-[85vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-shrink-0">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <User className="w-4 h-4 text-blue-400" />
              Operating Identity & Staff Login
            </h3>
            <button
              onClick={closeStaffLogin}
              className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-slate-400 flex-shrink-0">
            Select your staff profile to view personal duties, accept or dispute substitutions, and manage schedules.
          </p>

          {/* Current Status Pill */}
          {loggedInTeacher && (
            <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-slate-300">Active: </span>
                <span className="font-bold text-white">{loggedInTeacher}</span>
              </div>
              <button
                onClick={() => {
                  logout();
                  closeStaffLogin();
                }}
                className="px-2 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-[11px] font-semibold flex items-center gap-1 transition-colors"
              >
                <LogOut className="w-3 h-3" />
                Log Out
              </button>
            </div>
          )}

          {/* Staff List */}
          <div className="overflow-y-auto space-y-1.5 pr-1 scrollbar-thin flex-1 min-h-0">
            {Object.values(directory).map((teacher) => {
              const isCurrent = loggedInTeacher === teacher.abbr;
              return (
                <button
                  key={teacher.id}
                  onClick={() => {
                    login(teacher.abbr);
                    closeStaffLogin();
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl border transition-all flex items-center justify-between text-xs cursor-pointer ${
                    isCurrent
                      ? 'bg-blue-600/25 border-blue-500/50 text-white'
                      : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/40 hover:border-slate-600 text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-[11px] font-bold text-blue-300">
                      {teacher.initials}
                    </div>
                    <div>
                      <div className="font-semibold flex items-center gap-1.5">
                        {teacher.abbr}
                        {isCurrent && <Check className="w-3 h-3 text-emerald-400" />}
                      </div>
                      <div className="text-[10px] text-slate-400">{teacher.role}</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-950/80 text-slate-400">
                    {teacher.id}
                  </span>
                </button>
              );
            })}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

