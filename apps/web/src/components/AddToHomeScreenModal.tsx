import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SPRING_TRANSITIONS } from '@lfps/ui';
import { Share, PlusSquare, Smartphone, X, CheckCircle2 } from 'lucide-react';

interface AddToHomeScreenModalProps {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt?: any;
}

export const AddToHomeScreenModal: React.FC<AddToHomeScreenModalProps> = ({
  isOpen,
  onClose,
  deferredPrompt,
}) => {
  const isIOS =
    typeof navigator !== 'undefined' &&
    (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 pointer-events-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 12 }}
          transition={SPRING_TRANSITIONS.smooth}
          className="w-full max-w-md glass-panel bg-slate-950/95 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/80">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <Smartphone className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-white">Add to Home Screen</h2>
                <p className="text-[11px] text-slate-400">Install LFPS as a standalone mobile app</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="p-5 space-y-4 text-xs">
            {deferredPrompt ? (
              <div className="space-y-3">
                <p className="text-slate-300">
                  Install LFPS Manager directly to your device for 120fps hardware-accelerated performance and instant offline access.
                </p>
                <button
                  onClick={handleInstallClick}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30 transition-all active:scale-95"
                >
                  <PlusSquare className="w-4 h-4" />
                  Install App Now
                </button>
              </div>
            ) : isIOS ? (
              <div className="space-y-3.5">
                <p className="text-slate-300">
                  Follow these 3 quick steps in Apple Safari to install LFPS on your iPhone or iPad:
                </p>

                <div className="space-y-2.5">
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                    <div className="w-6 h-6 rounded-lg bg-blue-500/20 border border-blue-500/40 text-blue-400 font-bold flex items-center justify-center flex-shrink-0 text-xs">
                      1
                    </div>
                    <div className="text-slate-300">
                      Tap the <span className="font-semibold text-white">Share button</span>{' '}
                      <Share className="w-3.5 h-3.5 inline text-blue-400 ml-0.5 mr-0.5" /> in Safari's bottom toolbar.
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                    <div className="w-6 h-6 rounded-lg bg-blue-500/20 border border-blue-500/40 text-blue-400 font-bold flex items-center justify-center flex-shrink-0 text-xs">
                      2
                    </div>
                    <div className="text-slate-300">
                      Scroll down and tap <span className="font-semibold text-white">"Add to Home Screen"</span>{' '}
                      <PlusSquare className="w-3.5 h-3.5 inline text-blue-400 ml-0.5 mr-0.5" />.
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                    <div className="w-6 h-6 rounded-lg bg-blue-500/20 border border-blue-500/40 text-blue-400 font-bold flex items-center justify-center flex-shrink-0 text-xs">
                      3
                    </div>
                    <div className="text-slate-300">
                      Tap <span className="font-semibold text-white">"Add"</span> in the top-right corner to finish.
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-center gap-2 text-[11px]">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
                  <span>Launches in fullscreen mode with native app performance.</span>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-slate-300">
                  To add LFPS to your home screen or desktop:
                </p>
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300">
                  Open your browser menu (⋮ or ...) and select <span className="font-semibold text-white">"Install LFPS"</span> or <span className="font-semibold text-white">"Add to Home screen"</span>.
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

