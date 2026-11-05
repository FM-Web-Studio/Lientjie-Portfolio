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
only when someone hovers, focuses or clicks the button. Its fonts are bundled copies of
the site's typefaces. IBM Plex Mono comes from `@ibm/plex-mono` because the Fontsource
WOFF files for it fail to parse in react-pdf.

The profile photo appears on the CV only if the Storage bucket allows the site to
fetch it (CORS). Without that it is left off and the CV still downloads.

## Contact form and spam

The form posts to the `sendMessage` Cloud Function (deployed from the petsitting
repo). It drops bots (hidden field filled, or sent within a few seconds of opening the
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
  hooks/       theme, auth, reveal on scroll, momentum scroll, page meta
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
