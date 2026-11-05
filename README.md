# Lientjie Meiring, portfolio

The portfolio of an architecture student at the University of Johannesburg: work,
interests, about and contact, all editable from `/admin`.

Live at https://lientjie-portfolio.web.app

## One Firebase project, two sites

This site shares the Firebase project `lientjie-project` with the petsitting site.
The Cloud Functions for both sites live in this repo's `functions/` folder and deploy
with this site. `firestore.rules`, `storage.rules` and `firestore.indexes.json` are
project wide and live in the
[`Lientjie-Petsitting`](https://github.com/FM-Web-Studio/Lientjie-Petsitting) repo.
A new collection or Storage folder here needs its rule added there first, or the
default deny rejects it.

## The CV

"Download CV" (About page, Contact page, footer) builds an A4 PDF in the visitor's
browser from the same Firestore documents the About page shows, plus the visible
projects, read fresh at the moment of download. There is no stored file to keep up to
date: edit the About content in `/admin` and the next download reflects it. Its
wording, languages, references and project count are under Site Copy > CV.

The PDF engine (`frontend/src/cv`, react-pdf) is about 460 KB gzipped, so it loads
only when someone hovers, focuses or clicks the button. It uses a bundled copy of the
site's typeface (Inter Tight).

The portrait and project images are fetched from Storage and shrunk before they go into
the PDF. That needs the bucket's CORS rule in `storage-cors.json` (read-only, the site's
own origins and `localhost:3000`). It is applied; to change it:
`gcloud storage buckets update gs://lientjie-project.firebasestorage.app --cors-file=storage-cors.json`.
If an image cannot be fetched the CV still downloads, with initials or a coloured tile.

## Design and motion

One typeface (Inter Tight), the brand mint, coral and graphite, light and dark themes.
Tokens are in `styles/Theme.css`; shared classes (`.container`, `.card`, `.badge`, `.btn`,
`.chip`, `.field`) in `styles/global.css`. Motion is GSAP (`lib/motion.js`) with Lenis
smooth scrolling, plus a few building blocks in `components/`: `TextReveal`, `Reveal`,
`Marquee`, `Counter`, `Button` (magnetic, fill from the pointer) and the custom `Cursor`.
Everything respects the visitor's reduced-motion setting.

## Contact form and spam

The form posts to the `sendMessage` Cloud Function (in `functions/`, deployed with
this site). It drops bots (hidden field filled, or sent within a few seconds of opening the
form), limits how often one sender and one email address can write, caps the site's
daily total, then saves the message to `portfolio_messages` with a 12-month expiry.
The rules refuse direct writes to that collection.

Deploy order matters: the function must be live before this site's new form goes out.
The deploy workflow checks that `sendMessage` answers and stops if it does not.

## Link previews and search

Link preview bots (WhatsApp, LinkedIn, Facebook, Slack) do not run JavaScript, so the
build writes one HTML file per page with its title, description and preview image
already in the head, plus `sitemap.xml` and `robots.txt`. All of it comes from
`frontend/src/content/seo.js`; add a page there and a matching rewrite in
`frontend/firebase.json`. The preview image is `frontend/public/og/share.jpg`
(1200 x 630). A changed image needs a new file name, or apps keep showing the cached one.

## Structure

```
frontend/src
  components/  shared UI, one folder each: Footer/Footer.jsx, Footer.module.css and an index.js barrel
  content/     siteCopy.js (editable wording with defaults), legal.js (privacy and terms),
               seo.js (each page's title, description and link preview)
  context/     content and toast providers
  firebase/    data access, one module per concern, re-exported from firebase/index.js
  hooks/       theme, auth, reveal on scroll, smooth scroll, magnetic and tilt hover, page meta
  lib/         motion.js: GSAP setup shared by every animation
  cv/          the downloadable CV (built in the browser)
  pages/       one folder per page, lazy loaded through pages/index.js
    Admin/     the admin: sections/ has one folder per tab
  styles/      tokens, global styles, motion and admin styles
  utils/       image downscaling
```

Import a component through its folder (`../components/Footer`), not the file inside it.

## Local development

```bash
cd frontend
npm install
npm run dev      # http://localhost:3000
npm run build    # writes frontend/dist
```

`frontend/.env` holds the Firebase web config. It is gitignored and mirrored as GitHub
Actions secrets.
