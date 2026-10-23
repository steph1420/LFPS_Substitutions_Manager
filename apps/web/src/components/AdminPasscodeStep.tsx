import React from 'react';
import { ChevronLeft, ShieldCheck } from 'lucide-react';
import { ADMIN_OFFICE_LABEL, type AdminOffice } from '@lfps/core';
import { useTimetableStore } from '../store/useTimetableStore.js';
import { ADMIN_PASSCODE_LENGTH, formatWait, getConfiguredAdminHash } from '../lib/adminGate.js';
import { PasscodeField } from './PasscodeField.js';

/**
 * Staff Login → admin office holder → passcode (Bundle 34a). The keypad, wrong-code shake
 * and escalating lockout are the Bundle 34 ones; success signs `identity` in as admin.
 */
export const AdminPasscodeStep: React.FC<{
  identity: string;
  office: AdminOffice;
  onBack: () => void;
  onSuccess: () => void;
}> = ({ identity, office, onBack, onSuccess }) => {
  const loginWithPasscode = useTimetableStore((s) => s.loginWithPasscode);
  const lockedUntil = useTimetableStore((s) => s.adminLockedUntil);
  const isConfigured = React.useMemo(() => getConfiguredAdminHash() !== null, []);
  const [error, setError] = React.useState<string | null>(null);
  const [now, setNow] = React.useState(() => Date.now());
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
    const result = await loginWithPasscode(identity, code);
    if (result.ok) {
      setError(null);
      onSuccess();
      return true;
    }
    setError(result.reason ?? 'Sign-in failed.');
    return false;
  };

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={onBack}
        className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
        All staff
      </button>
      <div className="flex items-center gap-2.5">
        <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
        <div>
          <div className="font-semibold text-white text-sm">{identity}</div>
          <div className="text-[11px] text-slate-400">{ADMIN_OFFICE_LABEL[office]} · admin</div>
        </div>
      </div>

      {isConfigured ? (
        <div className="space-y-1.5">
          <PasscodeField
            length={ADMIN_PASSCODE_LENGTH}
            label="Admin passcode"
            disabled={isLockedOut}
            onComplete={submit}
            autoFocus
          />
          <div className="text-[11px] text-slate-500" role="status" aria-live="polite">
            {isLockedOut ? `Too many attempts. Try again in ${formatWait(waitMs)}.` : 'Enter admin passcode'}
          </div>
        </div>
      ) : (
        <div className="text-[11px] text-amber-300/90 bg-amber-950/30 border border-amber-500/20 rounded-lg px-2.5 py-1.5">
          Admin passcode not set up for this build. Run <code className="font-mono">npm run admin:hash</code>, put
          the result in <code className="font-mono">VITE_ADMIN_PASSCODE_SHA256</code> and rebuild (docs/ADMIN_ACCESS.md).
        </div>
      )}

      {error && !isLockedOut && (
        <div className="text-[11px] text-rose-300" role="alert">
          {error}
        </div>
      )}
    </div>
  );
};
