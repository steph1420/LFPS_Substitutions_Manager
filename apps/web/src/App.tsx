import React from 'react';
import { Header } from './components/Header.js';
import { AbsenceRoster } from './components/AbsenceRoster.js';
import { SubstitutionsRegister } from './components/SubstitutionsRegister.js';
import { RoutinePreview } from './components/RoutinePreview.js';

export const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Apple HIG Sticky Header */}
      <Header />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Attendance & Availability Roster */}
        <AbsenceRoster />

        {/* Substitutions Coverage & Auto-Resolve Engine */}
        <SubstitutionsRegister />

        {/* Master Routine Grid */}
        <RoutinePreview />
      </main>

      {/* Footer Status Bar */}
      <footer className="w-full glass-panel border-t border-slate-800/80 px-6 py-3 text-center text-xs text-slate-500">
        LFPS Substitutions Manager Next-Gen v2.0 • React 19 + TypeScript + Framer Motion + Go Backend
      </footer>
    </div>
  );
};
export default App;

