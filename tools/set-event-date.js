#!/usr/bin/env node
/**
 * set-event-date.js — the SINGLE SOURCE OF TRUTH for the event date.
 *
 * The Oregon Tour de Outback is a one-anchor event: everything keys off RIDE DAY.
 * Change the one line below, run this script, and every date across the site
 * (schedule day headers, the weekend range, the hero, all "Join us …" CTAs, the
 * countdown timer, the JSON-LD structured data, the chatbot's knowledge, the shop
 * receipt footer, and the volunteer-waiver window) is recomputed by its offset
 * from ride day and rewritten in place — as plain static text, so SEO/crawlers
 * still see the real dates (no runtime/JS date rendering).
 *
 *   ┌───────────────────────────────────────────────────────────────┐
 *   │  To move the event: change RIDE_DAY below, then run:           │
 *   │      node tools/set-event-date.js                              │
 *   │  Then deploy:  firebase deploy --only hosting,functions        │
 *   └───────────────────────────────────────────────────────────────┘
 *
 * Derived days (all relative to ride day):
 *   Ride day        = RIDE_DAY            (Saturday)  — e.g. "June 26, 2027"
 *   Day before      = RIDE_DAY − 1        (Friday)    — schedule
 *   Weekend range   = [RIDE_DAY−1 … RIDE_DAY]         — schedule tagline
 *   Volunteer window= [RIDE_DAY−3 … RIDE_DAY+1]       — waiver (setup → teardown)
 *
 * Flags:
 *   --dry-run            Show what would change; write nothing.
 *   --date=YYYY-MM-DD    Use this ride day for the run (and, unless --dry-run,
 *                        persist it as the new RIDE_DAY). Handy for previewing.
 *
 * How it stays exact: the script remembers the LAST date it applied. A run
 * replaces the fully-formed OLD date strings with the NEW ones — no fuzzy prose
 * parsing — so it can never half-match. After a real run it rewrites RIDE_DAY and
 * LAST_APPLIED at the top of this file to the new value.
 */

'use strict';
const fs = require('fs');
const path = require('path');

// ===== THE ONE LINE TO CHANGE EACH YEAR ====================================
const RIDE_DAY = '2027-06-26';
// ===========================================================================
// (auto-managed — do not hand-edit) the date this script last wrote:
const LAST_APPLIED = '2027-06-26';

const REPO = path.resolve(__dirname, '..');
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December'];

// --- date math (UTC to avoid timezone drift) -------------------------------
function parse(iso) { const p = iso.split('-').map(Number); return Date.UTC(p[0], p[1] - 1, p[2]); }
function addDays(ms, n) { return ms + n * 86400000; }
function parts(ms) { const d = new Date(ms); return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate() }; }
function longDate(ms) { const p = parts(ms); return MONTHS[p.m] + ' ' + p.d + ', ' + p.y; }
function monthDay(ms) { const p = parts(ms); return MONTHS[p.m] + ' ' + p.d; }
function isoDate(ms) { const p = parts(ms); return p.y + '-' + String(p.m + 1).padStart(2, '0') + '-' + String(p.d).padStart(2, '0'); }
function rangeStr(aMs, bMs, dash) {
  const a = parts(aMs), b = parts(bMs);
  if (a.m === b.m && a.y === b.y) return MONTHS[a.m] + ' ' + a.d + dash + b.d + ', ' + b.y;
  return MONTHS[a.m] + ' ' + a.d + dash + MONTHS[b.m] + ' ' + b.d + ', ' + b.y;
}

// Every date form the site uses, derived from a single ride-day ISO string.
function forms(rideISO) {
  const r = parse(rideISO);
  return {
    rideLong: longDate(r),                                   // "June 26, 2027"
    dayBeforeLong: longDate(addDays(r, -1)),                 // "June 25, 2027"
    weekend: rangeStr(addDays(r, -1), r, '-'),               // "June 25-26, 2027"
    startDT: isoDate(r) + 'T07:00:00-07:00',                 // countdown + JSON-LD start
    endDT: isoDate(r) + 'T18:00:00-07:00',                   // JSON-LD end
    waiverRange: rangeStr(addDays(r, -3), addDays(r, 1), '–'),         // "June 23–27, 2027"
    waiverBetween: 'between ' + monthDay(addDays(r, -3)) + ' and ' + longDate(addDays(r, 1)), // "between June 23 and June 27, 2027"
    yearBanner: 'Oregon Tour de Outback ' + parts(r).y + ' &middot;',       // waiver banner year
  };
}

// Ordered old→new pairs (most specific first so nothing half-matches).
function replacements(oldISO, newISO) {
  const o = forms(oldISO), n = forms(newISO);
  return [
    ['endDT', o.endDT, n.endDT],
    ['startDT (countdown/JSON-LD)', o.startDT, n.startDT],
    ['waiver window', o.waiverRange, n.waiverRange],
    ['weekend range', o.weekend, n.weekend],
    ['waiver "between …"', o.waiverBetween, n.waiverBetween],
    ['day before (Friday)', o.dayBeforeLong, n.dayBeforeLong],
    ['ride day', o.rideLong, n.rideLong],
    ['waiver banner year', o.yearBanner, n.yearBanner],
  ].filter(function (p) { return p[1] !== p[2]; });
}

// Files to scan: every .html in the repo (minus vendored/irrelevant dirs) plus
// the specific JS/backend files that embed the date. Email Blasts and blog
// datePublished are intentionally excluded (historical, not the live event date).
const EXCLUDE_DIRS = new Set(['node_modules', '.git', 'Email Blasts']);
function walkHtml(dir, out) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const rel = path.relative(REPO, full);
    if (fs.statSync(full).isDirectory()) {
      if (EXCLUDE_DIRS.has(name) || rel.split(path.sep).includes('node_modules')) continue;
      walkHtml(full, out);
    } else if (name.endsWith('.html')) {
      out.push(full);
    }
  }
  return out;
}
function fileList() {
  const files = walkHtml(REPO, []);
  ['js/main.js', 'js/main.min.js', 'functions/index.js', 'functions/shop-receipt.js']
    .forEach(function (f) { const p = path.join(REPO, f); if (fs.existsSync(p)) files.push(p); });
  return files;
}

// --- run -------------------------------------------------------------------
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const dateArg = (args.find(function (a) { return a.startsWith('--date='); }) || '').split('=')[1];
const newISO = dateArg || RIDE_DAY;
const oldISO = LAST_APPLIED;

if (!/^\d{4}-\d{2}-\d{2}$/.test(newISO)) {
  console.error('Invalid ride day "' + newISO + '". Use YYYY-MM-DD.');
  process.exit(1);
}

console.log('Ride day: ' + forms(oldISO).rideLong + '  ->  ' + forms(newISO).rideLong + (dryRun ? '   [DRY RUN]' : ''));

const pairs = replacements(oldISO, newISO);
if (!pairs.length) {
  console.log('\nAll dates already in sync — nothing to change.');
  process.exit(0);
}
console.log('\nDerived changes:');
pairs.forEach(function (p) { console.log('  ' + p[0].padEnd(28) + '"' + p[1] + '"  ->  "' + p[2] + '"'); });

function countOcc(s, sub) { return sub ? s.split(sub).length - 1 : 0; }

let totalHits = 0, filesChanged = 0;
const report = [];
fileList().forEach(function (file) {
  let text = fs.readFileSync(file, 'utf8');
  let hits = 0;
  pairs.forEach(function (p) {
    const n = countOcc(text, p[1]);
    if (n > 0) { text = text.split(p[1]).join(p[2]); hits += n; }
  });
  if (hits > 0) {
    report.push('  ' + path.relative(REPO, file) + '  (' + hits + ')');
    totalHits += hits; filesChanged++;
    if (!dryRun) fs.writeFileSync(file, text);
  }
});

console.log('\n' + (dryRun ? 'Would update' : 'Updated') + ' ' + totalHits + ' date(s) across ' + filesChanged + ' file(s):');
console.log(report.join('\n') || '  (none)');

// Persist the new anchor into this script (skip on dry-run).
if (!dryRun && newISO !== LAST_APPLIED) {
  let self = fs.readFileSync(__filename, 'utf8');
  self = self.replace(/const RIDE_DAY = '[^']*';/, "const RIDE_DAY = '" + newISO + "';");
  self = self.replace(/const LAST_APPLIED = '[^']*';/, "const LAST_APPLIED = '" + newISO + "';");
  fs.writeFileSync(__filename, self);
  console.log('\nAnchor persisted: RIDE_DAY = ' + newISO);
}
if (!dryRun) {
  console.log('\nNext: firebase deploy --only hosting,functions   (functions only needed if the chatbot/receipt date changed)');
}
