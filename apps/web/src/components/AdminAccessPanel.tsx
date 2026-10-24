import React from 'react';
import { Lock, LockOpen } from 'lucide-react';
import { ADMIN_OFFICE_LABEL } from '@lfps/core';
import { useTimetableStore } from '../store/useTimetableStore.js';
import { getConfiguredAdminHash } from '../lib/adminGate.js';

/**
 * Settings → Admin Access: status only (Bundle 34a). Admins sign in at Staff Login with
 * the passcode — one place to sign in, one to sign out — so there is no second keypad
 * here. Shows the dev override when it is on, with a one-tap way to turn it off.
 * Client-side convenience gate only — see docs/ADMIN_ACCESS.md (TODO SEC-02).
 */
export const AdminAccessPanel: React.FC<{ onToast: (msg: string) => void }> = ({ onToast }) => {
  const access = useTimetableStore((s) => s.access);
  const loggedInTeacher = useTimetableStore((s) => s.loggedInTeacher);
  const logout = useTimetableStore((s) => s.logout);
  const openStaffLogin = useTimetableStore((s) => s.openStaffLogin);
  const closeSettings = useTimetableStore((s) => s.closeSettings);
  const setEditingOverride = useTimetableStore((s) => s.setEditingOverride);
  const isConfigured = React.useMemo(() => getConfiguredAdminHash() !== null, []);
  const { isAdmin, office, editingUnlocked } = access;

  return (
    <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {isAdmin || editingUnlocked ? (
            <LockOpen className={`w-4 h-4 flex-shrink-0 ${isAdmin ? 'text-emerald-400' : 'text-amber-400'}`} />
          ) : (
            <Lock className="w-4 h-4 text-slate-400 flex-shrink-0" />
          )}
          <div>
            <div className="font-semibold text-slate-200">Admin Access</div>
            <div className="text-[11px] text-slate-400">
              {isAdmin && office
                ? `${loggedInTeacher} · ${ADMIN_OFFICE_LABEL[office]}. Editing on in this tab.`
                : 'Principal, AC, AAC and Off. AC sign in at Staff Login with the passcode.'}
            </div>
          </div>
        </div>
        {isAdmin ? (
          <button
            type="button"
            onClick={() => {
              logout();
              onToast('Signed out');
            }}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-1.5 transition-colors active:scale-95 flex-shrink-0"
          >
            <Lock className="w-3.5 h-3.5" />
            Log Out
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              closeSettings();
              openStaffLogin();
            }}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-1.5 transition-colors active:scale-95 flex-shrink-0"
          >
            Admin login
          </button>
        )}
      </div>

      {editingUnlocked && (
        <div className="flex items-center justify-between gap-3 text-[11px] text-amber-200 bg-amber-950/30 border border-amber-500/20 rounded-lg px-2.5 py-1.5">
          <span>Editing unlocked on this device (Dev Options).</span>
          <button
            type="button"
            onClick={() => {
              setEditingOverride(false);
              onToast('Editing locked');
            }}
            className="font-semibold text-amber-100 hover:text-white flex-shrink-0"
          >
            Turn off
          </button>
        </div>
      )}

      {!isConfigured && (
        <div className="text-[11px] text-amber-300/90 bg-amber-950/30 border border-amber-500/20 rounded-lg px-2.5 py-1.5">
          Admin passcode not set up for this build. Run <code className="font-mono">npm run admin:hash</code>, put
          the result in <code className="font-mono">VITE_ADMIN_PASSCODE_SHA256</code> and rebuild (docs/ADMIN_ACCESS.md).
        </div>
      )}
    </div>
  );
};
