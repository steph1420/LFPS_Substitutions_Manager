import React from 'react';
import { motion } from 'framer-motion';
import { SPRING_TRANSITIONS } from '@lfps/ui';
import { PeriodId } from '@lfps/core';
import { useTimetableStore, ActiveTab } from '../store/useTimetableStore.js';
import { Table2, Sparkles, Users } from 'lucide-react';

export const TabBar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    selectedDay,
    schedule,
    absences,
    substitutions,
    directory,
    isFitGrid,
    isMinimalUI,
  } = useTimetableStore();

  // Hide floating dock when Routine Grid is expanded to Fullscreen
  if (isFitGrid) return null;

  // Helper to determine if a teacher is a Class Teacher (LOGIC-05)
  const isClassTeacher = (teacherName: string): boolean => {
    const teacher = directory[teacherName];
    if (!teacher) return false;
    return teacher.role.includes('Class Teacher');
  };

  // Calculate live badge for Uncovered Substitution Slots & CT status (LOGIC-05)
  const currentSchedule = schedule[selectedDay] || {};
  const { uncoveredCount, hasUncoveredCTSlots } = React.useMemo(() => {
    let count = 0;
    let ctUncovered = false;
    const activeAbsences = absences.filter((a) => a.day === selectedDay);
    const periods: PeriodId[] = ['G/PD', '1st', '2nd', '3rd', '4th', '5th', '6th'];

    activeAbsences.forEach((abs) => {
      const isCT = isClassTeacher(abs.teacherName);
      periods.forEach((p) => {
        if (abs.periods && !abs.periods.includes(p)) return;
        const task = currentSchedule[p]?.[abs.teacherName];
        if (task && task !== 'Free' && task !== '-') {
          const isCovered = substitutions.some(
            (s) => s.day === selectedDay && s.period === p && s.originalTeacher === abs.teacherName
          );
          if (!isCovered) {
            count++;
            if (isCT) {
              ctUncovered = true;
            }
          }
        }
      });
    });

    return { uncoveredCount: count, hasUncoveredCTSlots: ctUncovered };
  }, [selectedDay, schedule, absences, substitutions, directory]);

  // Calculate live badge for Absent Staff
  const absentCount = absences.filter(
    (a) => a.day === selectedDay && a.type !== 'AWAY_OFFICIAL'
  ).length;

  const triggerHaptic = (ms = 20) => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(ms);
      } catch {
        // ignore
      }
    }
  };

  const handleSelectTab = (tab: ActiveTab) => {
    triggerHaptic(20);
    setActiveTab(tab);
  };

  // Keyboard navigation shortcuts: 1 = Routine, 2 = Substitutions, 3 = Roster
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when user is typing in an input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if (e.key === '1') setActiveTab('routine');
      if (e.key === '2') setActiveTab('substitutions');
      if (e.key === '3') setActiveTab('roster');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setActiveTab]);

  const tabs: Array<{
    id: ActiveTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
    badgeVariant?: 'amber' | 'rose';
  }> = [
    {
      id: 'routine',
      label: 'Routine Matrix',
      icon: Table2,
    },
    {
      id: 'substitutions',
      label: 'Substitutions',
      icon: Sparkles,
      badge: uncoveredCount,
      badgeVariant: 'amber',
    },
    {
      id: 'roster',
      label: 'Staff Roster',
      icon: Users,
      badge: absentCount,
      badgeVariant: 'rose',
    },
  ];

  return (
    <nav
      aria-label="Navigation Tabs"
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-slate-950/92 backdrop-blur-2xl border border-slate-700/80 rounded-full shadow-[0_16px_40px_rgba(0,0,0,0.85)] flex items-center gap-1 sm:gap-2 select-none transition-all ${
        isMinimalUI ? 'p-1' : 'p-1.5'
      }`}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;
        const isUrgent =
          !isActive &&
          tab.id === 'substitutions' &&
          (uncoveredCount > 0 || hasUncoveredCTSlots);

        return (
          <button
            key={tab.id}
            onClick={() => handleSelectTab(tab.id)}
            className={`relative rounded-full text-xs font-semibold flex items-center gap-2 transition-all active:scale-95 cursor-pointer ${
              isMinimalUI ? 'px-2.5 sm:px-3.5 py-1.5' : 'px-3.5 sm:px-4 py-2'
            } ${
              isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200'
            } ${
              isUrgent ? 'attention-pulse border border-amber-500/80 text-amber-200' : 'border border-transparent'
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="activeNavDockPill"
                transition={SPRING_TRANSITIONS.snappy}
                className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 shadow-md shadow-blue-600/30 -z-10"
              />
            )}

            <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
            <span className="text-xs tracking-tight">{tab.label}</span>

            {/* Notification Badge */}
            {tab.badge !== undefined && tab.badge > 0 && (
              <span
                className={`ml-0.5 text-[10px] font-bold px-1.5 py-0.2 rounded-full border shadow-sm ${
                  tab.badgeVariant === 'amber'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
};

