/**
 * LFPS Subs · Stage 1 preview bridge (READ-ONLY). Paste into the TEMP Sheet only:
 * Extensions → Apps Script → Code.gs. It never writes to the Sheet.
 * Setup (once): run setUp() → it makes a private key and logs the "Open on a device" link.
 * Deploy → New deployment → Web app → Execute as: Me · Who has access: Anyone → Deploy.
 * Then run connectLink() and open the link it logs on each device.
 */
var TABS = ['_Staff', '_Sections', '_TimingSlots', '_Timetable', '_Subjects', '_Periods'];
var PREVIEW = 'https://steph1420.github.io/lfps-subs-preview/';

function setUp() {
  var p = PropertiesService.getScriptProperties();
  if (!p.getProperty('KEY')) p.setProperty('KEY', Utilities.getUuid().replace(/-/g, ''));
  Logger.log('Key ready. Now Deploy → New deployment → Web app, then run connectLink().');
}

function connectLink() {
  var url = ScriptApp.getService().getUrl();
  var key = PropertiesService.getScriptProperties().getProperty('KEY');
  if (!url || !key) throw new Error('Run setUp() and deploy as a Web app first.');
  Logger.log(PREVIEW + '#connect=' + encodeURIComponent(Utilities.base64Encode(url + '|' + key)));
}

function doGet(e) {
  var key = PropertiesService.getScriptProperties().getProperty('KEY');
  if (!key || !e || !e.parameter || e.parameter.key !== key) return out_({ ok: false, error: 'bad key' });
  if (e.parameter.action !== 'pull') return out_({ ok: false, error: 'unknown action' });
  var ss = SpreadsheetApp.getActiveSpreadsheet(), tabs = {};
  TABS.forEach(function (name) {
    var sh = ss.getSheetByName(name);
    tabs[name] = sh ? sh.getDataRange().getDisplayValues() : [];
  });
  var json = JSON.stringify(tabs);
  var hash = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, json)).slice(0, 16);
  return out_({ ok: true, hash: hash, tabs: tabs });
}

function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
