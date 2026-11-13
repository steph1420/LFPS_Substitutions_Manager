// Drag a teacher (or a sub) onto a duty cell. One pointer-based path for mouse, pen and touch.
// Touch: press and hold DRAG_HOLD_MS without moving, then drag (a quick swipe still scrolls).
// Mouse: drag starts after a small move. Drop targets carry data-drop="slot|absentId".
// Motion: lift with --dl-dur-quick; a refused drop glides back with --dl-dur-calm / --dl-ease-settle.
import { useCallback, useEffect, useRef, useState } from 'react'
import { haptic } from './dl-haptics'

export const DRAG_HOLD_MS = 80 // hold-to-lift wait (Teacher-S lock via Lippy brief: 80 ms)
const MOVE_TOLERANCE = 8 // px a finger may wander during the hold
const MOUSE_START = 4 // px before a mouse press becomes a drag

export interface Payload { staff: string; fromKey?: string; label: string }
export interface DragState { p: Payload; x: number; y: number; over: string | null; back: { x: number; y: number } | null }
export type Verdict = { ok: true; hint: string } | { ok: false; hint: string }

export function useDragAssign(opts: {
  judge: (p: Payload, target: string | null) => Verdict | null // null = no hint (not over a target)
  onDrop: (p: Payload, target: string | null) => boolean // true = accepted (no glide back)
}) {
  const [drag, setDrag] = useState<DragState | null>(null)
  const ref = useRef<DragState | null>(null)
  const optsRef = useRef(opts); optsRef.current = opts
  const set = (d: DragState | null) => { ref.current = d; setDrag(d) }

  // While dragging, stop the page from scrolling under the finger (non-passive so preventDefault works).
  useEffect(() => {
    const stop = (e: TouchEvent) => { if (ref.current) e.preventDefault() }
    document.addEventListener('touchmove', stop, { passive: false })
    return () => document.removeEventListener('touchmove', stop)
  }, [])

  const targetAt = (x: number, y: number): string | null => {
    const el = document.elementFromPoint(x, y)?.closest('[data-drop]') as HTMLElement | null
    return el?.dataset.drop ?? null
  }

  const bind = useCallback((p: Payload) => ({
    'data-drag': '1',
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
      if (e.button > 0) return
      const el = e.currentTarget, id = e.pointerId, sx = e.clientX, sy = e.clientY, touch = e.pointerType !== 'mouse'
      const origin = el.getBoundingClientRect()
      let started = false, moved = false, timer: ReturnType<typeof setTimeout> | null = null, lastX = sx, lastY = sy
      const begin = () => {
        started = true
        try { el.setPointerCapture(id) } catch { /* ignore */ }
        haptic('selection')
        set({ p, x: lastX, y: lastY, over: targetAt(lastX, lastY), back: { x: origin.left + origin.width / 2, y: origin.top + origin.height / 2 } })
      }
      const move = (ev: PointerEvent) => {
        if (ev.pointerId !== id) return
        lastX = ev.clientX; lastY = ev.clientY
        const dist = Math.hypot(lastX - sx, lastY - sy)
        if (!started) {
          if (touch && dist > MOVE_TOLERANCE) cleanup() // it's a scroll, not a drag
          else if (!touch && dist > MOUSE_START) begin()
          return
        }
        if (dist > MOVE_TOLERANCE) moved = true
        set({ ...ref.current!, x: lastX, y: lastY, over: targetAt(lastX, lastY) })
        const edge = 56; if (lastY > innerHeight - edge) scrollBy(0, 12); else if (lastY < edge) scrollBy(0, -12)
      }
      const up = (ev: PointerEvent) => {
        if (ev.pointerId !== id) return
        const d = ref.current
        cleanup()
        if (!started || !d) return
        if (!moved) { set(null); return } // a slow tap: let the click through
        // swallow the click that follows a drag
        const swallow = (c: MouseEvent) => { c.stopPropagation(); c.preventDefault() }
        window.addEventListener('click', swallow, { capture: true, once: true }); setTimeout(() => window.removeEventListener('click', swallow, { capture: true }), 0)
        const ok = optsRef.current.onDrop(d.p, targetAt(ev.clientX, ev.clientY))
        if (ok) { haptic('confirm'); set(null) } else { haptic('warning'); setDrag({ ...d, x: d.back!.x, y: d.back!.y, over: null }); ref.current = null; setTimeout(() => setDrag(null), 340) }
      }
      const cancel = (ev: PointerEvent) => { if (ev.pointerId === id) { cleanup(); if (started) set(null) } }
      function cleanup() {
        if (timer) clearTimeout(timer)
        window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', cancel)
      }
      window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', cancel)
      if (touch) timer = setTimeout(begin, DRAG_HOLD_MS)
    },
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  }), [])

  const verdict = drag && ref.current ? optsRef.current.judge(drag.p, drag.over) : null
  const ghost = drag ? (
    <div className={`s1-ghost${ref.current ? '' : ' s1-ghost--back'}${verdict ? (verdict.ok ? ' s1-ghost--ok' : ' s1-ghost--bad') : ''}`} style={{ transform: `translate(${drag.x}px, ${drag.y}px)` }} aria-hidden>
      <span className="s1-ghost__name">{drag.p.label}</span>
      {verdict && <span className="s1-ghost__hint">{verdict.hint}</span>}
    </div>
  ) : null
  return { bind, drag, ghost, over: drag && ref.current ? drag.over : null, verdict }
}
