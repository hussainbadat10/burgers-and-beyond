# Burgers N Beyond

Marketing + ordering website for Burgers N Beyond, a takeaway burger restaurant. Plain HTML/CSS/JS (no build step) for the pages themselves, with **Firebase** (Firestore + Auth + Storage) powering the menu, daily specials, and some site text so the owner can edit them directly without touching code.

**Live at:** https://hussainbadat10.github.io/burgers-and-beyond/ (deployed via GitHub Pages, auto-updates on every push to `main`)

## Structure

```
index.html      Home page (hero headline/intro editable via admin)
menu.html       Full menu — loaded live from Firestore, collapsible by category
about.html      Restaurant story (3 story paragraphs editable via admin)
contact.html    Phone, address, hours, map
admin.html      Password-protected admin panel (menu, photos, site text, daily specials)
css/style.css   Shared styles (site + admin)
js/script.js       Mobile nav toggle + active-link highlighting + scroll-reveal
js/cart.js         Order cart (localStorage) + WhatsApp checkout
js/firebase-config.js  Shared Firebase init (client-side config — safe to expose,
                        access is controlled by Firestore/Storage security rules)
js/menu-loader.js  Renders the menu page from Firestore (menuCategories + menuItems)
js/promo.js        Daily special banner, reads today's slot from Firestore
js/site-content.js Fills [data-content-key] elements from Firestore siteContent/main
js/seed-data.js    One-time starter data (the original real menu/text), used by
                    admin.html's "Import Starter Data" button
js/admin.js        Admin panel logic (auth, CRUD, photo upload, seeding)
images/         Logo + real photos go here (see below)
```

## Firebase architecture

**Project:** `burgers-n-beyond-b15a1` (Firestore + Authentication + Storage, Spark/free plan).

**Data model:**
- `menuCategories/{categoryId}` — `name`, `emoji`, `note`, `order`, optional `comboCallout` (HTML string) and `dividerBefore` ({eyebrow, title, note} — used once, before "Streetbox Meals", to render the "Sharing Meals" section divider)
- `menuItems/{itemId}` (auto-id) — `categoryId`, `name`, `price` (number), `description`, `imageUrl`, `order`
- `siteContent/main` (single doc) — `heroHeadline`, `heroSub`, `aboutIntro`, `aboutBelieve`, `aboutTakeaway`
- `dailySpecials/{monday..saturday}` (no `sunday` — shop is closed) — `item`, `promo`

**Security rules** (Firestore + Storage): public read, write requires `request.auth != null`. Since there's only one admin account, that's sufficient — no roles/claims needed. Rules aren't stored in this repo; they're set directly in the Firebase console (Firestore Database → Rules, and Storage → Rules).

**Admin panel** (`/admin.html`, not linked from the public nav): email/password login (Firebase Auth, one account created directly in the Firebase console under Authentication → Users), then three tabs — Menu (edit name/price/description per item, upload a photo, add/delete items), Site Text (the 5 fields above), Daily Specials (one row per weekday). An "Import Starter Data" button appears only when `menuCategories` is empty, so it can't accidentally be re-run over real edits later.

**Public pages:** `menu.html` fetches `menuCategories`+`menuItems` on load and builds the same markup/classes the static version used to hand-author, so `css/style.css` and `js/cart.js` (which listens for `.menu-item-add` clicks via delegation on `document`) work unchanged. `index.html`/`about.html` fetch `siteContent/main` and fill any `[data-content-key]` element, falling back to the page's existing static text if Firestore has no value yet or the fetch fails.

## Brand

- **Palette**: black (`#141414`), cheese yellow (`#ffd400`), and a blue accent (`#2f8fe0`) taken from the "N" in the logo — yellow appears on dark surfaces (header, footer, hero, buttons), blue appears on light surfaces (eyebrows, prices, hover states).
- **Type**: 'Luckiest Guy' for the hero headline and nav wordmark (matches the logo's bold sticker-style lettering), 'Baloo 2' for other headings, 'Inter' for body text — all via Google Fonts.
- **Logo**: not yet dropped in — the nav/footer currently fall back to styled text ("Burgers **N** Beyond"). Add the real logo file to `images/` and wire it into `.nav-logo` / `.footer-logo` in each HTML file (swap the text for an `<img>` tag) plus set it as the favicon.

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

## Real business details (live)

- **Phone**: 082 514 0077 and 082 421 1750 (both listed everywhere a phone number appears — nav, hero, footer, contact page)
- **Address**: 80 Main Reef Rd, Randfontein, 1760 (Google Maps link: https://maps.app.goo.gl/YxGaBvXBSbbE6kD96)
- **Email**: Burgersnbeyondsa@gmail.com
- **Opening hours**: Mon–Sat 10:00–18:30, closed Fridays 12:20–13:20, closed Sundays

## Still placeholder — replace once real content is decided

- **Menu items, prices & photos**: seeded from the physical menu boards (see `js/seed-data.js`) with no photos yet — add real food photos per item via the admin panel's "Change photo" upload.
- **Daily specials**: seeded with example promotions (real items, made-up discounts) — replace via the admin panel's Daily Specials tab once real weekly promotions are decided.
- **Logo**: see "Brand" above.

## Deploying

Already live on GitHub Pages (see top of this file) — push to `main` and it redeploys automatically within a minute or two. The Firebase project itself has no separate deploy step — Firestore/Auth/Storage changes (via the admin panel or the Firebase console) take effect immediately, live.

If you ever want to move the static pages off GitHub Pages:

- **Netlify / Vercel**: drag-and-drop the folder, or connect the git repo
- Any standard web host / cPanel — just upload the files
