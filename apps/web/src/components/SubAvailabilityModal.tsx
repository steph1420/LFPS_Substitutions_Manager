import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SPRING_TRANSITIONS } from '@lfps/ui';
import { DutyPreset } from '@lfps/core';
import { useTimetableStore } from '../store/useTimetableStore.js';
import { X, Bus, Users, FileText, Building2, Check, Sparkles } from 'lucide-react';

export const SubAvailabilityModal: React.FC = () => {
  const {
    activeAvailabilityTeacher,
    closeAvailabilityModal,
    availabilities,
    setStaffAvailability,
    openAwayModal,
    directory,
  } = useTimetableStore();

  const [customRemark, setCustomRemark] = useState('');

  // Standard UI Pillars: ESC key to dismiss
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeAvailabilityTeacher) {
        closeAvailabilityModal();
      }
    };
    if (activeAvailabilityTeacher) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeAvailabilityTeacher, closeAvailabilityModal]);

  if (!activeAvailabilityTeacher) return null;

  const teacher = activeAvailabilityTeacher;
  const staff = directory[teacher];
  const record = availabilities[teacher];
  const isFreeFromSub = record && (!record.isAvailable || record.status === 'FREE_FROM_SUB');

  const presets: Array<{ id: DutyPreset; label: string; icon: React.ReactNode }> = [
    { id: 'BUS_DUTY', label: 'Bus Duty', icon: <Bus className="w-3.5 h-3.5" /> },
    { id: 'PTM', label: 'PTM', icon: <Users className="w-3.5 h-3.5" /> },
    { id: 'EXAM_DUTY', label: 'Exam Duty', icon: <FileText className="w-3.5 h-3.5" /> },
    { id: 'AWAY_OFFICIAL', label: 'Away (Official)', icon: <Building2 className="w-3.5 h-3.5 text-indigo-400" /> },
  ];

  const handlePresetClick = (preset: DutyPreset, label: string) => {
    if (preset === 'AWAY_OFFICIAL') {
      closeAvailabilityModal();
      openAwayModal(teacher);
      return;
    }
    setStaffAvailability(teacher, 'FREE_FROM_SUB', {
      dutyPreset: preset,
      remark: label,
    });
    closeAvailabilityModal();
  };

  const handleApplyCustomRemark = () => {
    if (!customRemark.trim()) return;
    setStaffAvailability(teacher, 'FREE_FROM_SUB', {
      remark: customRemark.trim(),
    });
    setCustomRemark('');
    closeAvailabilityModal();
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4"
        onClick={closeAvailabilityModal}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={SPRING_TRANSITIONS.bouncy}
          onClick={(e) => e.stopPropagation()}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4"
        >
          {/* Header & Dismiss */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Substitution Availability & Duties
              </h3>
              <p className="text-[11px] text-slate-400">
                Configure special on-duty commitments or excuse staff from substitutions.
              </p>
            </div>
            <button
              onClick={closeAvailabilityModal}
              className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Teacher Hero Card with Inline Toggle (FEAT-34 & FEAT-35) */}
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center font-bold text-xs text-blue-400">
                {staff?.initials || 'ST'}
              </div>
              <div>
                <div className="text-xs font-bold text-slate-100">{teacher}</div>
                <div className="text-[10px] text-slate-400">{staff?.role || 'Teaching Staff'}</div>
              </div>
            </div>

            {/* Inline Hero Toggle Button */}
            <button
              onClick={() => {
                if (isFreeFromSub) {
                  setStaffAvailability(teacher, 'AVAILABLE');
                } else {
                  setStaffAvailability(teacher, 'FREE_FROM_SUB', { remark: 'Excused from sub' });
                }
              }}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center transition-all active:scale-95 shadow-md ${
                isFreeFromSub
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 hover:bg-amber-500/30'
                  : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30'
              }`}
            >
              <span>{isFreeFromSub ? '⏸ Free from Sub' : '🟢 Available for Sub'}</span>
              <span className="text-[9px] font-normal text-slate-400">
                {isFreeFromSub ? '• Tap to restore' : '• Tap to free'}
              </span>
            </button>
          </div>

          {/* 4 Clean Single-Row Duty Presets (FEAT-35) */}
          <div className="space-y-2">
            <div className="text-[11px] font-semibold text-slate-400">1-Tap Duty Presets:</div>
            <div className="grid grid-cols-2 gap-2">
              {presets.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handlePresetClick(preset.id, preset.label)}
                  className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-blue-600/20 border border-slate-700/60 hover:border-blue-500/40 text-xs font-medium text-slate-200 transition-all flex items-center gap-2 active:scale-95"
                >
                  {preset.icon}
                  <span>{preset.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Compact Custom Remark Input */}
          <div className="space-y-1.5 pt-1">
            <div className="text-[11px] font-semibold text-slate-400">Custom Remark / Special Duty:</div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={customRemark}
                onChange={(e) => setCustomRemark(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleApplyCustomRemark()}
                placeholder="e.g. Science Lab Setup, Principal Meeting..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
              />
              <button
                onClick={handleApplyCustomRemark}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1 transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                Apply
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

