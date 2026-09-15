# Burgers N Beyond

Marketing + ordering website for Burgers N Beyond, a takeaway burger restaurant. Plain HTML/CSS/JS (no build step) for the pages themselves, with **Firebase** (Firestore + Auth) powering the menu, daily specials, and some site text, and **Cloudinary** hosting menu photo uploads — so the owner can edit all of it directly without touching code.

**Live at:** https://hussainbadat10.github.io/burgers-and-beyond/ (deployed via GitHub Pages, auto-updates on every push to `main`)

## Structure

```
index.html      Home page — hero, Fan Favourites, Reviews: all editable via admin
menu.html       Full menu — loaded live from Firestore, sticky category sidebar
                (horizontal chips on mobile) + a 2-column item grid
about.html      Restaurant story — hero, story paragraphs, value cards, CTA: all editable
contact.html    Phone, address, hours, map — all editable via admin
admin.html      Password-protected admin panel (menu, photos, site text, business info, daily specials)
404.html        Branded not-found page (GitHub Pages serves this automatically
                for any unmatched URL)
robots.txt      Allows crawling, disallows /admin.html, points to sitemap.xml
sitemap.xml     Lists the 4 public pages for search engines
site.webmanifest  "Add to Home Screen" metadata (name, icons, theme color)
css/style.css   Shared styles (site + admin)
js/script.js       Mobile nav toggle + active-link highlighting + scroll-reveal
js/cart.js         Order cart (localStorage) + WhatsApp checkout
js/firebase-config.js  Shared Firebase init (client-side config — safe to expose,
                        access is controlled by Firestore security rules)
js/menu-loader.js  Renders the menu page from Firestore (menuCategories + menuItems)
js/promo.js        Daily special banner, reads today's slot from Firestore
js/site-content.js Fills [data-content-key]/[data-content-href-key]/
                    [data-content-phone-key]/[data-content-map] elements from
                    Firestore (siteContent/main + businessInfo/main)
js/store-status.js Live "Open Now / Closed" badge — computed client-side each
                    minute from businessInfo's structured hours*Time fields
js/seed-data.js    One-time starter data (the original real menu/text/business
                    info), used by admin.html's "Import Starter Data" button
js/admin.js        Admin panel logic (auth, CRUD, photo upload, seeding)
images/         Logo + real photos go here (see below)
```

## Firebase + Cloudinary architecture

**Firebase project:** `burgers-n-beyond-b15a1` (Firestore + Authentication, Spark/free plan — deliberately NOT using Firebase Storage, since Google now requires the paid Blaze plan, a card on file, just to enable it).

**Cloudinary account:** cloud name `ys741dda`, unsigned upload preset `BnB_Menu` — used only for menu item photo uploads (see `js/admin.js`'s `uploadItemPhoto`). Free tier, no card required. An unsigned preset lets the admin panel upload directly from the browser without exposing any Cloudinary secret.

**Data model (Firestore):**
- `menuCategories/{categoryId}` — `name`, `emoji`, `note`, `order`, optional `comboCallout` (HTML string) and `dividerBefore` ({eyebrow, title, note} — used once, before "Streetbox Meals", to render the "Sharing Meals" section divider)
- `menuItems/{itemId}` (auto-id) — `categoryId`, `name`, `price` (number), `description`, `imageUrl` (a Cloudinary URL), `order`
- `siteContent/main` (single doc) — every heading/paragraph/card across Home, Menu, About, and Contact's hero sections, plus the shared footer tagline. See `js/admin.js`'s `CONTENT_GROUPS` for the full field list (grouped by page/section in the admin UI). Deliberately excludes nav labels, button action text, and the cart's EFT/payment warning — those stay fixed in code since they're tied to specific behavior, not just marketing copy.
- `businessInfo/main` (single doc) — phone numbers (display text + tel: link + WhatsApp digits), address (two lines), Google Maps/review links, opening hours (3 display lines + 6 structured `hours*Time` fields, see below), email (display text + mailto: link), Mr D Food link, Instagram link. Centralized here specifically because these repeat across the nav, footer, info strip, and contact page on every load — editing one field updates every instance. See `js/admin.js`'s `BUSINESS_FIELDS`.
- `dailySpecials/{monday..saturday}` (no `sunday` — shop is closed) — `item`, `promo`

**Security rules** (Firestore only): public read, write requires `request.auth != null`. Since there's only one admin account, that's sufficient — no roles/claims needed. Rules aren't stored in this repo; they're set directly in the Firebase console (Firestore Database → Rules). The wildcard rule (`match /{document=**}`) already covers new collections like `businessInfo` with no changes needed.

**Admin panel** (`/admin.html`, not linked from the public nav): email/password login (Firebase Auth, one account created directly in the Firebase console under Authentication → Users), then four tabs — **Menu** (edit name/price/description per item, upload a photo to Cloudinary, add/delete items), **Site Text** (grouped by page, each group saves independently), **Business Info** (the centralized phone/address/hours/email/links), **Daily Specials** (one row per weekday). An "Import Starter Data" button appears only when `menuCategories` is empty, so it can't accidentally be re-run over real edits later. Whenever new fields are added to `SITE_CONTENT`/`BUSINESS_INFO` in `js/seed-data.js` after the site's already been seeded once, `fillMissingContentDefaults()` (runs quietly on every admin login) fills in just the missing keys — it never touches a key that already exists, so a real edit is never overwritten by a default.

**Public pages:** `menu.html` fetches `menuCategories`+`menuItems` on load and builds the same markup/classes the static version used to hand-author, so `css/style.css` and `js/cart.js` (which listens for `.menu-item-add` clicks via delegation on `document`) work unchanged. Every other page fetches `siteContent/main` + `businessInfo/main` and fills any element carrying one of `site-content.js`'s four data attributes (text, href, the cart's WhatsApp `data-phone`, or the contact page's map embed src, built from the address fields) — falling back to the page's existing static content if a field has no value yet or the fetch fails.

## Brand

- **Palette**: black (`#141414`), cheese yellow (`#ffd400`), and a blue accent (`#2f8fe0`) taken from the "N" in the logo — yellow appears on dark surfaces (header, footer, hero, buttons), blue appears on light surfaces (eyebrows, prices, hover states).
- **Type**: 'Luckiest Guy' for the hero headline and nav wordmark (matches the logo's bold sticker-style lettering), 'Baloo 2' for other headings, 'Inter' for body text — all via Google Fonts.
- **Logo**: `images/logo.png` is the full circular badge (background removed from the original `images/BNB logo.jpeg`, kept as the source). It's only legible at large sizes, so the nav/footer use `images/icon.png` instead — a square crop of just the burger mark from the same badge, paired with the text wordmark. `images/favicon.png` is the same burger-mark crop, set as the browser tab icon in every page's `<head>`. `images/apple-touch-icon.png` (180×180) and `images/icon-192.png` are resized copies of the same crop for "Add to Home Screen".

## SEO & link sharing

- Every public page has Open Graph + Twitter Card meta tags, so pasting a link into WhatsApp/Facebook/iMessage unfurls into a branded card instead of a bare link — the image used is `images/og-image.png` (1200×630, generated from the logo + brand colours, not a real food photo since none exist yet — swap it for a real hero shot once photos are in).
- `index.html` carries `schema.org/Restaurant` JSON-LD (address, phone, hours, price range, cuisine) built entirely from the real business info already in this README — update it if any of those facts change.
- `robots.txt` + `sitemap.xml` cover the 4 public pages; `admin.html` is excluded from both and already carries `noindex, nofollow`.

## Running locally

No build tools needed for the static pages. Either:

- Open `index.html` directly in a browser, or
- Serve it locally so relative paths behave exactly like production:
  ```bash
  npx serve .
  # or
  python3 -m http.server 8000
  ```

The Firebase-backed pages (menu, admin, and the editable text on home/about) need real network access to Firebase's CDN and the live project either way — there's nothing to run locally for that part.

## Real business details (live, editable via admin's Business Info tab)

- **Phone**: 082 514 0077 and 082 421 1750 (both listed everywhere a phone number appears — nav, hero, footer, info strip, contact page, checkout)
- **Address**: 80 Main Reef Rd, Randfontein, 1760 (Google Maps place link, used for address links, "Get Directions", and "Read Our Reviews")
- **Email**: Burgersnbeyondsa@gmail.com
- **Opening hours**: Mon–Sat 10:00–18:30, closed Fridays 12:20–13:20, closed Sundays

Editing any of the above in the admin panel updates every place it appears, site-wide — no code changes needed.

## Live "Open Now / Closed" badge

Shows next to the "Opening Hours" heading on the home page and contact page (`js/store-status.js`), computed client-side from real time — no server/cron needed. Recomputes every 60 seconds so it flips automatically right at opening/closing time, and shows a detail line ("Closes at 6:30PM" / "Opens tomorrow at 10AM" / "Opens today at 1:20PM" for Friday's midday break).

Deliberately reads a **separate set of structured fields**, not the free-text `hoursMonSat`/`hoursFri`/`hoursSun` display lines: `hoursMonSatOpenTime`, `hoursMonSatCloseTime`, `hoursFriOpenTime1`, `hoursFriCloseTime1`, `hoursFriOpenTime2`, `hoursFriCloseTime2` (all `HH:MM` 24-hour, edited via native time pickers in the admin panel's Business Info tab). Keeping these separate from the display text means editing the wording of the hours (e.g. rephrasing the Friday line) can never silently break the badge, and vice versa.

**One-time activation step:** these 6 fields didn't exist in the live database before this feature shipped, and there's no way to backfill them without real admin credentials — they'll appear automatically (via `fillMissingContentDefaults()`) the **next time the owner logs into `/admin.html`**, pre-filled with the current real hours. Until then, the badge silently stays hidden rather than showing anything — it never guesses.

## Still placeholder — replace once real content is decided

- **Menu items, prices & photos**: seeded from the physical menu boards (see `js/seed-data.js`) with no photos yet — add real food photos per item via the admin panel's "Change photo" upload.
- **Daily specials**: seeded with example promotions (real items, made-up discounts) — replace via the admin panel's Daily Specials tab once real weekly promotions are decided (photos can be added there too now).
- **Reviews section**: still just links out to Google ("Read Our Reviews" / "Leave A Review") rather than showing real review quotes on the page — needs actual customer reviews picked before adding, not something to fabricate.
- **OG share image**: `images/og-image.png` is logo-only (no real food photo exists yet) — worth swapping for a real hero food shot once photography is done.

## Deploying

Already live on GitHub Pages (see top of this file) — push to `main` and it redeploys automatically within a minute or two. The Firebase project and Cloudinary account have no separate deploy step — changes via the admin panel (or the Firebase/Cloudinary consoles directly) take effect immediately, live.

If you ever want to move the static pages off GitHub Pages:

- **Netlify / Vercel**: drag-and-drop the folder, or connect the git repo
- Any standard web host / cPanel — just upload the files
