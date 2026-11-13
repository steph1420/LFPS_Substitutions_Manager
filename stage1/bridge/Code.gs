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

/** The web-app router. readTabs is only called after the token checks out. */
function handle_(env, q, readTabs) {
  q = q || {};
  if (q.key && !q.token) return { ok: false, error: 'superseded' }; // an old connectLink() link
  if (q.action === 'pair') return redeemCode_(env, q.code, q.device, q.label);
  if (q.action === 'unpair') return unpairSelf_(env, q.device, q.token);
  if (q.action === 'pull') {
    var c = checkToken_(env, q.device, q.token);
    if (!c.ok) return c;
    var tabs = readTabs();
    return { ok: true, hash: env.hash('data:' + JSON.stringify(tabs)).slice(0, 16), tabs: tabs };
  }
  return { ok: false, error: 'unknown action' };
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
  + '--dl-type-caption-size:12px;--dl-type-footnote-size:13px;--dl-type-body-size:16px;--dl-type-title2-size:24px;--dl-hit-min:44px}';
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
  + 'th{font-size:var(--dl-type-caption-size);color:var(--dl-color-text-muted);font-weight:600}</style>';

/** The "Pair a device" dialog. ttlSec counts down on screen; the dialog asks the script how it went. */
function pairDialogHtml_(code, exp, ttlSec, link, svg) {
  return '<!doctype html><html><head><meta charset="utf-8"><base target="_top">' + DIALOG_CSS_ + '</head><body>'
    + '<div id="live"><div class="muted">On the phone or computer: scan this, or open the preview and type the code.</div>'
    + '<div class="qr">' + svg + '</div>'
    + '<div class="code" aria-label="Pairing code">' + esc_(code.slice(0, 3) + ' ' + code.slice(3)) + '</div>'
    + '<div class="muted" id="ttl">Works once · ends in 5:00</div>'
    + '<details style="text-align:left;margin:6px 0"><summary class="muted">No camera? Open this link on the device</summary>'
    + '<input id="lnk" readonly value="' + esc_(link) + '" onclick="this.select()"></details></div>'
    + '<div class="state" id="st" role="status"></div>'
    + '<div style="margin-top:8px"><button id="again" class="pri" style="display:none" onclick="again()">Pair another device</button> '
    + '<button onclick="done()">Close</button></div>'
    + '<script>var exp=' + Number(exp) + ',end=Date.now()+' + Number(ttlSec) + '*1000,over=false,G=(typeof google!=="undefined"&&google.script)?google.script:null;'
    + 'function el(i){return document.getElementById(i)}'
    + 'function show(t,c,a){el("st").textContent=t;el("st").className="state "+(c||"");el("again").style.display=a?"inline-block":"none"}'
    // Q-HARM-9: once a code is used (or ends) the host screen resets at once: the code and QR disappear.
    + 'function finish(t,c,a){over=true;el("live").style.display="none";show(t,c,a)}'
    + 'function tick(){if(over)return;var s=Math.max(0,Math.round((end-Date.now())/1000));el("ttl").textContent="Works once · ends in "+Math.floor(s/60)+":"+("0"+s%60).slice(-2);'
    + 'if(s<=0)finish("This code has ended.","bad",true)}'
    + 'function poll(){if(over||!G)return;G.run.withSuccessHandler(function(r){if(over)return;'
    + 'if(r.state==="paired")finish("Paired: "+r.label+" ✓","ok",true);'
    + 'else if(r.state==="locked")finish("Too many wrong tries. This code is used up.","bad",true);'
    + 'else if(r.state==="replaced")finish("A newer code was made.","bad",false);'
    + 'else if(r.state==="waiting"&&r.left<5)show(r.left+" tries left on this code","",false)}).pairStatus(exp)}'
    + 'function again(){if(G)G.run.pairDevice()}function done(){if(G){if(!over)G.run.cancelPairing(exp);G.host.close()}}'
    + 'setInterval(tick,1000);setInterval(poll,2000);tick();</script></body></html>';
}

/** The "Paired devices" dialog. fmt turns a time (ms) into a short IST date. */
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
    + '<script>function rv(id){if(!confirm("Remove this device? It will stop showing the routine."))return;'
    + 'var r=document.getElementById("r"+id);if(window.google&&google.script){google.script.run.withSuccessHandler(function(){r.remove()}).revokeDevice(id)}else{r.remove()}}</script>'
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

function doGet(e) {
  var q = (e && e.parameter) || {};
  var lock = (q.action === 'pair' || q.action === 'unpair') ? LockService.getScriptLock() : null;
  if (lock && !lock.tryLock(10000)) return out_({ ok: false, error: 'busy' });
  try { return out_(handle_(env_(), q, readTabs_)); } finally { if (lock) lock.releaseLock(); }
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

function pairDevice() {
  var ui = SpreadsheetApp.getUi(), url = bridgeUrl_();
  if (!url) { ui.alert('Deploy this script as a Web app first (Deploy → New deployment → Web app).'); return; }
  var env = env_(), c = makeCode_(env), link = pairLink_(PREVIEW, url, c.code);
  var html = HtmlService.createHtmlOutput(pairDialogHtml_(c.code, c.exp, PAIR.CODE_TTL_MS / 1000, link, qrSvg_(link))).setWidth(360).setHeight(500);
  ui.showModalDialog(html, 'Pair a device');
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

function removeAllDevices() {
  var ui = SpreadsheetApp.getUi();
  if (ui.alert('Remove all devices?', 'Every paired phone and computer stops showing the routine. Each can pair again with a new code.', ui.ButtonSet.OK_CANCEL) !== ui.Button.OK) return;
  var lock = LockService.getScriptLock(); lock.waitLock(10000);
  try { ui.alert(revokeAll_(env_()) + ' device(s) removed.'); } finally { lock.releaseLock(); }
}
