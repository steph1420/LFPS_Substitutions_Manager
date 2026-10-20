import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SPRING_TRANSITIONS } from '@lfps/ui';
import { AutoResolvePolicyConfig, DEFAULT_AUTORESOLVE_POLICY, getSubjectFullName } from '@lfps/core';
import { useTimetableStore } from '../store/useTimetableStore.js';
import {
  Brain,
  X,
  RotateCcw,
  Check,
  ShieldCheck,
  Sliders,
  Sparkles,
  BookOpen,
  Plus,
  Trash2,
  HelpCircle,
} from 'lucide-react';

interface AutoResolveBrainModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const COMMON_SUBJECTS = [
  'ENG. REC.',
  'ENG. ORAL',
  'ENG. WR.',
  'M. SC.',
  'M. Bas.',
  'HIN. KAV./GEET',
  'GAMES',
  'GK',
  'DRILL',
  'SING.',
  'DRAW.',
];

export const AutoResolveBrainModal: React.FC<AutoResolveBrainModalProps> = ({ isOpen, onClose }) => {
  const { directory, autoResolvePolicy, updateAutoResolvePolicy, resetAutoResolvePolicy } =
    useTimetableStore();

  // Standard UI Pillars: ESC key to dismiss
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const [policy, setPolicy] = React.useState<AutoResolvePolicyConfig>(autoResolvePolicy);
  const [newSubject, setNewSubject] = React.useState('');
  const [newTeacher, setNewTeacher] = React.useState('');
  const [showHelp, setShowHelp] = React.useState(false);

  // Sync state whenever modal opens
  React.useEffect(() => {
    if (isOpen) {
      setPolicy(autoResolvePolicy);
    }
  }, [isOpen, autoResolvePolicy]);

  if (!isOpen) return null;

  const teachers = Object.values(directory).sort((a, b) => a.abbr.localeCompare(b.abbr));

  const handleSave = () => {
    updateAutoResolvePolicy(policy);
    onClose();
  };

  const handleReset = () => {
    resetAutoResolvePolicy();
    setPolicy(DEFAULT_AUTORESOLVE_POLICY);
  };

  const handleAddOverride = () => {
    if (!newSubject || !newTeacher) return;
    setPolicy((prev) => ({
      ...prev,
      preferredSubjectOverrides: {
        ...(prev.preferredSubjectOverrides || {}),
        [newSubject]: newTeacher,
      },
    }));
    setNewSubject('');
    setNewTeacher('');
  };

  const handleRemoveOverride = (subject: string) => {
    setPolicy((prev) => {
      const updated = { ...(prev.preferredSubjectOverrides || {}) };
      delete updated[subject];
      return {
        ...prev,
        preferredSubjectOverrides: updated,
      };
    });
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-5"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 14 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 14 }}
          transition={SPRING_TRANSITIONS.bouncy}
          onClick={(e) => e.stopPropagation()}
          className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 max-w-2xl w-full max-h-[90vh] shadow-2xl flex flex-col justify-between overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-slate-800/80 pb-4 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20 text-white flex-shrink-0">
                <Brain className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white tracking-tight">
                    Auto-Resolve Brain Studio
                  </h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                    POLICY ENGINE
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Configure candidate scoring heuristics, whole-day Class Teacher allocation, and Principal overrides.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setShowHelp((prev) => !prev)}
                className={`p-1.5 rounded-xl border transition-colors ${
                  showHelp
                    ? 'bg-purple-600 text-white border-purple-500'
                    : 'glass-pill text-slate-400 hover:text-white border-slate-700'
                }`}
                title="View Algorithm Heuristics"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-xl glass-pill text-slate-400 hover:text-white border-slate-700 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Scrollable Content Body */}
          <div className="overflow-y-auto space-y-5 py-4 pr-1 flex-1 text-xs">
            {/* Explanatory Help Card */}
            {showHelp && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-purple-950/30 border border-purple-500/30 rounded-2xl p-4 text-slate-300 space-y-2"
              >
                <div className="font-bold text-purple-200 flex items-center gap-1.5 text-xs">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  <span>How the Solver Decides Allocations</span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-300">
                  When auto-resolve runs, the solver evaluates every free teacher against an uncovered period slot using a deterministic multi-factor scoring formula:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
                  <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                    <span className="font-bold text-amber-300">1. Whole-Day Off. CT (+250):</span>
                    <p className="text-slate-400 mt-0.5">Appointed Off. CT gets decisive priority across all their class periods.</p>
                  </div>
                  <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                    <span className="font-bold text-emerald-300">2. Principal Override (+80):</span>
                    <p className="text-slate-400 mt-0.5">Direct Principal rule defining a specialist teacher for a specific subject.</p>
                  </div>
                  <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                    <span className="font-bold text-blue-300">3. Same Subject Co-Workers:</span>
                    <p className="text-slate-400 mt-0.5">Weighted match for teachers teaching the exact same curriculum.</p>
                  </div>
                  <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                    <span className="font-bold text-indigo-300">4. 2nd Teacher / Class Co-Worker:</span>
                    <p className="text-slate-400 mt-0.5">Priority for teachers belonging to the same classroom.</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* RULE 1: Whole-Day Officiating Class Teacher Precedence (BUG-18) */}
            <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span className="font-bold text-white text-xs">
                    Whole-Day Officiating Class Teacher Precedence
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={policy.prioritizeOfficiatingCT}
                    onChange={(e) =>
                      setPolicy((prev) => ({
                        ...prev,
                        prioritizeOfficiatingCT: e.target.checked,
                      }))
                    }
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                When an Officiating CT is appointed for an absent Class Teacher's section, the solver awards <strong className="text-amber-300">+250 priority points</strong> to assign that teacher across all periods of that section for the whole day (avoiding period-by-period scattering).
              </p>
            </div>

            {/* RULE 2: Scoring Heuristics Sliders */}
            <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                <div className="flex items-center gap-2 font-bold text-white text-xs">
                  <Sliders className="w-4 h-4 text-blue-400" />
                  <span>Heuristic Priority Weights</span>
                </div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                  Point Allocation
                </span>
              </div>

              {/* Same Subject (Co-Workers) */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-300">
                    Same Subject Co-Workers
                  </span>
                  <span className="font-mono font-bold text-blue-400">
                    +{policy.sameSubjectWeight} pts
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="60"
                  step="5"
                  value={policy.sameSubjectWeight}
                  onChange={(e) =>
                    setPolicy((prev) => ({
                      ...prev,
                      sameSubjectWeight: Number(e.target.value),
                    }))
                  }
                  className="w-full accent-blue-500 cursor-pointer"
                />
              </div>

              {/* Class Teacher Priority */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-300">
                    Class Teacher Priority
                  </span>
                  <span className="font-mono font-bold text-amber-400">
                    +{policy.classTeacherWeight} pts
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  step="5"
                  value={policy.classTeacherWeight}
                  onChange={(e) =>
                    setPolicy((prev) => ({
                      ...prev,
                      classTeacherWeight: Number(e.target.value),
                    }))
                  }
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              {/* Second Teacher Priority */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-300">
                    Second Teacher / Co-Worker in Class
                  </span>
                  <span className="font-mono font-bold text-indigo-400">
                    +{policy.secondTeacherWeight} pts
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  step="5"
                  value={policy.secondTeacherWeight}
                  onChange={(e) =>
                    setPolicy((prev) => ({
                      ...prev,
                      secondTeacherWeight: Number(e.target.value),
                    }))
                  }
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>

              {/* Workload Fair-Share Balance */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-300">
                    Workload Fair-Share Balance (Penalty per sub today)
                  </span>
                  <span className="font-mono font-bold text-rose-400">
                    -{policy.workloadBalancingWeight} pts
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  step="5"
                  value={policy.workloadBalancingWeight}
                  onChange={(e) =>
                    setPolicy((prev) => ({
                      ...prev,
                      workloadBalancingWeight: Number(e.target.value),
                    }))
                  }
                  className="w-full accent-rose-500 cursor-pointer"
                />
              </div>
            </div>

            {/* RULE 3: Principal Preferred / Defined Subject Overrides */}
            <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                <div className="flex items-center gap-2 font-bold text-white text-xs">
                  <BookOpen className="w-4 h-4 text-purple-400" />
                  <span>Principal Preferred Subject Overrides</span>
                </div>
                <span className="text-[10px] text-purple-300 font-semibold">
                  +80 pts priority
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Define school leadership rules (e.g. <em>&ldquo;When Mathematics is uncovered, prioritize Teacher X&rdquo;</em>).
              </p>

              {/* Existing Overrides List */}
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {Object.entries(policy.preferredSubjectOverrides || {}).map(([subj, teacherAbbr]) => (
                  <div
                    key={subj}
                    className="flex items-center justify-between bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono font-bold text-[11px]">
                        {subj}
                      </span>
                      <span className="text-slate-400">→</span>
                      <span className="font-bold text-white">{teacherAbbr}</span>
                    </div>
                    <button
                      onClick={() => handleRemoveOverride(subj)}
                      className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                      title="Remove override"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {Object.keys(policy.preferredSubjectOverrides || {}).length === 0 && (
                  <div className="text-[11px] text-slate-500 italic py-1">
                    No custom subject overrides configured.
                  </div>
                )}
              </div>

              {/* Add New Override Inputs */}
              <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                <select
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  className="w-full sm:flex-1 bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="">Select Subject...</option>
                  {COMMON_SUBJECTS.map((s) => (
                    <option key={s} value={s}>
                      {s} — {getSubjectFullName(s)}
                    </option>
                  ))}
                </select>

                <select
                  value={newTeacher}
                  onChange={(e) => setNewTeacher(e.target.value)}
                  className="w-full sm:flex-1 bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="">Select Specialist Staff...</option>
                  {teachers.map((t) => (
                    <option key={t.abbr} value={t.abbr}>
                      {t.abbr} ({t.role})
                    </option>
                  ))}
                </select>

                <button
                  onClick={handleAddOverride}
                  disabled={!newSubject || !newTeacher}
                  className="w-full sm:w-auto px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:pointer-events-none text-white font-semibold text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Rule</span>
                </button>
              </div>
            </div>
          </div>

          {/* Footer Action Bar */}
          <div className="flex items-center justify-between border-t border-slate-800/80 pt-4 flex-shrink-0">
            <button
              onClick={handleReset}
              className="px-3 py-2 rounded-xl glass-pill text-slate-400 hover:text-white border-slate-700 flex items-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Defaults</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-500/25 flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Save & Apply Rules</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
