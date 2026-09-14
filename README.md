# Burgers N Beyond

Static marketing website for Burgers N Beyond, a takeaway burger restaurant. Plain HTML/CSS/JS — no build step, no backend.

**Live at:** https://hussainbadat10.github.io/burgers-and-beyond/ (deployed via GitHub Pages, auto-updates on every push to `main`)

## Structure

```
index.html      Home page
menu.html       Full menu, collapsible by category
about.html      Restaurant story
contact.html    Phone, address, hours, map
css/style.css   Shared styles
js/script.js    Mobile nav toggle + active-link highlighting
images/         Logo + real photos go here (see below)
```

## Brand

- **Palette**: black (`#141414`), cheese yellow (`#ffd400`), and a blue accent (`#2f8fe0`) taken from the "N" in the logo — yellow appears on dark surfaces (header, footer, hero, buttons), blue appears on light surfaces (eyebrows, prices, hover states).
- **Type**: 'Luckiest Guy' for the hero headline and nav wordmark (matches the logo's bold sticker-style lettering), 'Baloo 2' for other headings, 'Inter' for body text — all via Google Fonts.
- **Logo**: not yet dropped in — the nav/footer currently fall back to styled text ("Burgers **N** Beyond"). Add the real logo file to `images/` and wire it into `.nav-logo` / `.footer-logo` in each HTML file (swap the text for an `<img>` tag) plus set it as the favicon.

## Running locally

No build tools needed. Either:

- Open `index.html` directly in a browser, or
- Serve it locally so relative paths behave exactly like production:
  ```bash
  npx serve .
  # or
  python3 -m http.server 8000
  ```

## Real business details (live)

- **Phone**: 082 514 0077 and 082 421 1750 (both listed everywhere a phone number appears — nav, hero, footer, contact page)
- **Address**: 80 Main Reef Rd, Randfontein, 1760 (Google Maps link: https://maps.app.goo.gl/YxGaBvXBSbbE6kD96)
- **Email**: Burgersnbeyondsa@gmail.com
- **Opening hours**: Mon–Sat 10:00–18:30, closed Fridays 12:20–13:20, closed Sundays

## Still placeholder — replace before going live for real

- **Daily specials**: `menu.html`'s "Today's Special" banner (`js/promo.js`) shows a different EXAMPLE promotion per day of the week (real menu items, made-up discounts), clearly labeled "Example special — real daily promotions coming soon!" so it can't mislead a real customer. Replace the `SPECIALS` object in `js/promo.js` with the real weekly promotions once decided, and remove the note once they're real.
- **Menu items & prices**: the full real menu is in `menu.html` (transcribed from the physical menu boards) — double-check it against the current boards if they've changed since
- **Photos**: the site currently uses food emoji as visual accents instead of photography. Drop real photos into `images/` and swap them into the hero/menu/about sections when available.
- **Logo**: see "Brand" above.

## Deploying

Already live on GitHub Pages (see top of this file) — push to `main` and it redeploys automatically within a minute or two.

If you ever want to move off GitHub Pages:

- **Netlify / Vercel**: drag-and-drop the folder, or connect the git repo
- Any standard web host / cPanel — just upload the files
