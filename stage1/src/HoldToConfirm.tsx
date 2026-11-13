// HoldToConfirm: the destructive-action standard (KIT_GUIDE §9, LOCKED t208u; Q-HARM-4 "copy with version notes").
// Port of driftline-kit v0.3.0 packages/react/src/HoldToConfirm.tsx WITHOUT framer-motion (Stage 1 has no motion lib):
// same states, labels, haptics (selection → confirm), HOLD.durationMs, keyboard hold, label clipped to progress.
// Difference: the early-release return uses a CSS transition (--dl-dur-calm, --dl-ease-settle) instead of spring.gentle.
import { useEffect, useRef, useState } from 'react'
import { HOLD } from './dl-tokens'
import { haptic } from './dl-haptics'

type HoldState = 'idle' | 'holding' | 'done'
export function HoldToConfirm({ label, doneLabel = 'Done', onConfirm, holdMs = HOLD.durationMs, tone = 'danger', disabled }: {
  label: string; doneLabel?: string; onConfirm(): void; holdMs?: number; tone?: 'danger' | 'accent'; disabled?: boolean
}) {
  const [state, setState] = useState<HoldState>('idle')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reset = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); if (reset.current) clearTimeout(reset.current) }, [])
  const start = () => {
    if (disabled || state !== 'idle') return
    setState('holding'); haptic('selection')
    timer.current = setTimeout(() => {
      timer.current = null; setState('done'); haptic('confirm'); onConfirm()
      reset.current = setTimeout(() => setState('idle'), 1600)
    }, holdMs)
  }
  const cancel = () => { if (state !== 'holding' || !timer.current) return; clearTimeout(timer.current); timer.current = null; setState('idle') }
  const secs = (holdMs / 1000).toFixed(1).replace(/\.0$/, '')
  const text = state === 'done' ? `✓ ${doneLabel}` : state === 'holding' ? 'Keep holding…' : label
  return (
    <button
      type="button" className={`dl-hold dl-tone--${tone} s1-hold`} data-state={state} disabled={disabled}
      style={{ ['--s1-hold-ms' as string]: `${holdMs}ms` }}
      aria-label={state === 'done' ? doneLabel : `${label}. Press and hold for ${secs} seconds`} aria-live="polite"
      onPointerDown={(e) => { if (!(e.button > 0)) { e.currentTarget.setPointerCapture?.(e.pointerId); start() } }}
      onPointerUp={cancel} onPointerCancel={cancel} onPointerLeave={cancel}
      onKeyDown={(e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); start() } }}
      onKeyUp={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); cancel() } }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <span className="dl-hold__label">{text}</span>
      <span className="dl-hold__fill s1-hold__fill" aria-hidden><span className="dl-hold__label">{text}</span></span>
    </button>
  )
}
