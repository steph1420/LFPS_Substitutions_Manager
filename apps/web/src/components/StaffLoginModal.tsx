import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SPRING_TRANSITIONS } from '@lfps/ui';
import { directoryPrincipal, PRINCIPAL_DESIGNATION, type AdminOffice } from '@lfps/core';
import { useTimetableStore } from '../store/useTimetableStore.js';
import { adminOfficeToday } from '../lib/access.js';
import { AdminPasscodeStep } from './AdminPasscodeStep.js';
import { User, LogOut, X, Check, ShieldCheck } from 'lucide-react';

interface LoginEntry {
  key: string;
  identity: string;
  subtitle: string;
  initials: string;
  tag?: string;
  office: AdminOffice | null;
}

/**
 * Operating Identity & Staff Login. The one place to sign in (Bundle 34a): staff without
 * an admin office are identified at a tap; the Principal, AC, AAC and today's Off. AC
 * continue to the admin passcode and get editing for this tab.
 */
export const StaffLoginModal: React.FC = () => {
  const { isStaffLoginOpen, closeStaffLogin, loggedInTeacher, login, logout, directory, absences, officiatingAC } =
    useTimetableStore();
  const isAdmin = useTimetableStore((s) => s.access.isAdmin);
  const [pending, setPending] = React.useState<{ identity: string; office: AdminOffice } | null>(null);

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

  // Every opening starts at the staff list.
  useEffect(() => {
    if (!isStaffLoginOpen) setPending(null);
  }, [isStaffLoginOpen]);

  const entries = React.useMemo<LoginEntry[]>(() => {
    const inputs = { directory, absences, officiatingAC };
    const list: LoginEntry[] = [];
    // No Principal in the Staff Directory (true for the school data today): offer the office.
    if (!directoryPrincipal(directory)) {
      list.push({
        key: 'designation-principal',
        identity: PRINCIPAL_DESIGNATION,
        subtitle: 'Principal',
        initials: 'P',
        tag: 'Admin',
        office: 'PRINCIPAL',
      });
    }
    for (const t of Object.values(directory)) {
      const office = adminOfficeToday(t.abbr, inputs);
      list.push({
        key: t.id,
        identity: t.abbr,
        subtitle: t.role,
        initials: t.initials,
        tag: office === 'OFF_AC' ? 'Off. AC today' : office ? 'Admin' : undefined,
        office,
      });
    }
    return list;
  }, [directory, absences, officiatingAC]);

  if (!isStaffLoginOpen) return null;

  const choose = (entry: LoginEntry) => {
    if (entry.office) {
      setPending({ identity: entry.identity, office: entry.office });
      return;
    }
    if (login(entry.identity).ok) closeStaffLogin();
  };

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
          role="dialog"
          aria-modal="true"
          aria-label="Staff Login"
          className="bg-surface-modal border border-default rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-4 max-h-[85vh] flex flex-col text-ink"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-shrink-0">
            <h3 className="text-sm font-bold text-ink flex items-center gap-2">
              <User className="w-4 h-4 text-blue-400" />
              Operating Identity & Staff Login
            </h3>
            <button
              onClick={closeStaffLogin}
              className="p-2.5 min-w-10 min-h-10 rounded-full text-slate-400 hover:text-ink hover:bg-surface-elev transition-colors inline-flex items-center justify-center"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <AnimatePresence mode="wait" initial={false}>
            {pending ? (
              <motion.div
                key="passcode"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 24 }}
                transition={SPRING_TRANSITIONS.snappy}
              >
                <AdminPasscodeStep
                  identity={pending.identity}
                  office={pending.office}
                  onBack={() => setPending(null)}
                  onSuccess={() => {
                    setPending(null);
                    closeStaffLogin();
                  }}
                />
              </motion.div>
            ) : (
              <motion.div
                key="list"
                initial={{ opacity: 0, x: -24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={SPRING_TRANSITIONS.snappy}
                className="space-y-4 flex flex-col min-h-0"
              >
                <p className="text-xs text-slate-400 flex-shrink-0">
                  Pick your name to see your duties. Admins (Principal, AC, AAC, Off. AC) enter the passcode to edit.
                </p>

                {/* Current Status Pill */}
                {loggedInTeacher && (
                  <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="w-2 h-2 rounded-full status-dot-live" />
                      <span className="text-slate-300">Active: </span>
                      <span className="font-bold text-ink">{loggedInTeacher}</span>
                      {isAdmin && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">Admin</span>
                      )}
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
                  {entries.map((entry) => {
                    const isCurrent = loggedInTeacher === entry.identity;
                    return (
                      <button
                        key={entry.key}
                        onClick={() => choose(entry)}
                        data-identity={entry.identity}
                        className={`w-full text-left px-3 py-2 rounded-xl border transition-all flex items-center justify-between text-xs cursor-pointer ${
                          isCurrent
                            ? 'bg-blue-600/25 border-blue-500/50 text-white'
                            : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/40 hover:border-slate-600 text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-[11px] font-bold text-blue-300 flex-shrink-0">
                            {entry.initials}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold flex items-center gap-1.5">
                              <span className="truncate">{entry.identity}</span>
                              {isCurrent && <Check className="w-3 h-3 text-emerald-400 flex-shrink-0" />}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">{entry.subtitle}</div>
                          </div>
                        </div>
                        {entry.tag && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 flex items-center gap-1 flex-shrink-0">
                            <ShieldCheck className="w-3 h-3" />
                            {entry.tag}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
