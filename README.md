# Burgers N Beyond

Static marketing website for Burgers N Beyond, a takeaway burger restaurant. Plain HTML/CSS/JS — no build step, no backend.

**Live at:** https://hussainbadat10.github.io/burgers-and-beyond/ (deployed via GitHub Pages, auto-updates on every push to `main`)

## Structure

```
index.html      Home page
menu.html       Full menu (burgers, sides, drinks/shakes)
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

## Before going live for real — replace placeholder content

- **Phone number**: `011 123 4567` / `tel:+27111234567` (appears in the nav, footer, home, and contact pages)
- **Address**: `123 Example Street, Sandton, Johannesburg, 2196` (footer, contact page, home page info strip)
- **Email**: `hello@burgersnbeyond.co.za`
- **Opening hours**: currently Mon–Sat 11:00–21:00, Sun 12:00–20:00
- **Map**: `contact.html`'s embedded Google Map currently searches `"Sandton, Johannesburg"` — swap the `q=` query param for the real address once confirmed
- **Social links**: Facebook/Instagram/WhatsApp icons on the contact page are placeholder `#` links
- **Menu items & prices**: `menu.html` has a starter menu (6 burgers, 4 sides, 4 drinks/shakes) — adjust to match the real menu
- **Photos**: the site currently uses food emoji as visual accents instead of photography. Drop real photos into `images/` and swap them into the hero/menu/about sections when available.
- **Logo**: see "Brand" above.

## Deploying

Already live on GitHub Pages (see top of this file) — push to `main` and it redeploys automatically within a minute or two.

If you ever want to move off GitHub Pages:

- **Netlify / Vercel**: drag-and-drop the folder, or connect the git repo
- Any standard web host / cPanel — just upload the files
