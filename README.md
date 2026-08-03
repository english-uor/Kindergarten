# Library of Kindergarten Research — کتێبخانەی توێژینەوەی بەشی باخچەی منداڵان

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

## 1. Deploy the backend (Google Apps Script)

1. Go to [script.google.com](https://script.google.com) → **New project**.
2. Delete the default content and paste in your `code.gs`.
3. **Deploy → New deployment → Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Approve the permissions prompt (Sheets + Gmail) when it appears.
4. Copy the `/exec` URL. The Sheet (Topics + Teachers tabs) auto-creates
   itself the first time anyone opens the app or you open Admin.

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

All flat, no subfolders:

- `index.html` — the entire app: markup, styles, and JavaScript.
- `manifest.webmanifest`, `sw.js` — PWA support.
- `favicon.ico`, `favicon-16.png`, `favicon-32.png`, `apple-touch-icon.png`,
  `icon-192.png`, `icon-512.png`, `maskable-512.png` — icons.

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
