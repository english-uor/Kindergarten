/**
 * Library of Kindergarten Research — backend (Google Apps Script)
 * University of Raparin, College of Basic Education, Kindergarten Department
 *
 * ============================================================
 * DEPLOYMENT — read this before pasting the code
 * ============================================================
 * This script targets your Kindergarten sheet directly by ID (see
 * SHEET_ID below), so it works whether you paste it into a standalone
 * project (script.google.com → New project) or a script bound to the
 * sheet (Extensions → Apps Script from inside it) — either is fine.
 *
 * 1. script.google.com → New project (or Extensions → Apps Script from
 *    inside the sheet). Delete the default content, paste this whole
 *    file in.
 * 2. Deploy → New deployment → Web app:
 *      Execute as:      Me
 *      Who has access:  Anyone      <-- MUST be exactly "Anyone", not
 *                                       "Anyone with Google account".
 *                                       This is the #1 cause of a web
 *                                       app that "hangs" or fails for
 *                                       everyone except you.
 *    Approve the permissions prompt (Sheets + Gmail) — you'll likely
 *    see a "Google hasn't verified this app" warning first; that's
 *    expected for a script you wrote yourself. Click "Advanced" →
 *    "Go to [project name] (unsafe)" → Allow.
 * 3. Copy the /exec URL into GAS_URL near the top of index.html.
 *
 * IMPORTANT — if you edit this code LATER: saving alone does not
 * update the live /exec URL. You must go to Deploy → Manage
 * deployments → (pencil/edit icon) → Version: "New version" → Deploy.
 * Editing without doing this is the #1 cause of "I fixed the code but
 * nothing changed."
 *
 * ============================================================
 * WHAT THIS EXPECTS IN YOUR SHEET
 * ============================================================
 * Two tabs, created automatically if missing (so this is safe to run
 * against your existing sheet — it will not overwrite real data):
 *   Topics:   Topic | Academic Year | Supervisor | Research Link | Abstract
 *   Teachers: No | Name | Email
 * Everything else (academic year, the two admin-configurable links,
 * the admin password) is stored in Script Properties, not a sheet —
 * see readSettings() / readPassword() below.
 */

const SHEET_ID = '1S4iHspjBGmjV5F8hUvUemmhtGVHRS8CWyIa58XwnoeM'; // your Kindergarten sheet, hardcoded — works whether this script is bound or standalone
const TOPICS_SHEET = 'Topics';
const TEACHERS_SHEET = 'Teachers';
const DEFAULT_PASSWORD = 'UOR2026@';
const DEFAULT_ACADEMIC_YEAR = '2026-2027';

// ============================================================
// ENTRY POINTS
// ============================================================

function doGet(e) {
  return handle(e, 'GET');
}

function doPost(e) {
  return handle(e, 'POST');
}

function handle(e, method) {
  try {
    const params = method === 'GET' ? (e.parameter || {}) : parsePostBody(e);
    const action = params.action;
    if (!action) return json({ success: false, error: 'No action specified' });

    const routes = {
      getTopics: getTopics,
      getSettings: getSettings,
      adminLogin: adminLogin,
      getTopicsAdmin: getTopicsAdmin,
      getTeachersAdmin: getTeachersAdmin,
      updateTopic: updateTopic,
      deleteTopic: deleteTopic,
      bulkAddTopics: bulkAddTopics,
      updateTeacher: updateTeacher,
      deleteTeacher: deleteTeacher,
      bulkAddTeachers: bulkAddTeachers,
      sendInvites: sendInvites,
      updateSettings: updateSettings
    };
    const fn = routes[action];
    if (!fn) return json({ success: false, error: 'Unknown action: ' + action });

    return json(fn(params));
  } catch (err) {
    return json({ success: false, error: String((err && err.message) || err) });
  }
}

function parsePostBody(e) {
  if (!e || !e.postData || !e.postData.contents) return {};
  try {
    return JSON.parse(e.postData.contents);
  } catch (err) {
    return {};
  }
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// SHEET HELPERS
// ============================================================

function ss() {
  return SpreadsheetApp.openById(SHEET_ID);
}

function sheet(name, headers) {
  const spreadsheet = ss();
  let sh = spreadsheet.getSheetByName(name);
  if (!sh) {
    sh = spreadsheet.insertSheet(name);
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    sh.setFrozenRows(1);
  }
  return sh;
}

function topicsSheet() {
  return sheet(TOPICS_SHEET, ['Topic', 'Academic Year', 'Supervisor', 'Research Link', 'Abstract']);
}
function teachersSheet() {
  return sheet(TEACHERS_SHEET, ['No', 'Name', 'Email']);
}

// Reads real data in ONE batched call. getLastRow()/getLastColumn() find
// the true extent of content (they ignore a sheet's padded empty rows),
// and reading with a single getRange(...).getValues() avoids the classic
// slow-Apps-Script mistake of calling getValue() once per cell in a loop.
function readRows(sh) {
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return [];
  const lastCol = sh.getLastColumn();
  return sh.getRange(2, 1, lastRow - 1, lastCol).getValues();
}

function readTopics() {
  return readRows(topicsSheet())
    .map(function (r, i) {
      return {
        row: i + 2,
        title: String(r[0] || '').trim(),
        academicYear: String(r[1] || '').trim(),
        supervisor: String(r[2] || '').trim(),
        researchLink: String(r[3] || '').trim(),
        abstract: String(r[4] || '').trim()
      };
    })
    .filter(function (t) { return t.title; }); // skip blank rows
}

function readTeachers() {
  return readRows(teachersSheet())
    .map(function (r, i) {
      return {
        row: i + 2,
        no: i + 1,
        name: String(r[1] || '').trim(),
        email: String(r[2] || '').trim()
      };
    })
    .filter(function (t) { return t.name; });
}

// ============================================================
// SETTINGS (Script Properties — not a sheet tab)
// ============================================================

function props() {
  return PropertiesService.getScriptProperties();
}

function readSettings() {
  const p = props();
  return {
    academicYear: p.getProperty('academicYear') || DEFAULT_ACADEMIC_YEAR,
    appUrl: p.getProperty('appUrl') || '',
    registerUrl: p.getProperty('registerUrl') || ''
  };
}

function readPassword() {
  return props().getProperty('adminPassword') || DEFAULT_PASSWORD;
}

function requireAuth(params) {
  if (!params || params.password !== readPassword()) {
    throw new Error('چوونەژوورەوە سەرکەوتوو نەبوو — وشەی نهێنی هەڵەیە');
  }
}

// ============================================================
// PUBLIC actions (no password)
// ============================================================

function getTopics() {
  return { success: true, topics: readTopics() };
}

function getSettings() {
  return { success: true, settings: readSettings() };
}

function adminLogin(params) {
  return { success: params.password === readPassword() };
}

// ============================================================
// ADMIN actions (all require the password)
// ============================================================

function getTopicsAdmin(params) {
  requireAuth(params);
  return { success: true, topics: readTopics() };
}

function getTeachersAdmin(params) {
  requireAuth(params);
  return { success: true, teachers: readTeachers() };
}

function updateTopic(params) {
  requireAuth(params);
  const sh = topicsSheet();
  const row = Number(params.row);
  if (!row || row < 2) throw new Error('ڕیزی نادروست');
  sh.getRange(row, 1, 1, 5).setValues([[
    params.title || '',
    params.academicYear || '',
    params.supervisor || '',
    params.researchLink || '',
    params.abstract || ''
  ]]);
  return { success: true };
}

function deleteTopic(params) {
  requireAuth(params);
  const sh = topicsSheet();
  const row = Number(params.row);
  if (!row || row < 2) throw new Error('ڕیزی نادروست');
  sh.deleteRow(row);
  return { success: true };
}

function bulkAddTopics(params) {
  requireAuth(params);
  const rows = params.rows || [];
  const values = rows
    .filter(function (r) { return r.title && r.supervisor; })
    .map(function (r) {
      return [r.title, r.academicYear || '', r.supervisor, r.researchLink || '', r.abstract || ''];
    });
  if (values.length) {
    const sh = topicsSheet();
    sh.getRange(sh.getLastRow() + 1, 1, values.length, 5).setValues(values);
  }
  return { success: true, added: values.length };
}

function updateTeacher(params) {
  requireAuth(params);
  const sh = teachersSheet();
  const row = Number(params.row);
  if (!row || row < 2) throw new Error('ڕیزی نادروست');
  sh.getRange(row, 2, 1, 2).setValues([[params.name || '', params.email || '']]);
  return { success: true };
}

function deleteTeacher(params) {
  requireAuth(params);
  const sh = teachersSheet();
  const row = Number(params.row);
  if (!row || row < 2) throw new Error('ڕیزی نادروست');
  sh.deleteRow(row);
  renumberTeachers(sh);
  return { success: true };
}

// The sheet's original "No" column was meant to be a self-numbering
// =ROW()-1 formula, but it hadn't actually been filled down past row 4
// in the live sheet — so this writes a plain, always-correct number
// instead of relying on a formula that has to be dragged down by hand.
function renumberTeachers(sh) {
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return;
  const values = [];
  for (let i = 2; i <= lastRow; i++) values.push([i - 1]);
  sh.getRange(2, 1, values.length, 1).setValues(values);
}

function bulkAddTeachers(params) {
  requireAuth(params);
  const list = params.list || [];
  const names = list.filter(function (t) { return t.name; });
  if (names.length) {
    const sh = teachersSheet();
    const startRow = sh.getLastRow() + 1;
    const values = names.map(function (t, i) {
      return [startRow - 1 + i, t.name, t.email || ''];
    });
    sh.getRange(startRow, 1, values.length, 3).setValues(values);
  }
  return { success: true, added: names.length };
}

function sendInvites(params) {
  requireAuth(params);
  const teachers = readTeachers();
  let targets;
  if (params.teacherRows === 'all') {
    targets = teachers;
  } else {
    const rowSet = {};
    (params.teacherRows || []).forEach(function (r) { rowSet[Number(r)] = true; });
    targets = teachers.filter(function (t) { return rowSet[t.row]; });
  }

  const settings = readSettings();
  const appUrl = settings.appUrl || ScriptApp.getService().getUrl();
  let sent = 0;
  const failed = [];

  targets.forEach(function (t) {
    if (!t.email) { failed.push(t.name); return; }
    try {
      MailApp.sendEmail({
        to: t.email,
        subject: 'کتێبخانەی توێژینەوەی بەشی باخچەی منداڵان',
        htmlBody:
          '<div dir="rtl" style="font-family:sans-serif;line-height:1.8;">' +
          '<p>بەڕێز ' + escapeHtmlBasic(t.name) + '،</p>' +
          '<p>پێش تۆمارکردنی ناونیشانی نوێ، تکایە سەردانی ئەم بەستەرە بکە بۆ دڵنیابوون لە دووبارەنەبوونەوە:</p>' +
          '<p><a href="' + appUrl + '">' + appUrl + '</a></p>' +
          '</div>'
      });
      sent++;
    } catch (err) {
      failed.push(t.name);
    }
  });

  return { success: true, sent: sent, failed: failed };
}

function escapeHtmlBasic(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function updateSettings(params) {
  requireAuth(params);
  const p = props();
  if (params.academicYear) p.setProperty('academicYear', params.academicYear);
  if (params.appUrl !== undefined) p.setProperty('appUrl', params.appUrl);
  if (params.registerUrl !== undefined) p.setProperty('registerUrl', params.registerUrl);
  if (params.newPassword) p.setProperty('adminPassword', params.newPassword);
  return { success: true, settings: readSettings() };
}
