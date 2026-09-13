# Burgers & Beyond

Static marketing website for Burgers & Beyond, a takeaway burger restaurant. Plain HTML/CSS/JS — no build step, no backend.

## Structure

```
index.html      Home page
menu.html       Full menu (burgers, sides, drinks/shakes)
about.html      Restaurant story
contact.html    Phone, address, hours, map
css/style.css   Shared styles
js/script.js    Mobile nav toggle + active-link highlighting
images/         Put real photos here (see below)
```

## Running locally

No build tools needed. Either:

- Open `index.html` directly in a browser, or
- Serve it locally so relative paths behave exactly like production:
  ```bash
  npx serve .
  # or
  python3 -m http.server 8000
  ```

## Before going live — replace placeholder content

- **Phone number**: `011 123 4567` / `tel:+27111234567` (appears in the nav, footer, home, and contact pages)
- **Address**: `123 Example Street, Sandton, Johannesburg, 2196` (footer, contact page, home page info strip)
- **Email**: `hello@burgersandbeyond.co.za`
- **Opening hours**: currently Mon–Sat 11:00–21:00, Sun 12:00–20:00
- **Map**: `contact.html`'s embedded Google Map currently searches `"Sandton, Johannesburg"` — swap the `q=` query param for the real address once confirmed
- **Social links**: Facebook/Instagram/WhatsApp icons on the contact page are placeholder `#` links
- **Menu items & prices**: `menu.html` has a starter menu (6 burgers, 4 sides, 4 drinks/shakes) — adjust to match the real menu
- **Photos**: the site currently uses food emoji as visual accents instead of photography. Drop real photos into `images/` and swap them into the hero/menu/about sections when available.

## Deploying

Since this is a static site with no build step, it can be hosted directly on any static host, e.g.:

- **Netlify / Vercel**: drag-and-drop the folder, or connect the git repo
- **GitHub Pages**: push to a repo and enable Pages on the root
- Any standard web host / cPanel — just upload the files
