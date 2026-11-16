import React from 'react';
import { ChevronLeft, ShieldCheck } from 'lucide-react';
import { ADMIN_OFFICE_LABEL, type AdminOffice } from '@lfps/core';
import { useTimetableStore } from '../store/useTimetableStore.js';
import { ADMIN_PASSCODE_LENGTH, formatWait, getConfiguredAdminHash } from '../lib/adminGate.js';
import { PasscodeField } from './PasscodeField.js';

import styles from './AdminPasscodeStep.module.css';

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
    <div className={styles.div1}>
      <button
        type="button"
        onClick={onBack}
        className={styles.button1}
      >
        <ChevronLeft className={styles.chevronLeft1} />
        All staff
      </button>
      <div className={styles.div2}>
        <ShieldCheck className={styles.shieldCheck1} />
        <div>
          <div className={styles.div3}>{identity}</div>
          <div className={styles.div4}>{ADMIN_OFFICE_LABEL[office]} · admin</div>
        </div>
      </div>

      {isConfigured ? (
        <div className={styles.div5}>
          <PasscodeField
            length={ADMIN_PASSCODE_LENGTH}
            label="Admin passcode"
            disabled={isLockedOut}
            onComplete={submit}
            autoFocus
          />
          <div className={styles.div6} role="status" aria-live="polite">
            {isLockedOut ? `Too many attempts. Try again in ${formatWait(waitMs)}.` : 'Enter admin passcode'}
          </div>
        </div>
      ) : (
        <div className={styles.div7}>
          Admin passcode not set up for this build. Run <code className={styles.code1}>npm run admin:hash</code>, put
          the result in <code className={styles.code2}>VITE_ADMIN_PASSCODE_SHA256</code> and rebuild (docs/ADMIN_ACCESS.md).
        </div>
      )}

      {error && !isLockedOut && (
        <div className={styles.div8} role="alert">
          {error}
        </div>
      )}
    </div>
  );
};
