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
privacy.html    Plain-language privacy/cookies page, linked from every footer
404.html        Branded not-found page (GitHub Pages serves this automatically
                for any unmatched URL)
robots.txt      Allows crawling, disallows /admin.html, points to sitemap.xml
sitemap.xml     Lists the public pages for search engines
site.webmanifest  "Add to Home Screen" metadata (name, icons, theme color)
sw.js           Service worker — caches the static shell for offline/repeat
                loads, never the live Firestore data (see below)
css/style.css   Shared styles (site + admin)
js/script.js       Mobile nav toggle + active-link highlighting + scroll-reveal
js/cart.js         Order cart (localStorage) + WhatsApp checkout
js/firebase-config.js  Shared Firebase init (client-side config — safe to expose,
                        access is controlled by Firestore security rules)
js/menu-loader.js  Renders the menu page from Firestore (menuCategories + menuItems)
js/promo.js        Daily special banner — shows every special set for today
                    (dailySpecials/{day}/items), not just one
js/site-content.js Fills [data-content-key]/[data-content-href-key]/
                    [data-content-phone-key]/[data-content-map] elements from
                    Firestore (siteContent/main + businessInfo/main)
js/store-status.js Live "Open Now / Closed" badge — computed client-side each
                    minute from businessInfo's structured hours*Time fields
js/analytics.js    Cookie-consent-gated Google Analytics (GA4) — see below
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
- `siteContent/main` (single doc) — every heading/paragraph across Home, Menu, About, and Contact's hero sections, plus the shared footer tagline. See `js/admin.js`'s `CONTENT_GROUPS` for the full field list (grouped by page/section in the admin UI). Deliberately excludes nav labels, button action text, and the cart's EFT/payment warning — those stay fixed in code since they're tied to specific behavior, not just marketing copy.
- `fanFavourites/{id}` (auto-id) — `emoji`, `title`, `desc`, `order`. The "What We're Known For" cards on the home page — a real collection (not a fixed set of siteContent fields) specifically so the admin panel can add or remove cards freely.
- `valueCards/{id}` (auto-id) — same shape as `fanFavourites`, for the About page's value cards, plus an optional `imageUrl` (a real photo/logo takes priority over the emoji when both are set — used for the 100% Halaal card's real SANHA logo). That card was originally hardcoded/non-editable by deliberate design (a certification fact, not marketing copy); reversed per hbadat — it's now just another card in this collection, fully add/edit/delete-able like the rest.
- `businessInfo/main` (single doc) — phone numbers (display text + tel: link + WhatsApp digits), address (two lines), Google Maps/review links, opening hours (3 display lines + 6 structured `hours*Time` fields, see below), email (display text + mailto: link), Mr D Food link, Instagram link. Centralized here specifically because these repeat across the nav, footer, info strip, and contact page on every load — editing one field updates every instance. See `js/admin.js`'s `BUSINESS_FIELDS`.
- `dailySpecials/{monday..saturday}/items/{id}` (no `sunday` — shop is closed) — `item`, `promo`, `price`, `imageUrl`, `order`. Each day is a **subcollection**, not a single doc, so more than one special can run the same day and specials can be added/removed freely — same shape/pattern as `menuItems`. `promo` stays free text (e.g. "10% off") purely for the banner's marketing copy; `price` is the actual number to charge, set directly by the admin (not computed from `promo`), and is what makes the special addable to the cart via `js/cart.js`'s existing `.menu-item-add` mechanism (see `js/promo.js`'s `renderCard()`) — the same WhatsApp checkout every menu item already uses. `price` defaults to `0` (never `undefined`, since Firestore rejects that) when left blank, which is also the signal the frontend uses to skip the "Add to order" button for specials saved before this field existed — they stay display-only in the banner, same as before. (The old `dailySpecials/{day}` doc itself may still carry legacy top-level `item`/`promo`/`imageUrl` fields from before this changed — harmless, unread by any current code once migrated, see below.)

**Security rules** (Firestore only): public read, write requires `request.auth != null`. Since there's only one admin account, that's sufficient — no roles/claims needed. Rules aren't stored in this repo; they're set directly in the Firebase console (Firestore Database → Rules). The wildcard rule (`match /{document=**}`) already covers new collections/subcollections (`fanFavourites`, `valueCards`, `dailySpecials/{day}/items`) with no changes needed.

**Admin panel** (`/admin.html`, not linked from the public nav): email/password login (Firebase Auth, one account created directly in the Firebase console under Authentication → Users), then four tabs mirroring the site's own page structure — **Home** (hero/reviews/footer site text, then Fan Favourites cards), **Menu** (menu hero text, then Menu Items — edit name/price/description per item, upload a photo to Cloudinary, add/delete items — then Daily Specials), **About** (about-page site text, then Value Cards including the 100% Halaal card), **Contact** (contact hero text, then Business Info — the centralized phone/address/hours/email/links). Each site-text group saves independently. Fan Favourites and Value Cards share `js/admin.js`'s `makeCardCollectionEditor()` factory (add/edit/delete cards, identical shape). `CONTENT_GROUPS` (in `js/admin.js`) drives the site-text sections; each group carries a `page` field used to route it into the right tab, but `data-group-index` on the rendered element always points at the group's position in the single global array, so `saveContentGroup()` doesn't need to know which tab it was rendered from. An "Import Starter Data" button appears only when `menuCategories` is empty, so it can't accidentally be re-run over real edits later.

**Two safe-migration mechanisms run quietly on every admin login, in `loadEverything()`:**
- `fillMissingContentDefaults()` — fills in any `SITE_CONTENT`/`BUSINESS_INFO` field that doesn't exist yet in Firestore (e.g. a field added after the site was already seeded once). Never touches a key that already exists, so a real edit can never be overwritten by a default.
- `migrateFixedSiteContentCards()` / `migrateDailySpecialsIfNeeded()` — one-time moves from the old fixed-shape data (a set number of `fanFav*`/`value*` siteContent fields; one special per day) into the new collections above, run only if the new collection/subcollection is still empty so a real edit made after migrating once is never overwritten. This is how the real Fan Favourites, Value Cards, and Daily Specials content that existed before this feature shipped gets carried forward automatically — see "One-time activation" note below.

**Public pages:** `menu.html` fetches `menuCategories`+`menuItems` on load and builds the same markup/classes the static version used to hand-author, so `css/style.css` and `js/cart.js` (which listens for `.menu-item-add` clicks via delegation on `document`) work unchanged. Every other page fetches `siteContent/main` + `businessInfo/main` and fills any element carrying one of `site-content.js`'s data attributes (text, href, phone, the map embed src) — falling back to the page's existing static content **only if the field has never been set at all** (the key doesn't exist in Firestore yet). If the admin has actively edited a field to be blank on purpose (key exists, empty value — e.g. removing an address "Line 2" that doesn't apply), that's respected: the element is cleared and hidden entirely, rather than silently keeping old static text forever because an empty string reads as falsy. A `data-sep-for="fieldName"` attribute on a separator element (used once, the ", " between address line 1 and 2 on the contact page) hides that separator in tandem. `site-content.js` also renders `#fanFavGrid` (home page) and `#valueCardsWrap` (about page) from the `fanFavourites`/`valueCards` collections the same way — **if a collection is empty, the page's existing static fallback cards are left exactly as they are**, so there's no visual regression before the one-time migration above has run.

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

## Analytics & cookie consent

Google Analytics (GA4, measurement ID `G-RYYWS16PFL`) is wired up in `js/analytics.js`, but **nothing loads until a visitor clicks "Accept"** on the cookie banner shown once per browser (bottom of every public page, not admin.html). Decline — or just ignoring the banner — means zero tracking scripts run and zero cookies get set. The choice is remembered in `localStorage` (`bnb_cookie_consent`) so returning visitors aren't asked again.

- **Conversion tracking**: `js/cart.js` fires a GA4 `order_via_whatsapp` event (with the order's ZAR value) whenever someone actually sends an order — this is what answers "how many visitors are converting into orders," not just page views.
- **Why gate it at all**: GA4 sets tracking cookies, and South Africa's POPIA (similar to GDPR) generally expects consent before that happens — so this only ever tracks visitors who said yes.
- `privacy.html` (linked from every footer) explains this in plain language — what's tracked, what isn't, and how to reset the choice.
- The floating cart button and menu page's "back to top" button both shift up automatically while the cookie banner is showing (`--cookie-banner-offset` CSS variable, set in `js/analytics.js`) so nothing overlaps at any screen size.

## Menu search

The menu's search box (`#menuSearch` in `menu.html`, logic in `js/menu-loader.js`) filters items by name and description as you type. The sidebar hides while a search is active (category navigation doesn't apply to a filtered list) and reappears when the search is cleared. Filtering uses a dedicated `.menu-search-hide { display: none !important }` class rather than the `[hidden]` attribute — `.menu-item` and `.menu-sidebar` both set their own `display`, which silently overrides the browser's default `[hidden]` behavior (the same bug class as the promo-photo fix earlier in this file's history).

## Offline support (service worker)

`sw.js` caches the static shell — every public HTML page, `css/style.css`, the public JS files, and the icon/logo images — for instant repeat loads and basic offline browsing. Registered from `js/script.js` after `window.load`, so it never competes with a page's own initial load.

**`admin.html` is explicitly excluded in the fetch handler itself, not just by omission.** `admin.html` doesn't load `js/script.js`, but that alone isn't enough: this service worker's scope covers the whole site (it lives at the repo root), and `clients.claim()` in the `activate` handler means it takes control of *every* same-origin page — including `admin.html` — the moment a visitor has loaded any other page first, regardless of whether `admin.html` ever registered it itself. `navigator.serviceWorker.controller` being non-null there is unavoidable and harmless; what actually matters is that `admin.html`, `js/admin.js`, and `js/seed-data.js` are never cached or served from cache — the fetch handler bypasses them by URL before any caching logic runs, verified by confirming `fromServiceWorker: false` on every response for both files, on first load and reload, after first visiting the homepage (the realistic order any real owner would hit).

**Deliberately never caches Firestore data.** The menu, daily specials, and "Open Now" badge always fetch fresh from the network; if there's genuinely no connection, the page just shows its existing "menu is loading" fallback rather than risking stale prices or a wrong open/closed status being shown as if it were current.

**Everything — HTML pages and CSS/JS/images alike — is network-first.** A visitor with a connection always gets the latest deploy; the cache is only ever read from as an offline fallback. Verified directly — edited a page, reloaded while "online" in a test, confirmed the fresh content won and the cache updated to match (not the reverse).

CSS/JS/images were originally stale-while-revalidate instead (serve the cached copy instantly, refetch in the background for next time), for a snappier repeat load. **That was the wrong tradeoff and caused a real incident**: a genuine bug fix to `site-content.js` (the address "Line 2" not disappearing when blanked — see git history) checked out correctly in every fresh test, but a real returning visitor's browser kept running the pre-fix code for one more load — their first load after the deploy still served the old, broken `site-content.js` straight from cache, with the fix only downloading silently in the background for their *next* load. Switched to network-first for these too once this surfaced; a few milliseconds of "instant from cache" isn't worth "a shipped fix doesn't actually take effect for a page load or two."

To force a cache reset after a future change to what gets precached, bump `CACHE_NAME` in `sw.js` (currently `bnb-shell-v2`) — the old cache is deleted automatically on activate.

## One-time activation: Fan Favourites, Value Cards, Daily Specials

These three moved from a fixed shape (a set number of siteContent fields; one special per day) to real collections the admin panel can freely add to or remove from. Migrating the real content that existed before this change happens automatically, once, the next time the owner logs into `/admin.html` (`migrateFixedSiteContentCards()` / `migrateDailySpecialsIfNeeded()` in `js/admin.js`, called from `loadEverything()`) — confirmed live: Fan Favourites (4 cards), Value Cards (3 cards), and all 6 days of specials (including both existing special photos) have already migrated correctly, with zero visual change on any public page while it was pending.

**The Halaal card needs one more admin login.** It was added to the `valueCards` collection *after* the above had already migrated on this site, so `migrateFixedSiteContentCards()`'s "only run if the collection is still empty" guard won't fire again for it. A separate, independently-gated migration (`migrateHalaalCardIfNeeded()` — checks specifically for a card with the Halaal logo's `imageUrl`, not whether the collection is empty) backfills it in on the next login instead. Until then, the About page correctly keeps showing all 4 real cards (3 dynamic + the Halaal one, still from the static fallback) exactly as before — this was confirmed by tracing the actual live cause of an apparent "missing card" report: the other 3 cards really had already gone dynamic (fetched from Firestore, replacing the static fallback), just without Halaal yet, which is why it disappeared from that render pass specifically rather than all 4 vanishing or none.

## Still placeholder — replace once real content is decided

- **Menu items, prices & photos**: seeded from the physical menu boards (see `js/seed-data.js`) with no photos yet — add real food photos per item via the admin panel's "Change photo" upload.
- **Daily specials**: seeded with example promotions (real items, made-up discounts) — replace via the admin panel's Daily Specials tab once real weekly promotions are decided. Multiple specials per day and per-special photos are both supported now.
- **Reviews section**: still just links out to Google ("Read Our Reviews" / "Leave A Review") rather than showing real review quotes on the page — needs actual customer reviews picked before adding, not something to fabricate.
- **OG share image**: `images/og-image.png` is logo-only (no real food photo exists yet) — worth swapping for a real hero food shot once photography is done.

## Automated checks

`.github/workflows/checks.yml` runs on every push/PR to `main`: JS syntax check on every file in `js/` + `sw.js`, and `scripts/check_site.py` (broken internal `href`/`src` references, `site.webmanifest`/JSON-LD/`sitemap.xml` well-formedness). Deliberately scoped to zero-noise checks — no generic HTML linter, since this project intentionally uses patterns (inline `style` attributes, etc.) that a strict default linter config would flag as style nitpicks rather than real problems. A failure here always means something worth fixing, never something to argue with or suppress. Run it locally any time with `python3 scripts/check_site.py`.

## Deploying

Already live on GitHub Pages (see top of this file) — push to `main` and it redeploys automatically within a minute or two. The Firebase project and Cloudinary account have no separate deploy step — changes via the admin panel (or the Firebase/Cloudinary consoles directly) take effect immediately, live.

If you ever want to move the static pages off GitHub Pages:

- **Netlify / Vercel**: drag-and-drop the folder, or connect the git repo
- Any standard web host / cPanel — just upload the files
