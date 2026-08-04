# Library of English Research — کتێبخانەی توێژینەوەی بەشی زمانی ئینگلیزی

A single-page tool for the Kindergarten Department, College of Basic
Education, University of Raparin. Teachers search the whole archive of past
research topics, filter by academic year or supervisor, and get a live
green ✓ / amber "similar" / red "duplicate" **stamp** while typing a new
idea — then copy it with one tap and head to your separate registration
system.

---

## 2026-08-03: total redesign + flat file structure

This version replaces the previous one. Two things changed:

**1. Every file is now flat in the repo root — no subfolders at all.**
The earlier version used `assets/` and `icons/` subfolders, and folder
uploads kept getting dropped when uploading manually through GitHub's web
UI, which silently broke the whole site (no CSS, no JS, blank page). To
make that class of mistake impossible, `config.js`, `api.js`, `fuzzy.js`,
and `style.css` are now all merged into `index.html` itself — the whole
app is one file. Icons sit directly next to it. There is nothing to
"remember to also upload."

**2. Visual redesign.** New layout, new type scale, and a new signature
element: the duplicate-check result now appears as a rotated **stamp**
(✓ clear / ⚠ similar / ⛔ duplicate) — like a registrar stamping an index
card — instead of a plain status bar. The page is now split into two
clearly-labeled sections: "پێش تۆمارکردن" (check a new title) and "ئەرشیف"
(browse the archive), since those are genuinely two different tasks.
Topic cards now carry a small folder-tab showing the academic year, echoing
a physical card-catalog divider. The top bar is sticky so Admin is always
one tap away. Fonts and tap targets were sized for phones throughout
(inputs are 16px+, which also avoids iOS Safari's auto-zoom-on-focus).

**Also carried over from the previous fix:** loading now shows a spinner +
"please wait" message instead of a blank page; a failed or slow load shows
a clear error with a retry button instead of silently looking like "no
results"; requests have a timeout and read-only loads get one safe retry.

**Known limit:** I could not reach `script.google.com` from the sandbox I
built this in (it's not on that environment's network allowlist), so I've
only been able to test the frontend's handling of a failed/slow request —
not your actual deployment's real-world speed. If it's still slow after
this update, the next place to look is `code.gs` in the Apps Script editor
— most commonly a `doGet` that re-reads the sheet with individual
`getValue()` calls in a loop instead of one batched `getValues()` call.

---

## 2026-08-03 (later same day): code.gs, from scratch

Topics still weren't loading after the redesign, and I never actually had
your `code.gs` to look at — every message asking for it went out without
a file attached. Rather than keep guessing blind, this update includes a
**complete, from-scratch `code.gs`** built to match exactly what
`index.html` already calls, plus two changes that close off the most
common ways an Apps Script web app silently fails for everyone but its
owner:

- **It binds to your actual sheet**, not a new one. Open your real
  "Kindergarten" spreadsheet → Extensions → Apps Script, rather than
  starting a standalone project — see step 1 below. This was the most
  likely single cause: a standalone project calling
  `SpreadsheetApp.getActiveSpreadsheet()` has no "active" sheet to find
  and fails on every request, whether or not the deployment itself is
  configured correctly.
- **Reads are batched** — one `getRange(...).getValues()` call per sheet,
  never a `getValue()` loop per cell — the other classic cause of a slow
  Apps Script web app. (Your sheet only has ~10 real rows though, so this
  was more a safety net than the actual fix.)

Two things worth doing in the Sheet itself, unrelated to the code: **row 2
of your Topics tab has leftover label text** sitting where the first real
topic should be (`Topic (تەوەر / بابەت) | ...`) — delete that row. And the
Teachers tab's `No` column formula wasn't dragged down past row 4, so
`code.gs` now writes plain numbers there instead of relying on the
formula.

**Also added:** the search box is now disabled (greyed out, with a
"please wait" placeholder) until topics have actually finished loading,
and switches to a "couldn't load — retry below" placeholder if loading
fails, so it's never possible to type a check against an empty archive.

---

## 2026-08-03 (again): SHEET_ID hardcoded, no more binding guesswork

Still not loading after the last fix. You shared the Sheet's own link
this time, which let me check your **live** sheet directly (not just the
export) — confirmed the data and structure are exactly what I expected,
so the remaining uncertainty was specifically "is the script actually
reaching this spreadsheet at all."

`code.gs` now has your Sheet's ID (`1S4iHspjBGmjV5F8hUvUemmhtGVHRS8CWyIa58XwnoeM`)
hardcoded in it and opens it directly with `SpreadsheetApp.openById(...)`.
This works no matter how the Apps Script project was created — standalone
or bound to the sheet — so it removes that whole class of uncertainty
rather than depending on you having set it up one particular way.

If topics *still* don't load after redeploying this version, the cause is
almost certainly the deployment's access setting or authorization, not
the code — see the diagnostic link at the end of step 1 below, and please
share exactly what it shows.

---

## 1. Deploy the backend (Google Apps Script)

1. script.google.com → **New project** (or Extensions → Apps Script from
   inside the sheet — both work now, since the sheet is targeted by ID
   in the code itself). Delete the default content and paste in
   `code.gs` from this package.
2. **Deploy → New deployment → Web app**
   - Execute as: **Me**
   - Who has access: **Anyone** — must be exactly this, not "Anyone with
     Google account." This is the single most common reason a web app
     works for its owner but hangs or fails for everyone else.
   - Approve the permissions prompt (Sheets + Gmail). You'll likely see a
     "Google hasn't verified this app" warning first — that's expected
     for a script you wrote yourself: click **Advanced** → **Go to
     [project name] (unsafe)** → **Allow**.
3. Copy the `/exec` URL. The Topics/Teachers tabs are created
   automatically if they don't already exist — since yours already do,
   nothing gets overwritten.

**If you edit `code.gs` again later:** saving alone does not update the
live `/exec` URL. Go to **Deploy → Manage deployments → (edit icon) →
Version: New version → Deploy**. Skipping this step is the most common
reason "I fixed the code but nothing changed."

**To check it's actually working, independent of the app:** open the

`/exec?action=getTopics` URL directly in a browser. You should see raw
text starting with `{"success":true,"topics":[...`. If instead you see a
Google sign-in page, a "Sorry, unable to open the file" page, or anything
that isn't that JSON, the deployment access setting (step 3) is the
place to check first.

## 2. Connect the frontend

Open `index.html`, find this line near the top of the `<script>` block,
and paste your `/exec` URL:

```js
const GAS_URL = 'https://script.google.com/macros/s/XXXXXXXX/exec';
```

## 3. Publish to GitHub Pages

Upload every file in this package directly into the repo root — there are
no folders to worry about. On github.com: "Add file → Upload files", drag
in all the files at once, commit. Then enable Pages on the repo (Settings
→ Pages → Deploy from branch → `main` / root).

## 4. Set the two links in Admin → Settings

- **بەستەری ئەم سیستەمە** — this app's own live URL. Goes out in the
  Kurdish invite email.
- **بەستەری سیستەمی تۆمارکردن** — your separate registration system's URL.
  Powers the "چوونە سیستەمی تۆمارکردن" button that appears next to a clear
  (non-duplicate) stamp. Leave blank to hide that button.

## 5. Log in to Admin

Tap **🛡️ ئەدمین** in the top right, password `UOR2026@`. The browser stays
signed in afterward (like staying logged into an app) until you tap
**دەرچوون** (Log out).

From Admin: bulk-import old topics, edit any entry to add its abstract and
Drive link once ready, manage the teacher list, and send the Kurdish
invite email to one, several, or all teachers at once.

## 6. Install it as an app (PWA)

- **iPhone (Safari)**: Share → *Add to Home Screen*.
- **Android (Chrome)**: menu (⋮) → *Add to Home screen* / *Install app*.

---

## Files in this package

- `code.gs` — the backend. This does **not** go in the GitHub repo — it
  goes in the Apps Script editor (Extensions → Apps Script from inside
  your Google Sheet). See "Deploy the backend" above.
- Everything else is flat, no subfolders, and goes in the GitHub repo:
  `index.html` (the entire frontend: markup, styles, and JavaScript),
  `manifest.webmanifest` + `sw.js` (PWA support), and the icon files
  (`favicon.ico`, `favicon-16.png`, `favicon-32.png`,
  `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`,
  `maskable-512.png`).

## Notes & assumptions

- **Academic year** defaults to 2026-2027 — one field in Admin → Settings
  to change.
- **Duplicate detection** always checks the entire archive regardless of
  the active year/supervisor filter; those filters only affect the browse
  list below.
- **No public write access** — teachers can only search; only Admin
  (password-gated) can change the sheets.
- **Sheet columns**: Topics = `Topic | Academic Year | Supervisor |
  Research Link | Abstract`, Teachers = `No | Name | Email` (the `No`
  column is a self-numbering `=ROW()-1` formula).
- **Icons** are generated, not an official crest — swap in your own
  anytime at the same filenames/sizes (192/512/180px).
- **Kurdish text** is written in a formal, professional register, but I'd
  still get a native speaker on staff to proofread before it goes
  department-wide.

## Possible future additions (not built, just ideas)

- Export the Topics table to Excel/CSV from Admin.
- A quick filter for "needs enrichment" — topics still missing an abstract
  or research link.
- Dark mode toggle.
