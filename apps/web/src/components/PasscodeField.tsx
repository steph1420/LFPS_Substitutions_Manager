import React from 'react';
import { motion, useAnimationControls, useReducedMotion } from 'framer-motion';
import { SPRING_TRANSITIONS } from '@lfps/ui';

interface PasscodeFieldProps {
  length: number;
  /** Called once when `length` digits have been entered. Resolve `false` to shake and clear. */
  onComplete: (code: string) => Promise<boolean>;
  disabled?: boolean;
  label: string;
  /** Focus the field on mount (it is the only action on the screen). */
  autoFocus?: boolean;
}

/**
 * iOS-style numeric passcode entry: one real input (numeric keypad on phones via
 * inputMode + pattern) drawn as a row of dots. Digits are never rendered, entry submits
 * automatically on the last digit, and a wrong code shakes the row (transform only).
 *
 * The input sits over the dots at opacity 0, so taps, paste, keyboard, autofill and screen
 * readers all work on a standard control.
 */
export const PasscodeField: React.FC<PasscodeFieldProps> = ({ length, onComplete, disabled = false, label, autoFocus = false }) => {
  const [value, setValue] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const controls = useAnimationControls();
  const reduceMotion = useReducedMotion();

  const submit = async (code: string) => {
    setBusy(true);
    const ok = await onComplete(code);
    setBusy(false);
    setValue('');
    if (!ok) {
      if (!reduceMotion) {
        await controls.start({ x: [0, -10, 9, -7, 5, -2, 0], transition: { duration: 0.42, ease: 'easeOut' } });
      }
      inputRef.current?.focus();
    }
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (busy) return;
    const digits = e.target.value.replace(/\D/g, '').slice(0, length);
    setValue(digits);
    if (digits.length === length) void submit(digits);
  };

  const inactive = disabled || busy;

  return (
    <motion.div animate={controls} className="relative w-fit">
      <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700" aria-hidden="true">
        {Array.from({ length }, (_, i) => {
          const filled = i < value.length;
          return (
            <span key={i} className="relative w-3 h-3 rounded-full border border-slate-500">
              <motion.span
                className="absolute inset-[-1px] rounded-full bg-slate-100"
                initial={false}
                animate={{ scale: filled ? 1 : 0, opacity: filled ? 1 : 0 }}
                transition={SPRING_TRANSITIONS.snappy}
              />
            </span>
          );
        })}
      </div>
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={length}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="go"
        value={value}
        onChange={onChange}
        autoFocus={autoFocus}
        disabled={inactive}
        aria-label={`${label}, ${length} digits, ${value.length} entered`}
        className="absolute inset-0 w-full h-full opacity-0 cursor-text disabled:cursor-not-allowed"
      />
    </motion.div>
  );
};
