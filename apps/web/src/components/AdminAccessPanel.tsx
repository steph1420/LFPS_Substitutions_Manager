import React from 'react';
import { Lock, LockOpen, ShieldCheck } from 'lucide-react';
import { useTimetableStore } from '../store/useTimetableStore.js';
import { getConfiguredAdminHash } from '../lib/adminGate.js';

/**
 * Settings → Admin Access. Unlocks admin-only actions for this tab with the passcode
 * whose SHA-256 is configured at build time. Client-side convenience gate only —
 * see docs/ADMIN_ACCESS.md (and TODO SEC-02 for real, server-side auth).
 */
export const AdminAccessPanel: React.FC<{ onToast: (msg: string) => void }> = ({ onToast }) => {
  const operatingRole = useTimetableStore((s) => s.operatingRole);
  const unlockAdmin = useTimetableStore((s) => s.unlockAdmin);
  const lockAdmin = useTimetableStore((s) => s.lockAdmin);
  const isConfigured = React.useMemo(() => getConfiguredAdminHash() !== null, []);
  const [passcode, setPasscode] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const isAdmin = operatingRole === 'ADMIN';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || !passcode) return;
    setBusy(true);
    const result = await unlockAdmin(passcode);
    setBusy(false);
    setPasscode('');
    if (result.ok) {
      setError(null);
      onToast('Admin access unlocked for this tab');
    } else {
      setError(result.reason ?? 'Unlock failed.');
    }
  };

  return (
    <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {isAdmin ? (
            <LockOpen className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          ) : (
            <Lock className="w-4 h-4 text-slate-400 flex-shrink-0" />
          )}
          <div>
            <div className="font-semibold text-slate-200">Admin Access</div>
            <div className="text-[11px] text-slate-400">
              {isAdmin
                ? 'Unlocked in this tab: routine edits, Reset Day, Purge History, solver policy, Developer Options.'
                : 'Front Desk can run the day without this. Needed only for routine edits and resets.'}
            </div>
          </div>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={() => {
              lockAdmin();
              onToast('Admin access locked');
            }}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-1.5 transition-colors active:scale-95 flex-shrink-0"
          >
            <Lock className="w-3.5 h-3.5" />
            Lock
          </button>
        )}
      </div>

      {!isAdmin && isConfigured && (
        <form onSubmit={submit} className="flex items-center gap-2">
          <input
            type="password"
            autoComplete="current-password"
            value={passcode}
            onChange={(e) => {
              setPasscode(e.target.value);
              if (error) setError(null);
            }}
            placeholder="Admin passcode"
            aria-label="Admin passcode"
            className="flex-1 min-w-0 bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={busy || !passcode}
            className="px-3 py-1.5 rounded-xl bg-blue-600/80 hover:bg-blue-600 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors active:scale-95"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Unlock
          </button>
        </form>
      )}

      {!isAdmin && !isConfigured && (
        <div className="text-[11px] text-amber-300/90 bg-amber-950/30 border border-amber-500/20 rounded-lg px-2.5 py-1.5">
          Admin passcode not set up for this build. Run <code className="font-mono">npm run admin:hash</code>, put
          the result in <code className="font-mono">VITE_ADMIN_PASSCODE_SHA256</code> and rebuild (docs/ADMIN_ACCESS.md).
        </div>
      )}

      {error && <div className="text-[11px] text-rose-300">{error}</div>}
    </div>
  );
};
