import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SPRING_TRANSITIONS } from '@lfps/ui';
import { useTimetableStore } from '../store/useTimetableStore.js';
import { getEffectiveOfficiatingAC, PeriodId, SCHOOL_TIME_ZONE } from '@lfps/core';
import {
  Bell,
  X,
  Flag,
  ShieldAlert,
  Clock,
  Sparkles,
  CheckCircle2,
  Trash2,
  ArrowRight,
  UserCheck,
} from 'lucide-react';

export const NotificationCenterDrawer: React.FC = () => {
  const {
    isNotificationCenterOpen,
    closeNotificationCenter,
    notifications,
    markNotificationRead,
    clearAllNotifications,
    selectedDay,
    schedule,
    absences,
    substitutions,
    officiatingAC,
    openOfficiatingModal,
    openAssignSubModal,
    setActiveTab,
  } = useTimetableStore();

  // Escape key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isNotificationCenterOpen) {
        closeNotificationCenter();
      }
    };
    if (isNotificationCenterOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isNotificationCenterOpen, closeNotificationCenter]);

  if (!isNotificationCenterOpen) return null;

  const currentSchedule = schedule[selectedDay] || {};
  const periods: PeriodId[] = ['G/PD', '1st', '2nd', '3rd', '4th', '5th', '6th'];

  // 1. Live Disputed Substitutions
  const disputedSubs = substitutions.filter(
    (s) => s.day === selectedDay && s.status === 'DISPUTED'
  );

  // 2. Live Uncovered Slots
  const activeAbsences = absences.filter((a) => a.day === selectedDay);
  const uncoveredCount = activeAbsences.reduce((acc, abs) => {
    let count = 0;
    periods.forEach((p) => {
      if (abs.periods && !abs.periods.includes(p)) return;
      const task = currentSchedule[p]?.[abs.teacherName];
      if (task && task !== 'Free' && task !== '-') {
        const covered = substitutions.some(
          (s) => s.day === selectedDay && s.period === p && s.originalTeacher === abs.teacherName
        );
        if (!covered) count++;
      }
    });
    return acc + count;
  }, 0);

  // 3. Officiating AC Appointment Needed
  const offACResult = getEffectiveOfficiatingAC({
    day: selectedDay,
    absences,
    officiatingACMap: officiatingAC,
  });

  const totalAlertCount =
    notifications.filter((n) => !n.isRead).length +
    disputedSubs.length +
    (uncoveredCount > 0 ? 1 : 0) +
    (offACResult.needsAppointment ? 1 : 0);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden pointer-events-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={closeNotificationCenter}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Slide-over Drawer */}
        <div className="fixed inset-y-0 right-0 max-w-full flex pl-10 pointer-events-none">
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={SPRING_TRANSITIONS.snappy}
            className="w-screen max-w-md bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col pointer-events-auto select-none"
          >
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    Notification Center
                    {totalAlertCount > 0 && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-bold">
                        {totalAlertCount}
                      </span>
                    )}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Live operational notices and dispatcher alerts for {selectedDay}.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {notifications.length > 0 && (
                  <button
                    onClick={clearAllNotifications}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                    title="Clear notification history"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={closeNotificationCenter}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  title="Close (Esc)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Scrollable Alerts Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
              {/* Alert Category 1: Live Disputes */}
              {disputedSubs.map((sub) => (
                <div
                  key={sub.id}
                  className="p-3 rounded-2xl bg-gradient-to-r from-amber-950/40 to-slate-900 border border-amber-500/50 space-y-2 shadow-lg shadow-amber-950/20"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="p-1 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/40">
                        <Flag className="w-3.5 h-3.5" />
                      </span>
                      <div>
                        <span className="text-xs font-bold text-amber-200">
                          Substitution Disputed
                        </span>
                        <div className="text-[11px] text-slate-300">
                          {sub.substituteTeacher || 'Substitute'} disputed Period {sub.period}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40">
                      ACTION REQ
                    </span>
                  </div>

                  {sub.disputeRemark && (
                    <div className="p-2 rounded-xl bg-slate-950/70 border border-amber-500/20 text-xs text-amber-100/90 italic">
                      "{sub.disputeRemark}"
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-slate-400 font-medium">
                      Class: {sub.className} &bull; {sub.subject}
                    </span>
                    <button
                      onClick={() => {
                        closeNotificationCenter();
                        setActiveTab('substitutions');
                        openAssignSubModal({
                          day: sub.day,
                          period: sub.period,
                          originalTeacher: sub.originalTeacher,
                          className: sub.className,
                          subject: sub.subject,
                          task: `${sub.className} • ${sub.subject}`,
                        });
                      }}
                      className="px-2.5 py-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1 transition-all cursor-pointer shadow-sm active:scale-95"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Reassign Sub</span>
                    </button>
                  </div>
                </div>
              ))}

              {/* Alert Category 2: Officiating AC Required */}
              {offACResult.needsAppointment && (
                <div className="p-3 rounded-2xl bg-purple-950/30 border border-purple-500/50 space-y-2 shadow-lg">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="p-1 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/40">
                        <ShieldAlert className="w-3.5 h-3.5" />
                      </span>
                      <div>
                        <span className="text-xs font-bold text-purple-200">
                          Officiating AC Required
                        </span>
                        <div className="text-[11px] text-slate-300">
                          Both Academic Coordinator & Assistant AC are absent today
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold border border-purple-500/40">
                      URGENT
                    </span>
                  </div>

                  <div className="flex items-center justify-end pt-1">
                    <button
                      onClick={() => {
                        closeNotificationCenter();
                        openOfficiatingModal({ type: 'AC' });
                      }}
                      className="px-3 py-1 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1 transition-all cursor-pointer shadow-md shadow-purple-600/30 active:scale-95"
                    >
                      <span>Appoint Off. AC</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}

              {/* Alert Category 3: Uncovered Teaching Periods */}
              {uncoveredCount > 0 && (
                <div className="p-3 rounded-2xl bg-rose-950/25 border border-rose-500/40 space-y-2 shadow-lg">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="p-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40">
                        <Clock className="w-3.5 h-3.5" />
                      </span>
                      <div>
                        <span className="text-xs font-bold text-rose-200">
                          {uncoveredCount} Uncovered Teaching Periods
                        </span>
                        <div className="text-[11px] text-slate-300">
                          Absent staff require substitute teacher allocation
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold border border-rose-500/40">
                      PENDING
                    </span>
                  </div>

                  <div className="flex items-center justify-end pt-1">
                    <button
                      onClick={() => {
                        closeNotificationCenter();
                        setActiveTab('substitutions');
                      }}
                      className="px-3 py-1 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1 transition-all cursor-pointer shadow-md shadow-rose-600/30 active:scale-95"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Review Coverage</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Stored / System Notifications */}
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => markNotificationRead(notif.id)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    notif.isRead
                      ? 'bg-slate-900/60 border-slate-800 text-slate-400'
                      : 'bg-slate-800/80 border-slate-700 text-slate-200 shadow-md'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      {!notif.isRead && (
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" />
                      )}
                      {notif.title}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {new Date(notif.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZone: SCHOOL_TIME_ZONE,
                      })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">{notif.description}</p>
                </div>
              ))}

              {/* Empty State */}
              {totalAlertCount === 0 && notifications.length === 0 && (
                <div className="text-center py-12 text-slate-500 space-y-2">
                  <div className="w-12 h-12 rounded-full bg-slate-800/80 border border-slate-700/60 flex items-center justify-center mx-auto text-emerald-400">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-semibold text-slate-300">All Systems Clear</h4>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    No active disputes, uncovered periods, or pending officiating appointments for {selectedDay}.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-500">
              <span>Little Flower Preparatory School</span>
              <button
                onClick={closeNotificationCenter}
                className="px-3 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition-colors"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
};
