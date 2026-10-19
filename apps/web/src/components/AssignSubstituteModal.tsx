import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SPRING_TRANSITIONS } from '@lfps/ui';
import { findAvailableSubstitutes, CandidateSubstitute } from '@lfps/core';
import { useTimetableStore } from '../store/useTimetableStore.js';
import { UserCheck, Search, X, Sparkles, AlertCircle } from 'lucide-react';

export const AssignSubstituteModal: React.FC = () => {
  const {
    activeAssignSubSlot,
    closeAssignSubModal,
    schedule,
    absences,
    availabilities,
    substitutions,
    directory,
    assignSubstitution,
  } = useTimetableStore();

  const [searchQuery, setSearchQuery] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);

  // Outside click and Escape key dismissal (LOGIC-02)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeAssignSubModal();
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        closeAssignSubModal();
      }
    };

    if (activeAssignSubSlot) {
      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeAssignSubSlot, closeAssignSubModal]);

  if (!activeAssignSubSlot) return null;

  const currentDailySchedule = schedule[activeAssignSubSlot.day] || {};
  const activeAbsences = absences.filter((a) => a.day === activeAssignSubSlot.day);
  const activeDaySubstitutions = substitutions.filter((s) => s.day === activeAssignSubSlot.day);

  // Rank candidate substitutes using the core intelligent solver
  const candidates: CandidateSubstitute[] = findAvailableSubstitutes({
    day: activeAssignSubSlot.day,
    period: activeAssignSubSlot.period,
    targetTask: activeAssignSubSlot.task,
    originalTeacher: activeAssignSubSlot.originalTeacher,
    schedule: currentDailySchedule,
    absences: activeAbsences,
    availabilities,
    existingAssignments: activeDaySubstitutions,
    directory,
  });

  const availableCandidates = candidates.filter((c) => c.isAvailable);
  const unavailableCandidates = candidates.filter((c) => !c.isAvailable);

  const filterList = (list: CandidateSubstitute[]) => {
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (c) =>
        c.teacher.abbr.toLowerCase().includes(q) ||
        c.teacher.fullName.toLowerCase().includes(q) ||
        c.teacher.role.toLowerCase().includes(q) ||
        c.teacher.primaryClass?.toLowerCase().includes(q) ||
        c.teacher.department?.toLowerCase().includes(q)
    );
  };

  const displayedAvailable = filterList(availableCandidates);
  const displayedUnavailable = filterList(unavailableCandidates);

  const triggerHaptic = (ms = 35) => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(ms);
      } catch {
        // ignore
      }
    }
  };

  const handleSelectSubstitute = (subTeacherName: string) => {
    triggerHaptic(40);
    assignSubstitution({
      day: activeAssignSubSlot.day,
      period: activeAssignSubSlot.period,
      originalTeacher: activeAssignSubSlot.originalTeacher,
      substituteTeacher: subTeacherName,
      className: activeAssignSubSlot.className,
      subject: activeAssignSubSlot.subject || activeAssignSubSlot.task,
      status: 'COVERED',
      assignedBy: 'Manual Selection',
    });
    closeAssignSubModal();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 pointer-events-auto">
        <motion.div
          ref={modalRef}
          initial={{ opacity: 0, scale: 0.94, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 12 }}
          transition={SPRING_TRANSITIONS.bouncy}
          className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[85vh] select-none"
        >
          {/* Header */}
          <div className="p-4 border-b border-slate-800 flex items-start justify-between bg-slate-950/40">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50" />
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  Assign Substitute Teacher
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Period <span className="text-blue-400 font-bold">{activeAssignSubSlot.period}</span> ({activeAssignSubSlot.day}) &bull; Class <span className="text-amber-400 font-semibold">{activeAssignSubSlot.className}</span> &bull; Absent: <span className="text-rose-400 font-semibold">{activeAssignSubSlot.originalTeacher}</span>
              </p>
            </div>
            <button
              onClick={closeAssignSubModal}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search Box */}
          <div className="p-3 border-b border-slate-800/80 bg-slate-900/60">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search candidates by name, class, subject..."
                className="w-full bg-slate-950/80 border border-slate-700/60 rounded-xl pl-9 pr-8 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Candidate List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between px-1">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Recommended Free Candidates ({displayedAvailable.length})
              </span>
              <span className="text-[10px] text-slate-500 font-normal">Ranked by Fit Score</span>
            </div>

            {displayedAvailable.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-500 bg-slate-950/30 rounded-xl border border-slate-800/60 p-4">
                No free candidates match current criteria.
              </div>
            ) : (
              displayedAvailable.map((candidate) => (
                <div
                  key={candidate.teacher.abbr}
                  onClick={() => handleSelectSubstitute(candidate.teacher.abbr)}
                  className="p-2.5 rounded-xl bg-slate-800/50 hover:bg-blue-600/15 border border-slate-700/50 hover:border-blue-500/50 transition-all flex items-center justify-between gap-3 cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center font-bold text-blue-300 text-xs flex-shrink-0 group-hover:scale-105 transition-transform">
                      {candidate.teacher.abbr.slice(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-slate-200 group-hover:text-blue-300 truncate">
                          {candidate.teacher.abbr}
                        </span>
                        {candidate.teacher.primaryClass && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-950 text-slate-400 border border-slate-800">
                            {candidate.teacher.primaryClass}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {candidate.teacher.role} &bull; {candidate.teacher.department}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="text-right">
                      <span className="text-xs font-bold text-emerald-400">
                        {candidate.score} pts
                      </span>
                      {candidate.scoreBreakdown.subjectMatch > 0 && (
                        <div className="text-[9px] text-amber-400">Subject Match</div>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectSubstitute(candidate.teacher.abbr);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-1 shadow-md shadow-blue-600/30 transition-colors"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Assign</span>
                    </button>
                  </div>
                </div>
              ))
            )}

            {/* Unavailable / Busy Staff Section - Always segregated & visible */}
            {displayedUnavailable.length > 0 && (
              <div className="pt-3 space-y-2 border-t border-slate-800/80 mt-2">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between px-1">
                  <span className="flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-500/80" />
                    Unavailable / Busy Staff ({displayedUnavailable.length})
                  </span>
                  <span className="text-[10px] text-slate-500 font-normal">Manual Override</span>
                </div>

                <div className="space-y-1.5">
                  {displayedUnavailable.map((candidate) => (
                    <div
                      key={candidate.teacher.abbr}
                      className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/70 hover:border-slate-700/80 transition-all flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-slate-800/60 border border-slate-700/40 flex items-center justify-center font-bold text-slate-400 text-xs flex-shrink-0">
                          {candidate.teacher.abbr.slice(0, 2)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-slate-300 truncate">
                              {candidate.teacher.abbr}
                            </span>
                            {candidate.teacher.primaryClass && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-900 text-slate-500 border border-slate-800">
                                {candidate.teacher.primaryClass}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-rose-400/90 truncate flex items-center gap-1 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500/60 inline-block flex-shrink-0" />
                            {candidate.unavailabilityReason || 'Busy in another class'}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleSelectSubstitute(candidate.teacher.abbr)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800/90 hover:bg-amber-600 hover:text-white text-amber-300/90 text-xs font-semibold transition-colors border border-amber-500/30 flex items-center gap-1 flex-shrink-0 cursor-pointer shadow-sm active:scale-95"
                        title="Override schedule conflict and assign anyway"
                      >
                        <span>Override</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end">
            <button
              onClick={closeAssignSubModal}
              className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
