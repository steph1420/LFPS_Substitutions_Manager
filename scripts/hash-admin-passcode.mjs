#!/usr/bin/env node
// Prints the SHA-256 hex digest of an admin passcode for VITE_ADMIN_PASSCODE_SHA256.
// The passcode itself is never stored or printed. See docs/ADMIN_ACCESS.md.
//
//   npm run admin:hash            (prompts, input hidden)
//   echo -n 'passcode' | npm run admin:hash --silent
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

const passcode = stdin.isTTY ? await readHidden('Admin passcode (min 8 characters): ') : await readPiped();
if (passcode.length < 8) {
  stderr.write('Passcode must be at least 8 characters (longer is better: it is checkable offline).\n');
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
stderr.write('\nAdd this line to apps/web/.env.local (untracked), then rebuild:\n');
stderr.write(`VITE_ADMIN_PASSCODE_SHA256=${hash}\n`);
