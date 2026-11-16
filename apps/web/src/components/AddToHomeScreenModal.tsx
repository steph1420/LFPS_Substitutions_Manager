import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SPRING_TRANSITIONS } from '@lfps/ui';
import { Share, PlusSquare, Smartphone, X, CheckCircle2 } from 'lucide-react';

import styles from './AddToHomeScreenModal.module.css';

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

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className={styles.div1}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 12 }}
          transition={SPRING_TRANSITIONS.smooth}
          className={`${styles.motionDiv1} glass-panel`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className={styles.div2}>
            <div className={styles.div3}>
              <div className={styles.div4}>
                <Smartphone className={styles.smartphone1} />
              </div>
              <div>
                <h2 className={styles.h21}>Add to Home Screen</h2>
                <p className={styles.p1}>Install LFPS as a standalone mobile app</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className={styles.button1}
            >
              <X className={styles.x1} />
            </button>
          </div>

          {/* Content */}
          <div className={styles.div5}>
            {deferredPrompt ? (
              <div className={styles.div6}>
                <p className={styles.p2}>
                  Install LFPS Manager directly to your device for 120fps hardware-accelerated performance and instant offline access.
                </p>
                <button
                  onClick={handleInstallClick}
                  className={styles.button2}
                >
                  <PlusSquare className={styles.plusSquare1} />
                  Install App Now
                </button>
              </div>
            ) : isIOS ? (
              <div className={styles.div7}>
                <p className={styles.p3}>
                  Follow these 3 quick steps in Apple Safari to install LFPS on your iPhone or iPad:
                </p>

                <div className={styles.div8}>
                  <div className={styles.div9}>
                    <div className={styles.div10}>
                      1
                    </div>
                    <div className={styles.div11}>
                      Tap the <span className={styles.span1}>Share button</span>{' '}
                      <Share className={styles.share1} /> in Safari's bottom toolbar.
                    </div>
                  </div>

                  <div className={styles.div12}>
                    <div className={styles.div13}>
                      2
                    </div>
                    <div className={styles.div14}>
                      Scroll down and tap <span className={styles.span2}>"Add to Home Screen"</span>{' '}
                      <PlusSquare className={styles.plusSquare2} />.
                    </div>
                  </div>

                  <div className={styles.div15}>
                    <div className={styles.div16}>
                      3
                    </div>
                    <div className={styles.div17}>
                      Tap <span className={styles.span3}>"Add"</span> in the top-right corner to finish.
                    </div>
                  </div>
                </div>

                <div className={styles.div18}>
                  <CheckCircle2 className={styles.checkCircle21} />
                  <span>Launches in fullscreen mode with native app performance.</span>
                </div>
              </div>
            ) : (
              <div className={styles.div19}>
                <p className={styles.p4}>
                  To add LFPS to your home screen or desktop:
                </p>
                <div className={styles.div20}>
                  Open your browser menu (⋮ or ...) and select <span className={styles.span4}>"Install LFPS"</span> or <span className={styles.span5}>"Add to Home screen"</span>.
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

