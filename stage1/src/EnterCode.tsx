import { useEffect, useRef, useState } from 'react'

/** "Enter code" (Q-HARM-9, LOCKED): the code box auto-focuses with the numeric keypad and sends by itself at the 6th digit.
 *  One real input (inputMode numeric, one-time-code) drawn as six Driftline boxes; typing and pasting both work. */
export function EnterCode({ prefill, knowsSheet, busy, error, notice, onCode }: {
  prefill: string | null; knowsSheet: boolean; busy: boolean; error: string | null; notice: string | null; onCode: (code: string) => void
}) {
  const [digits, setDigits] = useState(prefill ?? '')
  const sent = useRef<string | null>(prefill)
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => { if (error) { setDigits(''); input.current?.focus() } }, [error])
  useEffect(() => { if (!busy) input.current?.focus() }, [busy])
  useEffect(() => { // each full code is sent exactly once; clearing or editing the boxes re-arms it
    if (digits.length < 6) { sent.current = null; return }
    if (!busy && sent.current !== digits) { sent.current = digits; onCode(digits) }
  }, [digits, busy, onCode])
  return (
    <section className="dl-card s1-card s1-pair" aria-labelledby="s1-pair-h">
      <p className="dl-eyebrow">Stage 1 preview</p>
      <h2 className="dl-title2" id="s1-pair-h">Pair this device</h2>
      {notice && <p className="s1-notice" role="status">{notice}</p>}
      <p className="dl-muted">In the school Sheet, open <b>LFPS › Pair a device</b>. Scan the QR code, or type the 6-digit code here.</p>
      {!knowsSheet && <p className="dl-muted s1-small">First time on this device? Scan the QR once (or open the link under it). After that, typing a code is enough.</p>}
      <label className={`s1-code${error ? ' s1-code--bad' : ''}`}>
        <span className="s1-sr">Pairing code</span>
        <input
          ref={input} className="s1-code__input" value={digits} disabled={busy} autoFocus
          inputMode="numeric" pattern="[0-9]*" autoComplete="one-time-code" maxLength={6} aria-describedby="s1-pair-msg"
          onChange={(e) => setDigits(e.target.value.replace(/\D/g, '').slice(0, 6))}
        />
        {Array.from({ length: 6 }, (_, i) => <span key={i} aria-hidden className={`s1-box${i === Math.min(digits.length, 5) && !busy ? ' s1-box--now' : ''}`}>{digits[i] ?? ''}</span>)}
      </label>
      <p id="s1-pair-msg" className={`s1-msg${error ? ' s1-msg--bad' : ''}`} role="status" aria-live="polite">{busy ? 'Pairing…' : error ?? '\u00a0'}</p>
    </section>
  )
}
