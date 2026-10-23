import React from 'react';
import { Lock, LockOpen } from 'lucide-react';
import { useTimetableStore } from '../store/useTimetableStore.js';
import { ADMIN_PASSCODE_LENGTH, formatWait, getConfiguredAdminHash } from '../lib/adminGate.js';
import { PasscodeField } from './PasscodeField.js';

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
  const lockedUntil = useTimetableStore((s) => s.adminLockedUntil);
  const [error, setError] = React.useState<string | null>(null);
  const [now, setNow] = React.useState(() => Date.now());
  const isAdmin = operatingRole === 'ADMIN';
  const waitMs = lockedUntil ? lockedUntil - now : 0;
  const isLockedOut = waitMs > 0;

  // Tick once a second while a wait is running, so the countdown and keypad re-enable live.
  React.useEffect(() => {
    if (!lockedUntil || lockedUntil <= Date.now()) return;
    setNow(Date.now());
    const id = setInterval(() => {
      setNow(Date.now());
      if (Date.now() >= lockedUntil) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [lockedUntil]);

  const submit = async (code: string): Promise<boolean> => {
    const result = await unlockAdmin(code);
    if (result.ok) {
      setError(null);
      onToast('Admin access unlocked for this tab');
      return true;
    }
    setError(result.reason ?? 'Unlock failed.');
    return false;
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
        <div className="space-y-1.5">
          <PasscodeField
            length={ADMIN_PASSCODE_LENGTH}
            label="Admin passcode"
            disabled={isLockedOut}
            onComplete={submit}
          />
          <div className="text-[11px] text-slate-500">
            {isLockedOut
              ? `Too many attempts. Try again in ${formatWait(waitMs)}.`
              : `Enter the ${ADMIN_PASSCODE_LENGTH}-digit admin passcode.`}
          </div>
        </div>
      )}

      {!isAdmin && !isConfigured && (
        <div className="text-[11px] text-amber-300/90 bg-amber-950/30 border border-amber-500/20 rounded-lg px-2.5 py-1.5">
          Admin passcode not set up for this build. Run <code className="font-mono">npm run admin:hash</code>, put
          the result in <code className="font-mono">VITE_ADMIN_PASSCODE_SHA256</code> and rebuild (docs/ADMIN_ACCESS.md).
        </div>
      )}

      {error && !isLockedOut && <div className="text-[11px] text-rose-300" role="alert">{error}</div>}
    </div>
  );
};
