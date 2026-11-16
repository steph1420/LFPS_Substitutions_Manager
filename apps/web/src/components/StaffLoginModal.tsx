import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SPRING_TRANSITIONS } from '@lfps/ui';
import { directoryPrincipal, PRINCIPAL_DESIGNATION, type AdminOffice } from '@lfps/core';
import { useTimetableStore } from '../store/useTimetableStore.js';
import { adminOfficeToday } from '../lib/access.js';
import { AdminPasscodeStep } from './AdminPasscodeStep.js';
import { User, LogOut, X, Check, ShieldCheck } from 'lucide-react';

import styles from './StaffLoginModal.module.css';

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
        className={styles.div1}
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
          className={`${styles.motionDiv1} bg-surface-modal border-default text-ink`}
        >
          {/* Header */}
          <div className={styles.div2}>
            <h3 className={`${styles.h31} text-ink`}>
              <User className={styles.user1} />
              Operating Identity & Staff Login
            </h3>
            <button
              onClick={closeStaffLogin}
              className={styles.button1}
              title="Close (Esc)"
            >
              <X className={styles.x1} />
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
                className={styles.motionDiv2}
              >
                <p className={styles.p1}>
                  Pick your name to see your duties. Admins (Principal, AC, AAC, Off. AC) enter the passcode to edit.
                </p>

                {/* Current Status Pill */}
                {loggedInTeacher && (
                  <div className={styles.div3}>
                    <div className={styles.div4}>
                      <span className={`${styles.span1} status-dot-live`} />
                      <span className={styles.span2}>Active: </span>
                      <span className={`${styles.span3} text-ink`}>{loggedInTeacher}</span>
                      {isAdmin && (
                        <span className={styles.span4}>Admin</span>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        logout();
                        closeStaffLogin();
                      }}
                      className={styles.button2}
                    >
                      <LogOut className={styles.logOut1} />
                      Log Out
                    </button>
                  </div>
                )}

                {/* Staff List */}
                <div className={`${styles.div5} scrollbar-thin`}>
                  {entries.map((entry) => {
                    const isCurrent = loggedInTeacher === entry.identity;
                    return (
                      <button
                        key={entry.key}
                        onClick={() => choose(entry)}
                        data-identity={entry.identity}
                        className={`${styles.button3A} ${
                          isCurrent
                            ? styles.button3B
                            : styles.button3C
                        }`}
                      >
                        <div className={styles.div6}>
                          <div className={styles.div7}>
                            {entry.initials}
                          </div>
                          <div className={styles.div8}>
                            <div className={styles.div9}>
                              <span className={styles.span5}>{entry.identity}</span>
                              {isCurrent && <Check className={styles.check1} />}
                            </div>
                            <div className={styles.div10}>{entry.subtitle}</div>
                          </div>
                        </div>
                        {entry.tag && (
                          <span className={styles.span6}>
                            <ShieldCheck className={styles.shieldCheck1} />
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
