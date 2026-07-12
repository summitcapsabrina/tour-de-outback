# Tour de Outback — Project Guide

## What This Is
Website for the **Oregon Tour de Outback** cycling event (June 26, 2027, Lakeview, OR). Hosted on **Firebase Hosting** at **www.tourdeoregon.com** (project `oregon-tour-de-outback`; `.web.app` alias always live). Repo: `summitcapsabrina/tour-de-outback`.

## Tech Stack
- Pure HTML5, CSS3, vanilla JavaScript — no frameworks, no build tools
- **Firebase Hosting** for the site + **Cloud Functions v2** (`functions/index.js`, nodejs22) for the `/api/**` backend; Firestore + Firebase Auth. Project: `oregon-tour-de-outback`. **GitHub Pages is retired** — do NOT `git push` to deploy (it would serve broken `/api` pages).
- Google Fonts: Oswald (headings), Open Sans (body)
- Google Analytics: `G-959LC5LDBS`
- In-house AI support chat ("Sabrina") replaced the old Tawk.to widget

## File Structure
```
/
├── index.html              # Homepage — hero, countdown, route cards, newsletter, sponsors
├── routes/index.html       # Routes — app switcher (RideWithGPS/Strava/MapMyRide/Komoot), 5 route sections
├── schedule/index.html     # Event schedule — day-by-day grid
├── about/index.html        # About — history, SAR partnership, photo gallery
├── register/index.html     # Registration — pricing, BikeReg links, FAQ
├── volunteer/index.html    # Volunteer signup
├── shop/index.html         # Shop (currently disabled in nav)
├── blog/index.html         # Blog listing page
├── blog/dark-sky-sanctuary/index.html
├── blog/explore-lakeview/index.html
├── blog/first-gravel-ride/index.html
├── blog/gravel-cycling-fastest-growing-sport/index.html
├── blog/wild-beauty-lake-county/index.html
├── css/styles.css          # Main stylesheet
├── css/styles.min.css      # Minified CSS (regenerate after edits — see below)
├── js/main.js              # Main JavaScript
├── js/main.min.js          # Minified JS (regenerate after edits — see below)
├── images/                 # All site images
├── Email Blasts/           # HTML email templates (not deployed, local only)
├── CNAME                   # Custom domain: www.tourdeoregon.com
├── sitemap.xml             # Sitemap for SEO
├── robots.txt              # Robots file
└── site.webmanifest        # PWA manifest
```

## Branding
- **Primary red:** `#cc0000`
- **White:** `#ffffff`
- **Dark charcoal:** `#222222`
- **Light gray:** `#f5f5f5`
- Logo files: `images/logo-white-red.png`, `images/logo-red-circle.png`, `images/logo-no-bg.png`

## Key Patterns

### Minification
There are NO build tools. CSS and JS are minified with inline Python scripts. **Always regenerate both min files after editing.**

**JS minification** (handles apostrophes in comments correctly — strips comments first, then minifies):
```bash
python3 -c "
import re
with open('js/main.js', 'r') as f:
    code = f.read()
result = []
i = 0
in_single = False
in_double = False
in_template = False
while i < len(code):
    c = code[i]
    if c == '\\\\' and (in_single or in_double or in_template):
        result.append(code[i:i+2])
        i += 2
        continue
    if c == \"'\" and not in_double and not in_template:
        in_single = not in_single
    elif c == '\"' and not in_single and not in_template:
        in_double = not in_double
    elif c == '\`' and not in_single and not in_double:
        in_template = not in_template
    if c == '/' and not in_single and not in_double and not in_template:
        if i + 1 < len(code) and code[i+1] == '/':
            while i < len(code) and code[i] != '\n':
                i += 1
            continue
        elif i + 1 < len(code) and code[i+1] == '*':
            end = code.find('*/', i + 2)
            if end != -1:
                i = end + 2
            else:
                i = len(code)
            continue
    result.append(c)
    i += 1
code = ''.join(result)
parts = re.split(r\"(\\\"[^\\\"]*\\\"|'[^']*'|\`[^\`]*\`)\", code)
minified_parts = []
for j, part in enumerate(parts):
    if j % 2 == 0:
        part = re.sub(r'[ \t]+', ' ', part)
        part = re.sub(r' *\n+ *', '\n', part)
        part = re.sub(r'\n+', '\n', part)
    minified_parts.append(part)
minified = ''.join(minified_parts).strip()
with open('js/main.min.js', 'w') as f:
    f.write(minified)
print('JS minified')
"
```

**Validate JS after minifying:**
```bash
node -e "new Function(require('fs').readFileSync('js/main.min.js','utf8')); console.log('Syntax OK')"
```

**CSS minification:**
```bash
python3 -c "
import re
with open('css/styles.css', 'r') as f:
    css = f.read()
css = re.sub(r'/\*.*?\*/', '', css, flags=re.DOTALL)
css = re.sub(r'\s+', ' ', css)
css = re.sub(r'\s*{\s*', '{', css)
css = re.sub(r'\s*}\s*', '}', css)
css = re.sub(r'\s*;\s*', ';', css)
css = re.sub(r'\s*:\s*', ':', css)
css = re.sub(r'\s*,\s*', ',', css)
css = css.strip()
with open('css/styles.min.css', 'w') as f:
    f.write(css)
print('CSS minified')
"
```

### Event Date — single source of truth (RIDE DAY anchor)
**Never hand-edit event dates across pages.** Every date on the site is derived from one anchor — **RIDE DAY** — and propagated by [tools/set-event-date.js](tools/set-event-date.js). Derived days: day-before/Friday (`RIDE_DAY − 1`), weekend range (`[RIDE_DAY−1 … RIDE_DAY]`), volunteer-waiver window (`[RIDE_DAY−3 … RIDE_DAY+1]`), plus the countdown timer, JSON-LD `startDate`/`endDate`, hero, all "Join us …" CTAs, the chatbot's knowledge (`functions/index.js`), and the shop receipt footer (`functions/shop-receipt.js`).

**To move the event:**
1. Edit the one `const RIDE_DAY = 'YYYY-MM-DD';` line at the top of [tools/set-event-date.js](tools/set-event-date.js).
2. Preview: `node tools/set-event-date.js --dry-run` (or `--dry-run --date=YYYY-MM-DD`). It replaces fully-formed old date strings with new ones (no fuzzy prose matching) and reports every change.
3. Apply: `node tools/set-event-date.js` — rewrites all files and persists the new anchor back into the script.
4. Deploy: `firebase deploy --only hosting,functions` (functions only needed because the chatbot/receipt dates live in Cloud Functions). Re-minify is NOT needed — the script edits `main.js` and `main.min.js` together.

Intentionally NOT touched by the script: blog `datePublished` (historical), `Email Blasts/` (past-event templates), and copyright years.

### Route App Switcher (routes/index.html + js/main.js)
The routes page has a button switcher: RideWithGPS, Strava, MapMyRide, Komoot. Each `.route-row-map` div stores embed URLs/data as `data-*` attributes.

- **RideWithGPS, MapMyRide, Komoot:** Use iframes. URL stored in `data-ridewithgps`, `data-mapmyride`, `data-komoot` attributes. Value `"coming-soon"` shows a placeholder.
- **Strava:** Uses **native Strava embeds** (not iframes). Data stored in `data-strava-id`, `data-strava-token`, `data-strava-hash`. The JS dynamically injects Strava placeholder divs and loads `strava-embeds.com/embed.js`, which handles its own sizing. The `.strava-active` CSS class removes `overflow:hidden` and `max-height` constraints from the map container.

### Weather Widget
Custom weather widget in the navbar fetches from NWS API (api.weather.gov) for Lakeview, OR (42.1888, -120.3458). Shows current temp, wind compass, and expandable 7-day forecast. Data cached in sessionStorage.

### Blog Posts
Each post is in `blog/{slug}/index.html`. Blog listing is in `blog/index.html`. When adding a new post: create the post HTML, add a card to the blog listing, and add the URL to `sitemap.xml`.

Author/editor byline format: `Editor: Marie Tucker`

### Newsletter
EmailOctopus integration. Signup forms use direct EmailOctopus embed code.

### External Services
- **Registration:** BikeReg — `https://www.bikereg.com/tour-de-outback`
- **Live chat:** Tawk.to — widget script at bottom of every page
- **FAQ:** Tawk.to knowledge base — `https://oregontourdeoutback.tawk.help`
- **Email campaigns:** EmailOctopus — merge tags: `{{UnsubscribeURL}}`, `{{SenderInfo}}`, `{{RewardsURL}}`

## Event Details
- **Event:** Oregon Tour de Outback 2027
- **Date:** June 26, 2027 (Ride Day; event weekend June 25–26). To change it, see **Event Date** under Key Patterns — never hand-edit dates across pages.
- **Location:** Lakeview, OR — Lake County Fairgrounds
- **Presented by:** Lake County Chamber of Commerce
- **Beneficiary:** Lake County Search and Rescue
- **Routes:**
  - Road: 40-mile (Easy), 53-mile (Moderate), 105-mile Century (Epic)
  - Gravel: 36-mile (Moderate), 48-mile (Challenging)
- **Registration:** $125 for all categories

## Pending / Known Issues
- Domain switch to tourdeoutback.org — waiting for DNS configuration
- Komoot embeds — waiting for Komoot support response
- Formspree reCAPTCHA setup for contact form
- Google Search Console verification
- Strava mobile embed sizing — the `.strava-active` class with `!important` overrides may need testing
- Clean up unused images in `/images/`

## Deploy Workflow
**Deploy = `firebase deploy` (NOT git push).** GitHub Pages is retired for the domain; a `git push` would serve broken `/api` pages. Firebase CLI is logged in as `info@tourdeoutback.org` (token expires ~hourly → `firebase login --reauth` if a deploy 401s). Project `oregon-tour-de-outback`; live at `www.tourdeoregon.com` (Firebase Hosting) with `oregon-tour-de-outback.web.app` as the always-on alias.
- **Static/frontend only** (HTML/CSS/JS): `firebase deploy --only hosting` — ships the whole repo dir (`public: "."`).
- **Backend changes** (`functions/index.js`): `firebase deploy --only functions` (needs the secrets already set; new secrets fail the deploy).
- **Firestore rules:** `firebase deploy --only firestore:rules`.
- Combine as needed, e.g. `firebase deploy --only functions,hosting,firestore:rules`.
- Remember to re-minify `main.min.js` / `styles.min.css` before deploying frontend JS/CSS changes.
- Git is for source history only (optionally `git push` to back up the source — it does NOT deploy).

**Important:** zsh doesn't like `!` in double-quoted commit messages. Always use single quotes for commit messages containing special characters.
