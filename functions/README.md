# Cloud Functions for both Lientjie sites

One Cloud Functions codebase that emails Lientjie whenever a visitor submits a
contact form on **either** site (both live in the Firebase project
`lientjie-project`). Email is sent through the account's own **Gmail SMTP**
(nodemailer) - no third-party service, the same approach as the Francois0203
project. Replying to the notification replies to the visitor.

| Function | What it does |
|---|---|
| `sendMessage` | Both contact forms post here (`site: 'portfolio'` or `'petsitting'`). Drops bots (hidden field filled, or sent within 3 seconds of opening the form), limits each sender to 2 messages per 10 minutes and 5 a day, each email address to 5 a day, and all messages to 40 a day, ignores exact repeats, then saves the message. |
| `postReview` | Petsitting reviews and comments post here (`kind: 'review'` or `'comment'`). Same bot check; 3 posts per 10 minutes and 10 a day per sender, 60 a day in all. Saves them unapproved for the admin to publish. |
| `likePost` | Likes on petsitting reviews and comments. One like per visitor per post (kept as a scrambled record in `postLikes`, deleted after a year), at most 60 like changes an hour per visitor, published posts only. |
| `onPortfolioMessage` | Emails Lientjie when a `portfolio_messages` document is created |
| `onPetsittingMessage` | Emails Lientjie when a `petsitting_messages` document is created |
| `onPetsittingReview` | Emails Lientjie when a review is waiting for approval |

Senders and email addresses are kept only as one-way hashes in `rateLimits`, deleted after a day.

### Spam protection, in order

1. **App Check (reCAPTCHA Enterprise, part of Google Cloud Fraud Defense)** - every callable has `enforceAppCheck: true`, so a call without a valid
   token from one of the two sites is refused before any code runs. `postReview` and `likePost` also
   *consume* each token (`consumeAppCheckToken`), so a token copied out of a browser cannot be replayed.
   `sendMessage` does not, because the portfolio sends ordinary tokens.
2. **Honeypot + fill time** - a hidden field bots fill in, and posts sent within 3 seconds of opening the form.
3. **Link spam** - more than two links, any HTML tag or BBCode, or a link in a name is dropped quietly.
4. **Rate limits** - per sender (the caller's real address, the *last* `X-Forwarded-For` entry, which the
   caller cannot fake), per email address, per day for everyone, and exact repeats.
5. **Moderation** - reviews and comments are saved unapproved; nothing appears until an admin approves it.

Steps 2-4 answer bots with a quiet success, so they learn nothing about what tripped them.

## One-time setup (no new signups)

0. **App Check** - classic reCAPTCHA v3 can no longer be registered, so both sites use the
   reCAPTCHA Enterprise provider (`ReCaptchaEnterpriseProvider` in `frontend/src/firebase/app.js`).
   - Google Cloud console -> Security -> **Fraud Defense** (project `lientjie-project`) -> create a
     **Web**, score-based key (no checkbox challenge) listing `lientjie-petsitting.web.app`,
     `lientjie-petsitting.firebaseapp.com`, `lientjie-portfolio.web.app`, `lientjie-portfolio.firebaseapp.com`.
     **Never add `localhost`** to this production key.
   - Firebase console -> Security -> App Check -> Apps: register **both** web apps with the
     reCAPTCHA Enterprise provider and that key. Do not press Enforce for Firestore/Storage.
   - Put the key in each repo's `FIREBASE_APPCHECK_SITE_KEY` GitHub secret and local `.env`.
   - **Without this the contact forms, reviews and likes all fail.**
   - Local development: set `FIREBASE_APPCHECK_DEBUG_TOKEN=true` in `.env`, run the site, copy the
     debug token it prints in the browser console, and add it under App Check -> Apps -> (menu) ->
     Manage debug tokens.

1. **Blaze plan** - already done.

2. **Gmail App Password** - a setting on the existing Gmail account, not a new
   account:
   - Enable **2-Step Verification** on the Google account (required for app passwords).
   - Google Account -> Security -> **App passwords** -> create one -> copy the
     16-character password.

3. **Install deps**

   ```bash
   cd functions
   npm install
   ```

4. **Set the secret** (the app password, stored encrypted in Secret Manager):

   ```bash
   firebase functions:secrets:set SMTP_PASSWORD
   ```

5. **Params** live in `functions/.env` (gitignored):

   ```
   SMTP_USER=meiringjacqueline1302@gmail.com
   NOTIFY_TO=meiringjacqueline1302@gmail.com
   ```

   `SMTP_USER` is the Gmail that sends; `NOTIFY_TO` is where notifications land
   (the same inbox is fine). Both sites deliver here.

6. **Region** - `index.js` sets `REGION = 'europe-west1'` to match the Firestore
   database location. A mismatch makes the deploy fail.

7. **Deploy** - automatic. The GitHub workflow deploys the functions whenever a push changes
   anything under `functions/` (or when run by hand with *Also deploy Cloud Functions* ticked),
   before it checks them and deploys the site. It needs these repo secrets:
   - `SERVICE_ACCOUNT` - JSON key of the robot account. The run log prints *Deploying as: ...*;
     that account needs Cloud Functions Admin, Service Account User, Cloud Build Editor, Artifact
     Registry Administrator, Secret Manager Admin and Service Usage Consumer in `lientjie-project`.
   - `SMTP_USER` and `NOTIFY_TO` - the same values as in `functions/.env`, which is not in git
     because the repo is public. `SMTP_HOST`/`SMTP_PORT` secrets are optional: the workflow writes Gmail's when they are not set.

   By hand, if ever needed: `firebase deploy --only functions --project lientjie-project`

## Notes

- The Firestore rules deny every direct visitor write on messages, reviews, comments
  and likes, so the forms and like buttons only work through `sendMessage`,
  `postReview` and `likePost`. Deploy in this order: functions, then rules and
  indexes, then hosting. Both sites' deploy workflows check that the functions
  answer before deploying hosting.
- This repo (Lientjie-Portfolio) owns these functions for both sites and deploys them
  from its workflow. The Firestore and Storage rules are owned by the Lientjie-Petsitting
  repo. The petsitting workflow only checks that the functions answer.
- The function never rethrows on send failure (a bad password won't cause a retry
  storm); check `firebase functions:log` if a notification doesn't arrive. The
  message is stored in Firestore (and shown in the admin inbox) regardless.
