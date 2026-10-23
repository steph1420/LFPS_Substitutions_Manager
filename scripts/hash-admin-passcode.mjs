#!/usr/bin/env node
// Prints the SHA-256 hex digest of the 6-digit admin passcode for VITE_ADMIN_PASSCODE_SHA256.
// The passcode itself is never stored or printed. See docs/ADMIN_ACCESS.md.
//
//   npm run admin:hash                          (prompts twice, input hidden)
//   printf %s "$CODE" | npm run admin:hash --silent   (piped; prints only the hash)
//   npm run admin:hash -- --allow-weak          (accept easily guessed codes)
//
// A 6-digit hash shipped in the client can be reversed offline in well under a second.
// This is accident protection only, until server-side auth (TODO SEC-02).
import { createHash } from 'node:crypto';
import { stdin, stdout, stderr } from 'node:process';

async function readHidden(prompt) {
  stderr.write(prompt);
  stdin.setRawMode?.(true);
  stdin.resume();
  stdin.setEncoding('utf8');
  let value = '';
  return new Promise((resolve) => {
    stdin.on('data', (chunk) => {
      for (const ch of chunk) {
        if (ch === '\r' || ch === '\n' || ch === '\u0004') {
          stdin.setRawMode?.(false);
          stdin.pause();
          stderr.write('\n');
          resolve(value);
          return;
        }
        if (ch === '\u0003') process.exit(130);
        if (ch === '\u007f') value = value.slice(0, -1);
        else value += ch;
      }
    });
  });
}

async function readPiped() {
  let data = '';
  for await (const chunk of stdin) data += chunk;
  return data.replace(/\r?\n$/, '');
}

const allowWeak = process.argv.includes('--allow-weak');

/** One digit repeated, a straight ascending/descending run, or a 2- or 3-digit pattern repeated. */
export function isEasilyGuessed(code) {
  if (/^(\d)\1{5}$/.test(code)) return true;
  const steps = [...code].slice(1).map((d, i) => (Number(d) - Number(code[i]) + 10) % 10);
  if (steps.every((s) => s === 1) || steps.every((s) => s === 9)) return true;
  return code.slice(0, 2).repeat(3) === code || code.slice(0, 3).repeat(2) === code;
}

const passcode = stdin.isTTY ? await readHidden('Admin passcode (6 digits): ') : await readPiped();
if (!/^\d{6}$/.test(passcode)) {
  stderr.write('The admin passcode must be exactly 6 digits (0-9).\n');
  process.exit(1);
}
if (isEasilyGuessed(passcode) && !allowWeak) {
  stderr.write('That passcode is easy to guess (repeated digits, a run or a repeating pattern). Choose another, or pass --allow-weak.\n');
  process.exit(1);
}
if (stdin.isTTY) {
  const again = await readHidden('Repeat passcode: ');
  if (again !== passcode) {
    stderr.write('Passcodes do not match.\n');
    process.exit(1);
  }
}
const hash = createHash('sha256').update(passcode, 'utf8').digest('hex');
stdout.write(`${hash}\n`);
if (stdin.isTTY) {
  stderr.write('\nAdd this line to apps/web/.env.local (untracked), then rebuild:\n');
  stderr.write(`VITE_ADMIN_PASSCODE_SHA256=${hash}\n`);
}
