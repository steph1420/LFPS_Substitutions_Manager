/**
 * LFPS Subs · Stage 1 preview bridge. Paste into the TEMP Sheet only: Extensions → Apps Script.
 * Two files: Code.gs (this one) and Qr.gs (a vendored QR maker, so no outside QR service sees a code).
 *
 * Timetable data is READ-ONLY: this script never writes to any tab. The only thing it saves is pairing
 * state in its own Script Properties: the current pairing code (hashed) and the paired devices (hashed tokens).
 *
 * Setup and updates: stage1/README.md. In short: run setUp() once → Deploy as Web app (Execute as: Me,
 * Who has access: Anyone) → reload the Sheet → LFPS › Pair a device.
 * The old connectLink() link is SUPERSEDED (2026-11-13): it is gone, and old links no longer open any data.
 */
var TABS = ['_Staff', '_Sections', '_TimingSlots', '_Timetable', '_Subjects', '_Periods'];
var PREVIEW = 'https://steph1420.github.io/lfps-subs-preview/';
var PAIR = {
  CODE_TTL_MS: 5 * 60 * 1000,              // Q-HARM-9 (LOCKED): a pairing code works for 5 minutes, once
  MAX_TRIES: 5,                            // Q-HARM-9 (LOCKED): 5 wrong tries use the code up
  IDLE_EXPIRY_MS: 90 * 24 * 3600 * 1000,   // Q-HARM-9 default: a device not used for 90 days has to pair again
  SEEN_EVERY_MS: 15 * 60 * 1000,           // "last seen" is saved at most every 15 minutes
  LABEL_MAX: 40
};

// =====================================================================================================
// Pairing logic. Plain functions with no Apps Script calls, so they are unit-tested
// (stage1/test/bridge.test.ts). env = { store: {get,set,del,keys}, now: ms, hash: str→hex, rand: ()→32 hex }
// =====================================================================================================

/** A new single-use 6-digit code. Replaces any earlier code. */
function makeCode_(env) {
  var code = ('00000' + (parseInt(env.rand().slice(0, 12), 16) % 1000000)).slice(-6);
  var exp = env.now + PAIR.CODE_TTL_MS, salt = env.rand();
  env.store.set('PAIR', JSON.stringify({ s: salt, h: env.hash(salt + ':' + code), exp: exp, tries: 0 }));
  return { code: code, exp: exp };
}

/** Closing the dialog ends its code (only that code, not a newer one). */
function cancelCode_(env, exp) {
  var raw = env.store.get('PAIR');
  if (raw && JSON.parse(raw).exp === exp) env.store.del('PAIR');
}

/** A device sends the code and its own random device ID → it gets a long random key (only its hash is kept). */
function redeemCode_(env, code, device, label) {
  code = String(code == null ? '' : code).trim();
  device = String(device == null ? '' : device);
  if (!/^[0-9a-f]{32}$/.test(device)) return { ok: false, error: 'bad device' };
  if (!/^\d{6}$/.test(code)) return { ok: false, error: 'bad code' };
  var raw = env.store.get('PAIR');
  if (!raw) return { ok: false, error: 'no code' };
  var p = JSON.parse(raw);
  if (env.now > p.exp) { env.store.del('PAIR'); return { ok: false, error: 'expired code' }; }
  if (env.hash(p.s + ':' + code) !== p.h) {
    p.tries += 1;
    if (p.tries >= PAIR.MAX_TRIES) {
      env.store.del('PAIR');
      env.store.set('LAST', JSON.stringify({ exp: p.exp, result: 'locked' }));
      return { ok: false, error: 'locked' };
    }
    env.store.set('PAIR', JSON.stringify(p));
    return { ok: false, error: 'bad code', left: PAIR.MAX_TRIES - p.tries };
  }
  env.store.del('PAIR'); // single use
  var name = cleanLabel_(label);
  var token = env.rand() + env.rand() + env.rand(); // 96 hex = 48 bytes (Q-HARM-9: at least 32 random bytes)
  env.store.set('DEV_' + device, JSON.stringify({ h: env.hash('token:' + token), label: name, caps: ['read'], pairedAt: env.now, lastSeen: env.now, revoked: 0 }));
  env.store.set('LAST', JSON.stringify({ exp: p.exp, result: 'paired', label: name }));
  return { ok: true, token: token, label: name };
}

/** Every data read checks device + key. Unknown → 'unpaired'; removed in the Sheet → 'revoked'; unused too long → 'expired'. */
function checkToken_(env, device, token) {
  device = String(device == null ? '' : device); token = String(token == null ? '' : token);
  if (!/^[0-9a-f]{32}$/.test(device) || !/^[0-9a-f]{96}$/.test(token)) return { ok: false, error: 'unpaired' };
  var key = 'DEV_' + device, raw = env.store.get(key);
  if (!raw) return { ok: false, error: 'unpaired' };
  var d = JSON.parse(raw);
  if (d.h !== env.hash('token:' + token)) return { ok: false, error: 'unpaired' };
  if (d.revoked) return { ok: false, error: 'revoked' };
  if (env.now - d.lastSeen > PAIR.IDLE_EXPIRY_MS) { env.store.del(key); return { ok: false, error: 'expired' }; }
  if (env.now - d.lastSeen > PAIR.SEEN_EVERY_MS) { d.lastSeen = env.now; env.store.set(key, JSON.stringify(d)); }
  return { ok: true, id: device };
}

/** For the dialog: what happened to the code it is showing (identified by its expiry time). */
function codeStatus_(env, exp) {
  var raw = env.store.get('PAIR');
  if (raw) {
    var p = JSON.parse(raw);
    if (p.exp === exp) return env.now > exp ? { state: 'expired' } : { state: 'waiting', left: PAIR.MAX_TRIES - p.tries };
  }
  var last = JSON.parse(env.store.get('LAST') || 'null');
  if (last && last.exp === exp) return { state: last.result, label: last.label || '' };
  return { state: env.now > exp ? 'expired' : 'replaced' };
}

/** Devices that can read now (removed ones are kept, marked revoked, so they get a clear "removed" message). */
function listDevices_(env) {
  return env.store.keys().filter(function (k) { return /^DEV_[0-9a-f]{32}$/.test(k); }).map(function (k) {
    var d = JSON.parse(env.store.get(k));
    return { id: k.slice(4), label: d.label, pairedAt: d.pairedAt, lastSeen: d.lastSeen, revoked: d.revoked };
  }).filter(function (d) { return !d.revoked; }).sort(function (a, b) { return a.pairedAt - b.pairedAt; });
}

function revokeDevice_(env, id) {
  id = String(id == null ? '' : id);
  var raw = /^[0-9a-f]{32}$/.test(id) ? env.store.get('DEV_' + id) : null;
  if (!raw) return false;
  var d = JSON.parse(raw);
  d.revoked = env.now; // the key never works again (the device is told 'revoked'); a new code makes a new key
  env.store.set('DEV_' + id, JSON.stringify(d));
  return true;
}

/** Undo for Remove (Q-45-04): the device works again with its existing key. */
function restoreDevice_(env, id) {
  id = String(id == null ? '' : id);
  var raw = /^[0-9a-f]{32}$/.test(id) ? env.store.get('DEV_' + id) : null;
  if (!raw) return false;
  var d = JSON.parse(raw);
  if (!d.revoked) return false;
  d.revoked = 0; d.lastSeen = env.now;
  env.store.set('DEV_' + id, JSON.stringify(d));
  return true;
}

/** Emergency "remove all devices" (replaces rotating the old shared key). Returns how many were removed. */
function revokeAll_(env) {
  var n = 0;
  listDevices_(env).forEach(function (d) { if (revokeDevice_(env, d.id)) n++; });
  cancelCode_(env, (JSON.parse(env.store.get('PAIR') || '{}')).exp);
  return n;
}

/** "Unpair this device" from the device itself: its record is removed. */
function unpairSelf_(env, device, token) {
  var c = checkToken_(env, device, token);
  if (c.ok) env.store.del('DEV_' + c.id);
  return { ok: true };
}

function cleanLabel_(s) {
  s = String(s == null ? '' : s).replace(/[\u0000-\u001f<>"'&\\]/g, '').replace(/\s+/g, ' ').trim().slice(0, PAIR.LABEL_MAX);
  return s || 'Device';
}

// =====================================================================================================
// Step 1b: substitutions. The ONLY tabs this script may write are its own S1_ tabs (it creates them).
// Owner tabs (TABS above and every other tab) are read-only: every write goes through writableTab_().
// Changes are an append-only op log (Q-HARM-10 style: never overwrite, a later op wins by Lamport order,
// server receive time breaks ties, duplicate op IDs are ignored). S1_Absences / S1_Subs are readable views.
// =====================================================================================================
var SCHEMA = 1;
var OWN_TABS = ['S1_Ops', 'S1_Absences', 'S1_Subs'];
var OPS_HEAD = ['Schema', 'Op ID', 'Device', 'Seq', 'Lamport', 'Kind', 'Date', 'Target', 'Value', 'Device time', 'Received'];
var ABS_HEAD = ['Schema', 'Date', 'Day', 'StaffId', 'Periods', 'Status', 'Updated (IST)', 'Op ID'];
var SUBS_HEAD = ['Schema', 'Date', 'Day', 'Period', 'Absent StaffId', 'Sub StaffId', 'Status', 'Updated (IST)', 'Op ID'];
var OPS_KEEP_DAYS = 21; // pulls send ops for dates from 21 days ago onward
var WEEKDAY_ = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function writableTab_(name) {
  if (OWN_TABS.indexOf(name) < 0) throw new Error('Refused: the bridge never writes to "' + name + '"');
  return name;
}

var ID_RE_ = /^[A-Za-z0-9_.-]{1,24}$/, SLOT_RE_ = /^[A-Z0-9]{1,6}$/, DATE_RE_ = /^\d{4}-\d{2}-\d{2}$/;

function dayOf_(date) { return WEEKDAY_[new Date(date + 'T12:00:00Z').getUTCDay()]; }

/** '' when the op is well-formed and belongs to this device; otherwise the reason. */
function opError_(o, device) {
  if (!o || typeof o !== 'object') return 'bad op';
  if (o.device !== device || o.opId !== device + ':' + o.seq) return 'bad op id';
  if (!(o.seq >= 1 && o.seq % 1 === 0) || !(o.lamport >= 1 && o.lamport % 1 === 0)) return 'bad counter';
  if (!DATE_RE_.test(String(o.date)) || WEEKDAY_.indexOf(dayOf_(o.date)) < 1 || dayOf_(o.date) === 'Sat') return 'bad date';
  var v = o.value;
  if (o.kind === 'absent') {
    if (!ID_RE_.test(String(o.target))) return 'bad target';
    if (v === null) return '';
    if (v && v.periods === 'ALL') return '';
    if (v && Array.isArray(v.periods) && v.periods.length && v.periods.every(function (p) { return SLOT_RE_.test(String(p)); })) return '';
    return 'bad value';
  }
  if (o.kind === 'sub') {
    var t = String(o.target).split('|');
    if (t.length !== 2 || !SLOT_RE_.test(t[0]) || !ID_RE_.test(t[1])) return 'bad target';
    if (v === null) return '';
    if (v && ID_RE_.test(String(v.sub))) return '';
    return 'bad value';
  }
  return 'bad kind';
}

function opKey_(o) { return o.kind + '|' + o.date + '|' + o.target; }
function newer_(a, b) { // is a later than b?
  if (a.lamport !== b.lamport) return a.lamport > b.lamport;
  if (a.recvAt !== b.recvAt) return a.recvAt > b.recvAt;
  return a.opId > b.opId;
}
/** Current state: the winning op per key. */
function fold_(ops) {
  var w = {};
  ops.forEach(function (o) { var k = opKey_(o); if (!w[k] || newer_(o, w[k])) w[k] = o; });
  return w;
}

/** Who teaches when, from the owner's _Timetable (read-only): { 'Mon|P3': { T01: true } }. */
function teachingIndex_(tabs) {
  var rows = (tabs && tabs._Timetable) || [], idx = {};
  if (rows.length < 2) return idx;
  var h = rows[0].map(function (x) { return String(x).trim(); });
  var cDay = h.indexOf('Day'), cP = h.indexOf('Period'), cT = h.indexOf('Teacher(s)'), cO = h.indexOf('Override staff');
  rows.slice(1).forEach(function (r) {
    var who = String((cO >= 0 && r[cO]) || r[cT] || '').split(',');
    var k = String(r[cDay]).trim() + '|' + String(r[cP]).trim();
    who.forEach(function (t) { t = t.trim(); if (t) { idx[k] = idx[k] || {}; idx[k][t] = true; } });
  });
  return idx;
}

function absentAt_(state, date, staff, slot) {
  var a = state['absent|' + date + '|' + staff];
  if (!a || !a.value) return false;
  return a.value.periods === 'ALL' || a.value.periods.indexOf(slot) >= 0;
}

/** Why a sub can't take date/slot (or ''): absent, teaching, or already covering another duty then. */
function subConflict_(state, teach, date, slot, absentId, sub) {
  if (sub === absentId) return 'same teacher';
  if (absentAt_(state, date, sub, slot)) return 'sub absent';
  if ((teach[dayOf_(date) + '|' + slot] || {})[sub]) return 'sub teaching';
  for (var k in state) {
    var o = state[k];
    if (o.kind === 'sub' && o.date === date && o.value && o.value.sub === sub && o.target !== slot + '|' + absentId && o.target.split('|')[0] === slot) return 'sub busy';
  }
  return '';
}

/** Checks and stamps incoming ops. Returns { accepted, rejected:[{opId,error}] }. Pure: no Sheet access. */
function acceptOps_(existing, incoming, device, now, tabs) {
  var seen = {}, out = { accepted: [], rejected: [] };
  existing.forEach(function (o) { seen[o.opId] = true; });
  var last = existing.reduce(function (m, o) { return Math.max(m, o.recvAt || 0); }, 0);
  var all = existing.slice(), teach = teachingIndex_(tabs);
  (incoming || []).slice(0, 200).forEach(function (raw) {
    var o = raw && typeof raw === 'object' ? { opId: String(raw.opId), device: String(raw.device), seq: Number(raw.seq), lamport: Number(raw.lamport), kind: String(raw.kind), date: String(raw.date), target: String(raw.target), value: raw.value === undefined ? null : raw.value, wallAt: Number(raw.wallAt) || 0 } : null;
    if (o && seen[o.opId]) return; // idempotent: a resend is ignored
    var err = opError_(o, device);
    if (!err && o.kind === 'sub' && o.value) {
      var t = o.target.split('|');
      err = subConflict_(fold_(all), teach, o.date, t[0], t[1], o.value.sub);
      if (err) err = 'conflict: ' + err;
    }
    if (err) { out.rejected.push({ opId: o ? o.opId : '', error: err }); return; }
    last = Math.max(now, last + 1);
    o.recvAt = last;
    seen[o.opId] = true; all.push(o); out.accepted.push(o);
  });
  return out;
}

function opRow_(o) { return [SCHEMA, o.opId, o.device, o.seq, o.lamport, o.kind, o.date, o.target, JSON.stringify(o.value), o.wallAt, o.recvAt]; }
function rowOp_(r) {
  var v = null; try { v = JSON.parse(r[8]); } catch (e) { v = null; }
  return { opId: String(r[1]), device: String(r[2]), seq: Number(r[3]), lamport: Number(r[4]), kind: String(r[5]), date: String(r[6]), target: String(r[7]), value: v, wallAt: Number(r[9]), recvAt: Number(r[10]) };
}

/** S1_Absences and S1_Subs rows (deleted entries kept as tombstones with Status "deleted"). */
function views_(ops, fmt) {
  var st = fold_(ops), abs = [], subs = [];
  Object.keys(st).sort().forEach(function (k) {
    var o = st[k], when = fmt(o.recvAt);
    if (o.kind === 'absent') abs.push([SCHEMA, o.date, dayOf_(o.date), o.target, o.value ? (o.value.periods === 'ALL' ? 'ALL' : o.value.periods.join(',')) : '', o.value ? 'active' : 'deleted', when, o.opId]);
    else { var t = o.target.split('|'); subs.push([SCHEMA, o.date, dayOf_(o.date), t[0], t[1], o.value ? o.value.sub : '', o.value ? 'active' : 'deleted', when, o.opId]); }
  });
  return { S1_Absences: [ABS_HEAD].concat(abs), S1_Subs: [SUBS_HEAD].concat(subs) };
}

function recentOps_(ops, today) {
  var from = new Date(new Date(today + 'T12:00:00Z').getTime() - OPS_KEEP_DAYS * 86400000).toISOString().slice(0, 10);
  return ops.filter(function (o) { return o.date >= from; });
}

/** The web-app router. io = { readTabs(), readOps(), appendOps(ops), writeViews(views), today, fmt }.
 *  io is only touched after the device key checks out. */
function handle_(env, q, io) {
  q = q || {};
  if (q.key && !q.token) return { ok: false, error: 'superseded' }; // an old connectLink() link
  if (q.action === 'pair') return redeemCode_(env, q.code, q.device, q.label);
  if (q.action === 'unpair') return unpairSelf_(env, q.device, q.token);
  if (q.action !== 'pull' && q.action !== 'write') return { ok: false, error: 'unknown action' };
  var c = checkToken_(env, q.device, q.token);
  if (!c.ok) return c;
  var tabs = io.readTabs(), ops = io.readOps(), res = { ok: true };
  if (q.action === 'write') {
    var incoming = q.ops;
    if (typeof incoming === 'string') { try { incoming = JSON.parse(incoming); } catch (e) { return { ok: false, error: 'bad ops' }; } }
    if (!Array.isArray(incoming)) return { ok: false, error: 'bad ops' };
    var r = acceptOps_(ops, incoming, c.id, env.now, tabs);
    if (r.accepted.length) { io.appendOps(r.accepted); ops = ops.concat(r.accepted); io.writeViews(views_(ops, io.fmt)); }
    res.accepted = r.accepted.map(function (o) { return o.opId; });
    res.rejected = r.rejected;
  }
  var recent = recentOps_(ops, io.today);
  res.tabs = tabs; res.ops = recent;
  res.hash = env.hash('data:' + JSON.stringify(tabs) + '|' + JSON.stringify(recent)).slice(0, 16);
  return res;
}

function pairLink_(previewUrl, bridgeUrl, code) {
  return previewUrl + '#pair=' + code + '&b=' + encodeURIComponent(bridgeUrl);
}

/** QR as an inline SVG, made here (Qr.gs), so the code never leaves Google. */
function qrSvg_(text) {
  var q = qrcode(0, 'M');
  q.addData(text);
  q.make();
  var n = q.getModuleCount(), m = 4, d = '';
  for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (q.isDark(r, c)) d += 'M' + (c + m) + ' ' + (r + m) + 'h1v1h-1z';
  var s = n + m * 2;
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + s + ' ' + s + '" shape-rendering="crispEdges" role="img" aria-label="Pairing QR code">'
    + '<rect width="' + s + '" height="' + s + '" fill="#fff"/><path fill="#000" d="' + d + '"/></svg>';
}

function esc_(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Sheet dialogs can't load the app's CSS, so this holds a copy of the Driftline tokens they use
// (driftline-kit v0.3.0, utopian-night, the preview's theme). Rules below use only these var(--dl-*) names.
var DL_TOKENS_ = ':root{--dl-color-bg:#040811;--dl-color-surface-solid:#0a1628;--dl-color-surface-raised:#0f1f38;--dl-color-track:#0c182c;'
  + '--dl-color-hairline:rgba(56,189,248,.18);--dl-color-control-border:rgba(125,211,252,.55);--dl-color-text:#e6f4ff;--dl-color-text-muted:#8fb8d8;'
  + '--dl-color-accent:#38bdf8;--dl-color-focus:#7dd3fc;--dl-color-positive:#34d399;--dl-color-danger:#fb7185;'
  + '--dl-button-primary-from:#2563eb;--dl-button-primary-to:#4f46e5;--dl-button-primary-text:#fff;'
  + '--dl-space-1:4px;--dl-space-2:8px;--dl-space-3:12px;--dl-space-4:16px;--dl-radius-sm:10px;--dl-radius-md:14px;'
  + '--dl-type-caption-size:12px;--dl-type-footnote-size:13px;--dl-type-callout-size:15px;--dl-type-body-size:16px;--dl-type-title2-size:24px;--dl-hit-min:44px;'
  + '--dl-radius-pill:999px;--dl-dur-instant:120ms;--dl-dur-calm:320ms;--dl-ease-settle:cubic-bezier(0.2,0.9,0.3,1);'
  + '--dl-chip-positive-bg:color-mix(in srgb,var(--dl-color-positive) 16%,var(--dl-color-surface-solid));--dl-chip-positive-border:color-mix(in srgb,var(--dl-color-positive) 42%,transparent);'
  + '--dl-chip-danger-bg:color-mix(in srgb,var(--dl-color-danger) 16%,var(--dl-color-surface-solid));--dl-chip-danger-border:color-mix(in srgb,var(--dl-color-danger) 42%,transparent)}'
  + '@media (prefers-reduced-motion:reduce){:root{--dl-dur-calm:1ms}}';
var DIALOG_CSS_ = '<style>' + DL_TOKENS_
  + 'body{font:var(--dl-type-body-size)/1.4 -apple-system,"SF Pro Text",Inter,system-ui,sans-serif;background:var(--dl-color-bg);color:var(--dl-color-text);margin:0;padding:var(--dl-space-3) var(--dl-space-4);text-align:center}'
  + '.code{font-size:var(--dl-type-title2-size);font-weight:700;font-variant-numeric:tabular-nums;letter-spacing:.18em;margin:var(--dl-space-2) 0 var(--dl-space-1)}'
  + '.muted{color:var(--dl-color-text-muted);font-size:var(--dl-type-footnote-size)}'
  // The QR keeps its own white quiet zone: scanners need dark-on-light.
  + '.qr{width:216px;height:216px;margin:var(--dl-space-2) auto;border-radius:var(--dl-radius-sm);overflow:hidden}.qr svg{width:100%;height:100%;display:block}'
  + '.state{min-height:20px;font-weight:600;margin:var(--dl-space-2) 0}.ok{color:var(--dl-color-positive)}.bad{color:var(--dl-color-danger)}'
  + 'button{font:inherit;font-size:var(--dl-type-footnote-size);font-weight:600;min-height:var(--dl-hit-min);padding:0 var(--dl-space-4);border-radius:var(--dl-radius-md);border:0;'
  + 'color:var(--dl-color-text);background:var(--dl-color-track);box-shadow:inset 0 0 0 1px var(--dl-color-control-border);cursor:pointer}'
  + 'button.pri{color:var(--dl-button-primary-text);background:linear-gradient(135deg,var(--dl-button-primary-from),var(--dl-button-primary-to));box-shadow:none}'
  + 'button.dan{color:var(--dl-color-danger)}button:focus-visible{outline:2px solid var(--dl-color-focus);outline-offset:2px}'
  + 'input{width:100%;box-sizing:border-box;font:var(--dl-type-caption-size) ui-monospace,Menlo,monospace;padding:var(--dl-space-2);background:var(--dl-color-surface-raised);'
  + 'border:1px solid var(--dl-color-hairline);border-radius:var(--dl-radius-sm);color:var(--dl-color-text-muted)}'
  + 'table{width:100%;border-collapse:collapse;text-align:left}td,th{padding:var(--dl-space-2) var(--dl-space-1);border-bottom:1px solid var(--dl-color-hairline);vertical-align:middle}'
  + 'th{font-size:var(--dl-type-caption-size);color:var(--dl-color-text-muted);font-weight:600}'
  + '.chip{display:inline-block;margin:0 0 var(--dl-space-2);padding:var(--dl-space-1) var(--dl-space-3);border-radius:var(--dl-radius-pill);font-size:var(--dl-type-footnote-size);font-weight:600;'
  + 'color:var(--dl-color-positive);background:var(--dl-chip-positive-bg);box-shadow:inset 0 0 0 1px var(--dl-chip-positive-border)}'
  + '.chip.bad{color:var(--dl-color-danger);background:var(--dl-chip-danger-bg);box-shadow:inset 0 0 0 1px var(--dl-chip-danger-border)}'
  + '.roll{animation:roll var(--dl-dur-calm) var(--dl-ease-settle) both}@keyframes roll{from{transform:translateY(-60%);opacity:0}to{transform:none;opacity:1}}'
  + '@media (prefers-reduced-motion:reduce){.roll{animation:fade var(--dl-dur-instant) linear both}@keyframes fade{from{opacity:0}to{opacity:1}}}'
  + '.qr{transition:opacity var(--dl-dur-calm) var(--dl-ease-settle)}'
  + '.toast{position:fixed;left:var(--dl-space-3);right:var(--dl-space-3);bottom:var(--dl-space-3);display:flex;align-items:center;justify-content:space-between;gap:var(--dl-space-3);'
  + 'min-height:var(--dl-hit-min);padding:0 var(--dl-space-2) 0 var(--dl-space-4);border-radius:var(--dl-radius-pill);background:var(--dl-color-surface-raised);box-shadow:inset 0 0 0 1px var(--dl-color-hairline);font-size:var(--dl-type-callout-size);font-weight:600}'
  + '.toast[hidden],.chip[hidden],[hidden]{display:none}.toast .act{box-shadow:none;background:none;color:var(--dl-color-accent);border-radius:var(--dl-radius-pill)}</style>';

/** The "Pair a device" dialog. Q-45-03 (LOCKED): when a code is used the host stays on this screen,
 *  shows a small success chip and swaps to a fresh code at once (digit roll, --dl-dur-calm / --dl-ease-settle;
 *  reduce-motion: a --dl-dur-instant fade). c = { code, exp, ttl (s), link, svg }. */
function pairDialogHtml_(c) {
  return '<!doctype html><html><head><meta charset="utf-8"><base target="_top">' + DIALOG_CSS_ + '</head><body>'
    + '<div class="chip" id="chip" role="status" hidden></div>'
    + '<div class="muted">On the phone or computer: scan this, or open the preview and type the code.</div>'
    + '<div class="qr" id="qr">' + c.svg + '</div>'
    + '<div class="code" id="code" aria-live="polite"></div>'
    + '<div class="muted" id="ttl"></div>'
    + '<div class="state" id="st" role="status"></div>'
    + '<details style="text-align:left;margin:6px 0"><summary class="muted">No camera? Open this link on the device</summary>'
    + '<input id="lnk" readonly onclick="this.select()"></details>'
    + '<div style="margin-top:8px"><button id="again" class="pri" hidden onclick="fresh(\'\')">New code</button> '
    + '<button onclick="done()">Close</button></div>'
    + '<script>var C=' + JSON.stringify({ code: c.code, exp: c.exp, ttl: c.ttl, link: c.link }).replace(/</g, '\\u003c') + ',end=0,over=false,G=(typeof google!=="undefined"&&google.script)?google.script:null;'
    + 'function el(i){return document.getElementById(i)}'
    + 'function show(c){C=c;end=Date.now()+c.ttl*1000;over=false;var k=el("code");k.classList.remove("roll");void k.offsetWidth;k.classList.add("roll");'
    + 'k.textContent=c.code.slice(0,3)+" "+c.code.slice(3);k.setAttribute("aria-label","Pairing code "+c.code.split("").join(" "));el("lnk").value=c.link;'
    + 'if(c.svg)el("qr").innerHTML=c.svg;el("qr").style.opacity=1;el("st").textContent="";el("again").hidden=true;tick()}'
    + 'function chip(t,bad){var h=el("chip");h.textContent=t;h.className="chip"+(bad?" bad":"");h.hidden=false}'
    + 'function fresh(t,bad){if(t)chip(t,bad);if(G)G.run.withSuccessHandler(show).newPairCode();}'
    + 'function tick(){if(over)return;var s=Math.max(0,Math.round((end-Date.now())/1000));el("ttl").textContent="Works once · ends in "+Math.floor(s/60)+":"+("0"+s%60).slice(-2);'
    + 'if(s<=0){over=true;el("ttl").textContent="";el("qr").style.opacity=.15;el("code").textContent="";el("st").textContent="This code has ended.";el("st").className="state bad";el("again").hidden=false}}'
    + 'function poll(){if(over||!G)return;var exp=C.exp;G.run.withSuccessHandler(function(r){if(over||exp!==C.exp)return;'
    + 'if(r.state==="paired")fresh(r.label+" paired · Code used and blocked",false);'
    + 'else if(r.state==="locked")fresh("Too many wrong tries · that code is blocked",true);'
    + 'else if(r.state==="replaced"){over=true;el("st").textContent="A newer code was made in another window.";el("st").className="state bad"}'
    + 'else if(r.state==="waiting"&&r.left<5){el("st").textContent=r.left+" tries left on this code";el("st").className="state"}}).pairStatus(exp)}'
    + 'function done(){if(G){if(!over)G.run.cancelPairing(C.exp);G.host.close()}}'
    + 'show(C);setInterval(tick,1000);setInterval(poll,2000);</script></body></html>';
}

/** The "Paired devices" dialog. Q-45-04 (LOCKED): Remove acts at once, no confirm, with an Undo toast for ~5 s. */
function devicesHtml_(list, fmt) {
  var rows = list.map(function (d) {
    return '<tr id="r' + d.id + '"><td><b>' + esc_(d.label) + '</b><br><span class="muted">Paired ' + esc_(fmt(d.pairedAt)) + ' · last seen ' + esc_(fmt(d.lastSeen)) + '</span></td>'
      + '<td style="text-align:right"><button class="dan" onclick="rv(\'' + d.id + '\')">Remove</button></td></tr>';
  }).join('');
  return '<!doctype html><html><head><meta charset="utf-8"><base target="_top">' + DIALOG_CSS_ + '</head><body style="text-align:left">'
    + (list.length ? '<table><tr><th>Device</th><th></th></tr>' + rows + '</table>'
      : '<p class="muted">No devices are paired. Use LFPS › Pair a device.</p>')
    + '<p class="muted">Removing a device stops it reading the routine at its next refresh. It can pair again with a new code.</p>'
    + '<div style="text-align:right"><button onclick="if(window.google)google.script.host.close()">Close</button></div>'
    + '<div class="toast" id="toast" role="status" hidden><span id="tt"></span><button class="act" onclick="undo()">Undo</button></div>'
    + '<script>var G=(window.google&&google.script)?google.script:null,last=null,timer=0;'
    + 'function rv(id){var r=document.getElementById("r"+id);r.hidden=true;last=id;if(G)G.run.revokeDevice(id);'
    + 'document.getElementById("tt").textContent="Device removed";document.getElementById("toast").hidden=false;clearTimeout(timer);timer=setTimeout(function(){document.getElementById("toast").hidden=true;last=null},5000)}'
    + 'function undo(){if(!last)return;var id=last;last=null;document.getElementById("toast").hidden=true;'
    + 'if(G)G.run.withSuccessHandler(function(){document.getElementById("r"+id).hidden=false}).restoreDevice(id);else document.getElementById("r"+id).hidden=false}</script>'
    + '</body></html>';
}

// =====================================================================================================
// Apps Script glue (not unit-tested; exercised locally by a fake bridge that stubs these services)
// =====================================================================================================

function sha256Hex_(s) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8)
    .map(function (b) { return ('0' + ((b + 256) % 256).toString(16)).slice(-2); }).join('');
}

function env_() {
  var p = PropertiesService.getScriptProperties();
  return {
    now: Date.now(),
    hash: sha256Hex_,
    rand: function () { return Utilities.getUuid().replace(/-/g, ''); },
    store: {
      get: function (k) { return p.getProperty(k); },
      set: function (k, v) { p.setProperty(k, v); },
      del: function (k) { p.deleteProperty(k); },
      keys: function () { return p.getKeys(); }
    }
  };
}

/** The web app URL. Script Property BRIDGE_URL overrides it if Apps Script reports the wrong one. */
function bridgeUrl_() {
  return PropertiesService.getScriptProperties().getProperty('BRIDGE_URL') || ScriptApp.getService().getUrl();
}

function readTabs_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), tabs = {};
  TABS.forEach(function (name) {
    var sh = ss.getSheetByName(name);
    tabs[name] = sh ? sh.getDataRange().getDisplayValues() : [];
  });
  return tabs;
}

function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

function todayIST_() { return Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd'); }
function fmtIST_(t) { return Utilities.formatDate(new Date(t), 'Asia/Kolkata', 'yyyy-MM-dd HH:mm:ss'); }

/** The bridge's own tab, created on first use as plain text (so dates stay text). Owner tabs never pass writableTab_. */
function ownSheet_(ss, name, head) {
  writableTab_(name);
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, sh.getMaxRows(), head.length).setNumberFormat('@');
    sh.getRange(1, 1, 1, head.length).setValues([head]);
    sh.setFrozenRows(1);
  }
  return sh;
}

function io_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  return {
    today: todayIST_(), fmt: fmtIST_, readTabs: readTabs_,
    readOps: function () {
      var sh = ss.getSheetByName('S1_Ops');
      if (!sh || sh.getLastRow() < 2) return [];
      return sh.getRange(2, 1, sh.getLastRow() - 1, OPS_HEAD.length).getDisplayValues().filter(function (r) { return r[1]; }).map(rowOp_);
    },
    appendOps: function (ops) {
      var sh = ownSheet_(ss, 'S1_Ops', OPS_HEAD), rows = ops.map(opRow_);
      sh.getRange(sh.getLastRow() + 1, 1, rows.length, OPS_HEAD.length).setNumberFormat('@').setValues(rows.map(function (r) { return r.map(String); }));
    },
    writeViews: function (v) {
      [['S1_Absences', ABS_HEAD], ['S1_Subs', SUBS_HEAD]].forEach(function (x) {
        var sh = ownSheet_(ss, x[0], x[1]), rows = v[x[0]];
        sh.clearContents();
        sh.getRange(1, 1, rows.length, x[1].length).setNumberFormat('@').setValues(rows.map(function (r) { return r.map(String); }));
      });
    }
  };
}

function serve_(q) {
  var lock = (q.action === 'pair' || q.action === 'unpair' || q.action === 'write') ? LockService.getScriptLock() : null;
  if (lock && !lock.tryLock(10000)) return out_({ ok: false, error: 'busy' });
  try { return out_(handle_(env_(), q, io_())); } finally { if (lock) lock.releaseLock(); }
}

function doGet(e) { return serve_((e && e.parameter) || {}); }

/** Writes arrive as a text/plain JSON body (no CORS preflight); GET with ops=… also works. */
function doPost(e) {
  var q = {};
  try { q = JSON.parse((e && e.postData && e.postData.contents) || '{}'); } catch (x) { q = {}; }
  return serve_(q);
}

/** Run once. Retires the old connect-link key and adds the LFPS menu. */
function setUp() {
  var p = PropertiesService.getScriptProperties();
  p.deleteProperty('KEY'); // the old connectLink() key: old links stop working
  if (typeof qrcode !== 'function') throw new Error('Qr.gs is missing. Add a script file named Qr and paste Qr.gs into it.');
  Logger.log('Ready. Next: Deploy → New deployment → Web app (Execute as: Me · Who has access: Anyone). Then reload the Sheet and use LFPS › Pair a device.');
}

function onOpen() {
  SpreadsheetApp.getUi().createMenu('LFPS')
    .addItem('Pair a device', 'pairDevice')
    .addItem('Paired devices', 'pairedDevices')
    .addSeparator()
    .addItem('Remove all devices…', 'removeAllDevices')
    .addToUi();
}

/** A fresh code for the dialog (also used for the Q-45-03 swap after a code is used). */
function newPairCode() {
  var env = env_(), c = makeCode_(env), link = pairLink_(PREVIEW, bridgeUrl_(), c.code);
  return { code: c.code, exp: c.exp, ttl: PAIR.CODE_TTL_MS / 1000, link: link, svg: qrSvg_(link) };
}

function pairDevice() {
  var ui = SpreadsheetApp.getUi();
  if (!askBridgeUrl_(ui)) return;
  var html = HtmlService.createHtmlOutput(pairDialogHtml_(newPairCode())).setWidth(360).setHeight(540);
  ui.showModalDialog(html, 'Pair a device');
}

/** Apps Script doesn't always report its own Web app address, so the first time it asks once and keeps it
 *  in Script Property BRIDGE_URL (the same fix as setting it by hand). */
function askBridgeUrl_(ui) {
  var url = bridgeUrl_();
  if (url && /\/exec$/.test(url)) return true;
  var r = ui.prompt('Web app address needed (once)', 'Deploy › Manage deployments › copy the Web app URL (it ends in /exec) and paste it here.', ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return false;
  var v = r.getResponseText().trim();
  if (!/^https:\/\/script\.google\.com\/[^\s]+\/exec$/.test(v)) { ui.alert('That doesn’t look like a Web app URL ending in /exec. Nothing was saved.'); return false; }
  PropertiesService.getScriptProperties().setProperty('BRIDGE_URL', v);
  return true;
}

function pairStatus(exp) { return codeStatus_(env_(), Number(exp)); }
function cancelPairing(exp) { cancelCode_(env_(), Number(exp)); }

function pairedDevices() {
  var tz = 'Asia/Kolkata';
  var fmt = function (t) { return Utilities.formatDate(new Date(t), tz, 'd MMM yyyy, HH:mm'); };
  var html = HtmlService.createHtmlOutput(devicesHtml_(listDevices_(env_()), fmt)).setWidth(420).setHeight(360);
  SpreadsheetApp.getUi().showModalDialog(html, 'Paired devices');
}

function revokeDevice(id) {
  var lock = LockService.getScriptLock(); lock.waitLock(10000);
  try { return revokeDevice_(env_(), id); } finally { lock.releaseLock(); }
}

function restoreDevice(id) {
  var lock = LockService.getScriptLock(); lock.waitLock(10000);
  try { return restoreDevice_(env_(), id); } finally { lock.releaseLock(); }
}

function removeAllDevices() {
  var ui = SpreadsheetApp.getUi();
  if (ui.alert('Remove all devices?', 'Every paired phone and computer stops showing the routine. Each can pair again with a new code.', ui.ButtonSet.OK_CANCEL) !== ui.Button.OK) return;
  var lock = LockService.getScriptLock(); lock.waitLock(10000);
  try { ui.alert(revokeAll_(env_()) + ' device(s) removed.'); } finally { lock.releaseLock(); }
}
