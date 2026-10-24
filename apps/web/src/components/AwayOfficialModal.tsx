import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, X, Check, Grid, Sparkles, Trash2, MapPin } from 'lucide-react';
import { PeriodId } from '@lfps/core';
import { useTimetableStore } from '../store/useTimetableStore.js';

export const AwayOfficialModal: React.FC = () => {
  const {
    isAwayModalOpen,
    awayModalTeacher,
    closeAwayModal,
    absences,
    selectedDay,
    schedule,
    setTeacherAwayOfficial,
    startAwaySelection,
  } = useTimetableStore();

  const teacher = awayModalTeacher;
  const currentAbsence = absences.find(
    (a) => a.teacherName === teacher && a.day === selectedDay && a.type === 'AWAY_OFFICIAL'
  );

  const [selectedPeriods, setSelectedPeriods] = React.useState<PeriodId[]>([]);
  const [venue, setVenue] = React.useState('');

  React.useEffect(() => {
    if (currentAbsence) {
      setSelectedPeriods(currentAbsence.periods || ['G/PD', '1st', '2nd', '3rd', '4th', '5th', '6th']);
      setVenue(currentAbsence.venue || '');
    } else {
      setSelectedPeriods(['G/PD', '1st', '2nd', '3rd', '4th', '5th', '6th']);
      setVenue('');
    }
  }, [currentAbsence, isAwayModalOpen]);

  if (!isAwayModalOpen || !teacher) return null;

  const validPeriods: PeriodId[] = ['G/PD', '1st', '2nd', '3rd', '4th', '5th', '6th'];
  const daySchedule = schedule[selectedDay] || {};

  const togglePeriod = (p: PeriodId) => {
    setSelectedPeriods((prev) =>
      prev.includes(p) ? prev.filter((item) => item !== p) : [...prev, p]
    );
  };

  const handleSelectAll = () => setSelectedPeriods([...validPeriods]);
  const handleSelectMorning = () => setSelectedPeriods(['G/PD', '1st', '2nd']);
  const handleSelectAfternoon = () => setSelectedPeriods(['3rd', '4th', '5th', '6th']);
  const handleClear = () => setSelectedPeriods([]);

  const handleSave = () => {
    setTeacherAwayOfficial(teacher, selectedPeriods, venue.trim() || 'Official Duty');
    closeAwayModal();
  };

  const handleStartGridMarquee = () => {
    closeAwayModal();
    startAwaySelection(teacher, selectedPeriods, venue.trim() || 'Official Duty');
  };

  const handleRemove = () => {
    setTeacherAwayOfficial(teacher, [], '');
    closeAwayModal();
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md"
        onClick={closeAwayModal}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.18, ease: [0.2, 0.9, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-4 sm:p-6 space-y-4 select-none"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
                  Away on Official Duty
                </h3>
                <p className="text-xs text-slate-400">
                  {teacher} · {selectedDay} Deputation
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={closeAwayModal}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Venue & Duty Details */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-indigo-400" />
              Venue / Purpose of Deputation
            </label>
            <input
              type="text"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              placeholder="e.g. Science Olympiad Escort, CBSE Coordination Meeting"
              className="w-full px-3 py-2 rounded-xl bg-slate-950/70 border border-slate-700/80 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Period Selection Controls */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">
                Select Away Periods ({selectedPeriods.length}/{validPeriods.length})
              </span>
              <div className="flex items-center gap-1 text-[10px]">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  All Day
                </button>
                <button
                  type="button"
                  onClick={handleSelectMorning}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  Morning
                </button>
                <button
                  type="button"
                  onClick={handleSelectAfternoon}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  Afternoon
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Period Pills Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {validPeriods.map((p) => {
                const isSelected = selectedPeriods.includes(p);
                const task = daySchedule[p]?.[teacher] || 'Free';
                const isFree = !task || task === 'Free' || task === '-';

                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => togglePeriod(p)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600/25 border-indigo-500 text-indigo-100 shadow-sm shadow-indigo-500/20 ring-1 ring-indigo-500/50'
                        : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs">{p}</span>
                      <div
                        className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${
                          isSelected ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-500'
                        }`}
                      >
                        {isSelected && '✓'}
                      </div>
                    </div>
                    <div className="text-[10px] mt-1 font-medium truncate">
                      {isFree ? (
                        <span className="text-slate-500 italic">Free</span>
                      ) : (
                        <span className={isSelected ? 'text-indigo-200' : 'text-slate-300'}>
                          {task}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Interactive Marquee Option on Routine Grid */}
          <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/30 flex items-center justify-between gap-3">
            <div className="text-xs text-indigo-200">
              <div className="font-semibold flex items-center gap-1.5">
                <Grid className="w-3.5 h-3.5 text-indigo-400" />
                Select on Routine Grid
              </div>
              <p className="text-[10px] text-indigo-300/80">
                Tap and drag with live marquee directly on the routine timetable.
              </p>
            </div>
            <button
              type="button"
              onClick={handleStartGridMarquee}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition-all flex items-center gap-1 flex-shrink-0 cursor-pointer"
            >
              <Sparkles className="w-3 h-3" />
              <span>Open Grid Marquee</span>
            </button>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800">
            {currentAbsence ? (
              <button
                type="button"
                onClick={handleRemove}
                className="px-3 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-950/70 border border-rose-800/50 text-rose-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove Deputation</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={closeAwayModal}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save ({selectedPeriods.length} Periods)</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
