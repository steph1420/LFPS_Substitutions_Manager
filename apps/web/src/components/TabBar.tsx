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
    isFitGrid,
  } = useTimetableStore();

  // Hide floating dock when Routine Grid is expanded to Fullscreen
  if (isFitGrid) return null;

  // Calculate live badge for Uncovered Substitution Slots
  const currentSchedule = schedule[selectedDay] || {};
  const uncoveredCount = React.useMemo(() => {
    let count = 0;
    const activeAbsences = absences.filter((a) => a.day === selectedDay);
    const periods: PeriodId[] = ['G/PD', '1st', '2nd', '3rd', '4th', '5th', '6th'];

    activeAbsences.forEach((abs) => {
      periods.forEach((p) => {
        if (abs.periods && !abs.periods.includes(p)) return;
        const task = currentSchedule[p]?.[abs.teacherName];
        if (task && task !== 'Free' && task !== '-') {
          const isCovered = substitutions.some(
            (s) => s.day === selectedDay && s.period === p && s.originalTeacher === abs.teacherName
          );
          if (!isCovered) count++;
        }
      });
    });

    return count;
  }, [selectedDay, schedule, absences, substitutions]);

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
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-slate-950/92 backdrop-blur-2xl border border-slate-700/80 rounded-full shadow-[0_16px_40px_rgba(0,0,0,0.85)] p-1.5 flex items-center gap-1 sm:gap-2 select-none"
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            onClick={() => handleSelectTab(tab.id)}
            className={`relative px-3.5 sm:px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2 transition-colors active:scale-95 cursor-pointer ${
              isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200'
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
