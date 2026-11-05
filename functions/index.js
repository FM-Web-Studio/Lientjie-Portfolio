/**
 * Cloud Functions - contact-form email notifications for BOTH Lientjie sites.
 *
 * Both the portfolio and the petsitting site live in the same Firebase project
 * (`lientjie-project`), so one Functions codebase serves both. A new document in
 * either messages collection emails a formatted summary to Lientjie's inbox via
 * that same Gmail account's SMTP (nodemailer) - no third-party service, same
 * approach as the Francois0203 project. Replying to the email goes straight to
 * the visitor.
 *
 * Collections watched:
 *   portfolio_messages/{id}   -> portfolio contact form
 *   petsitting_messages/{id}  -> petsitting contact form
 *   petsitting_reviews/{id}   -> petsitting review awaiting moderation
 *
 * Reviews are held unpublished until an admin approves them, so this mail is
 * what tells Lientjie there is something in the queue - without it the
 * moderation gate would silently swallow reviews.
 *
 * Setup (see functions/README.md):
 *   1. Project on the Blaze plan (done).
 *   2. On the Gmail account, enable 2-Step Verification, then create an
 *      "App password" (Google Account -> Security -> App passwords). This is a
 *      setting on your existing Gmail - NOT a new account/signup.
 *   3. firebase functions:secrets:set SMTP_PASSWORD   (paste the 16-char app password)
 *   4. functions/.env holds SMTP_USER + NOTIFY_TO (the Gmail address).
 *   5. firebase deploy --only functions
 */
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineString, defineSecret } = require('firebase-functions/params');
const logger = require('firebase-functions/logger');
const nodemailer = require('nodemailer');
const crypto = require('node:crypto');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue, Timestamp } = require('firebase-admin/firestore');

initializeApp();
const db = getFirestore();

// Must match the region of the Firestore database. Verified via
// `firebase firestore:databases:get` -> lientjie-project is in europe-west1.
const REGION = 'europe-west1';

const SMTP_HOST = defineString('SMTP_HOST', { default: 'smtp.gmail.com' });
const SMTP_PORT = defineString('SMTP_PORT', { default: '465' });
const SMTP_USER = defineString('SMTP_USER'); // the Gmail address that sends
const NOTIFY_TO = defineString('NOTIFY_TO'); // where notifications land (usually the same Gmail)
const SMTP_PASSWORD = defineSecret('SMTP_PASSWORD'); // Gmail app password (secret)

// Per-site presentation, keyed by the config name passed to makeHandler().
const SITES = {
  portfolio_messages: {
    label: 'Portfolio',
    accent: '#7A5C1A',
    intro: 'Someone reached out through your portfolio.',
  },
  petsitting_messages: {
    label: 'Petsitting',
    accent: '#FF6B6B',
    intro: 'Someone reached out through your petsitting site.',
  },
  petsitting_reviews: {
    label: 'Petsitting review',
    accent: '#e6c200',
    intro: 'A new review is waiting for your approval before it goes live.',
  },
};

const esc = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const formatWhen = (createdAt) => {
  const d = createdAt && typeof createdAt.toDate === 'function' ? createdAt.toDate() : new Date();
  try {
    return d.toLocaleString('en-ZA', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Africa/Johannesburg' });
  } catch {
    return d.toISOString();
  }
};

// Build a compact, email-client-friendly HTML message.
const buildHtml = ({ site, name, email, phone, message, when, extra }) => {
  const rows = [
    ['From', esc(name)],
    ['Email', email ? `<a href="mailto:${esc(email)}" style="color:${site.accent};font-weight:600;text-decoration:none;">${esc(email)}</a>` : '<span style="color:#94a3b8;">not provided</span>'],
    phone ? ['Phone', esc(phone)] : null,
    ...extra,
    ['Received', esc(when)],
  ].filter(Boolean);

  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border:1px solid #e4e4e7;border-radius:14px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
        <tr><td style="background:${site.accent};padding:22px 28px;">
          <div style="color:#fff;font-size:18px;font-weight:700;">New ${esc(site.label)} message</div>
          <div style="color:rgba(255,255,255,0.85);font-size:13px;margin-top:2px;">${esc(site.intro)}</div>
        </td></tr>
        <tr><td style="padding:26px 28px 8px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;color:#3f3f46;">
            ${rows.map(([k, v]) => `<tr><td style="padding:6px 0;width:120px;color:#71717a;vertical-align:top;">${esc(k)}</td><td style="padding:6px 0;color:#18181b;">${v}</td></tr>`).join('')}
          </table>
        </td></tr>
        <tr><td style="padding:8px 28px 26px;">
          <div style="color:#71717a;font-size:12px;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px;">Message</div>
          <div style="background:#fafafa;border:1px solid #ececed;border-left:3px solid ${site.accent};border-radius:8px;padding:16px 18px;color:#27272a;font-size:15px;line-height:1.7;">${esc(message).replace(/\r?\n/g, '<br>')}</div>
        </td></tr>
        <tr><td style="background:#fafafa;border-top:1px solid #ececed;padding:14px 28px;color:#a1a1aa;font-size:12px;">
          ${email
    ? `Just hit Reply to respond to ${esc(name)} directly.`
    : 'No contact details were collected for this one, so there is nobody to reply to.'
} Automated notification from your website.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
};

const buildText = ({ site, name, email, phone, message, when, extra }) =>
  `New ${site.label} message\n\n` +
  `From:     ${name}\n` +
  `Email:    ${email || 'not provided'}\n` +
  (phone ? `Phone:    ${phone}\n` : '') +
  extra.map(([k, v]) => `${k}: ${String(v).replace(/<[^>]+>/g, '')}\n`).join('') +
  `Received: ${when}\n\n` +
  `Message:\n${message}\n`;

/*
 * Pull the common { name, email, phone, message } shape out of a document.
 * Reviews store their author and text under different field names and carry no
 * contact details at all (deliberately - the collection is world-readable), so
 * they get their own mapping.
 */
const normalise = (configKey, data) => {
  if (configKey === 'petsitting_reviews') {
    const stars = Math.max(0, Math.min(5, Math.round(Number(data.rating) || 0)));
    const extra = [['Rating', `${'★'.repeat(stars)}${'☆'.repeat(5 - stars)} (${stars}/5)`]];
    if (data.title) extra.push(['Headline', data.title]);
    if (data.petName) extra.push(['Pet', data.petName]);
    if (data.serviceUsed) extra.push(['Service', data.serviceUsed]);
    extra.push(['Status', 'Not published yet - approve it in the admin panel']);
    return {
      name: (data.authorName || '').trim() || 'Anonymous',
      email: '',
      phone: '',
      message: (data.body || '').trim() || '(empty review)',
      extra,
      subject: `New review (${stars}/5) from ${(data.authorName || 'Anonymous').trim()} - awaiting approval`,
    };
  }

  const extra = [];
  if (data.petName) extra.push(['Pet', `${data.petName}${data.petType ? ` (${data.petType})` : ''}`]);
  if (data.serviceInterest) extra.push(['Service', data.serviceInterest]);
  if (data.subject) extra.push(['Subject', data.subject]);

  return {
    name: (data.name || '').trim() || 'Anonymous',
    email: (data.email || '').trim(),
    phone: (data.phone || '').trim(),
    message: (data.message || '').trim() || '(empty message)',
    extra,
    subject: null,
  };
};

// Shared handler for every watched collection.
const makeHandler = (configKey) => async (event) => {
  const data = event.data?.data();
  if (!data) { logger.warn('Trigger fired with no document data', { configKey, id: event.params.id }); return; }

  // A review that looks like spam waits quietly in the admin queue instead of emailing.
  if (configKey === 'petsitting_reviews' && data.flagged) {
    logger.info('Flagged review: no notification sent', { id: event.params.id });
    return;
  }

  const site = SITES[configKey];
  const { name, email, phone, message, extra, subject } = normalise(configKey, data);
  if (data.flagged) extra.push(['Spam check', `Looks like spam: ${(data.flags || []).join('; ')}`]);
  const when = formatWhen(data.createdAt);

  const payload = { site, name, email, phone, message, when, extra };

  const port = Number(SMTP_PORT.value()) || 465;
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST.value(),
    port,
    secure: port === 465,
    auth: { user: SMTP_USER.value(), pass: SMTP_PASSWORD.value() },
  });

  try {
    await transporter.sendMail({
      from: `"Lientjie Websites" <${SMTP_USER.value()}>`,
      to: NOTIFY_TO.value() || SMTP_USER.value(),
      replyTo: email || undefined,
      subject: `${data.flagged ? '[Likely spam] ' : ''}${subject || `New ${site.label} message from ${name}`}`,
      text: buildText(payload),
      html: buildHtml(payload),
    });
    // Ids only: names and addresses stay out of Cloud Logging.
    logger.info('Notification sent', { configKey, id: event.params.id });
  } catch (err) {
    // Don't rethrow - a retry storm won't fix bad credentials, and the message
    // is safely stored in Firestore regardless. Surface it loudly in logs.
    logger.error('Failed to send notification', { configKey, id: event.params.id, error: err?.message });
  }
};

const opts = (document) => ({ document, region: REGION, secrets: [SMTP_PASSWORD], maxInstances: 5 });

exports.onPortfolioMessage = onDocumentCreated(opts('portfolio_messages/{id}'), makeHandler('portfolio_messages'));
exports.onPetsittingMessage = onDocumentCreated(opts('petsitting_messages/{id}'), makeHandler('petsitting_messages'));
exports.onPetsittingReview = onDocumentCreated(opts('petsitting_reviews/{id}'), makeHandler('petsitting_reviews'));

// ── Public writes ───────────────────────────────────────────────────────────
// Visitors never write Firestore directly: the contact forms, reviews and comments
// all come through these two functions, which drop bots, limit how often one
// person can post, and only then save with admin rights. firestore.rules denies
// every direct create on those collections.

const DAY = 24 * 60 * 60 * 1000;
// Keep in step with the retention the privacy policies promise.
const KEEP_DAYS = 365;
const MIN_FILL_MS = 3000;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const CALLABLE = {
  region: REGION,
  maxInstances: 5,
  cors: [/^https:\/\/lientjie-(portfolio|petsitting)\.(web\.app|firebaseapp\.com)$/, /^https?:\/\/localhost(:\d+)?$/],
  // Every call must carry a valid App Check (reCAPTCHA v3) token, so a script hitting
  // the endpoint directly is refused before any code here runs. Both sites set up
  // App Check from FIREBASE_APPCHECK_SITE_KEY; without that key their forms stop working.
  enforceAppCheck: true,
};
// The petsitting-only functions also spend each token once, so a captured token cannot be
// replayed in a loop. The petsitting client asks for limited-use tokens (firebase/functions.js).
// sendMessage does not, because the portfolio sends ordinary tokens.
const CALLABLE_ONCE = { ...CALLABLE, consumeAppCheckToken: true };

// A one-way scramble, so no address or IP is ever stored as it is.
const scramble = (value) => crypto.createHash('sha256').update(`lientjie:${value}`).digest('hex').slice(0, 40);
/*
 * The caller's address. Google's front end APPENDS the real address to X-Forwarded-For,
 * after anything the caller sent in that header themselves, so the first entry can be
 * made up and only the last one can be trusted. Taking the first entry would let a
 * spammer pick a new "address" per request and walk straight past the per-sender limits.
 */
const clientIp = (req) => {
  const hops = String(req?.headers?.['x-forwarded-for'] ?? '').split(',').map((h) => h.trim()).filter(Boolean);
  return hops[hops.length - 1] || req?.ip || 'unknown';
};
const text = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
// Bots fill the hidden field or post instantly.
const looksLikeBot = (d) => !!text(d.website, 200) || !(Number(d.elapsed) >= MIN_FILL_MS);

// ── Spam screening ──────────────────────────────────────────────────────────
// Two outcomes. Link spam (more than two links, any HTML or BBCode, a link in a name) is
// dropped with a quiet success - no person writes like that. Everything else that only LOOKS
// like spam is still saved, but marked flagged with the reasons, so a real enquiry is never
// lost: flagged messages arrive with "[Likely spam]" in the email subject, and flagged reviews
// send no email at all and show as "Likely spam" in the admin queue.
// Only real tags count as HTML, so "<R500 per night>" or "<3" from a person still gets through.
const LINK = /(https?:\/\/|www\.|\[url|<a\s|\b[a-z0-9-]+\.(ru|cn|xyz|top|click|link|shop|online|site|info|biz)\b)/gi;
const HTML = /<\/?(a|p|div|span|img|script|iframe|b|i|u|strong|em|br|font|center)\b[^>]*>|\[\/?url/i;
const SPAM_WORDS = /\b(crypto|bitcoin|btc|forex|casino|betting|viagra|cialis|porn|escort|seo|backlinks?|guest post|lead generation|first page of google|rank(?:ing)? your (?:site|website)|increase your (?:website )?traffic|web ?design (?:services?|agency)|digital marketing (?:services?|agency)|investment opportunity|make money|click here|telegram|unsubscribe|dear (?:sir|madam))\b/gi;
const NON_LATIN = /[\u0400-\u04FF\u0600-\u06FF\u0E00-\u0E7F\u3040-\u30FF\u4E00-\u9FFF\uAC00-\uD7AF]/g;

const screen = ({ name = '', body = '', extra = [] }) => {
  const all = [body, ...extra].filter(Boolean).join(' ');
  const links = (all.match(LINK) || []).length;
  if (links > 2 || HTML.test(all) || /(https?:\/\/|www\.)/i.test(name)) return { drop: true, flags: [] };

  const flags = [];
  const words = [...new Set((all.match(SPAM_WORDS) || []).map((w) => w.toLowerCase()))];
  if (words.length) flags.push(`spam words: ${words.slice(0, 4).join(', ')}`);
  if (links === 2) flags.push('two links');
  if (/[^\s@]+@[^\s@]+\.[^\s@]+|\d{6,}/.test(name)) flags.push('contact details in the name');
  const letters = all.replace(/[^\p{L}]/gu, '');
  if (letters.length >= 20 && letters.replace(/[^\p{Lu}]/gu, '').length / letters.length > 0.6) flags.push('mostly capitals');
  if (/(.)\1{5,}/u.test(all)) flags.push('repeated characters');
  if (letters.length >= 10 && (all.match(NON_LATIN) || []).length / letters.length > 0.3) flags.push('unexpected alphabet');
  return { drop: false, flags };
};
const flagFields = (flags) => (flags.length ? { flagged: true, flags } : { flagged: false });

// Deletes a few spent rate records each time, so the collection never grows.
const sweepLimits = async () => {
  const old = await db.collection('rateLimits').where('expireAt', '<', Timestamp.now()).limit(25).get();
  if (old.empty) return;
  const batch = db.batch();
  old.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
};

/*
 * Runs one rate-limited save in a transaction.
 *   scope   names the counters, 'msg' or 'post'
 *   limits  { short: { count, ms }, day, everyoneDay, keyDay }
 *   keys    { sender, key, repeat }, already scrambled; key is the email address when there is one
 *   save    (tx, now) => void, called only when every limit passes
 * Returns 'sent', 'repeat', 'sender' or 'everyone'.
 */
const limited = async (scope, limits, keys, save) => {
  const now = Date.now();
  const day = new Date(now).toISOString().slice(0, 10);
  const refs = {
    sender: db.doc(`rateLimits/${scope}-s-${keys.sender}`),
    key: keys.key ? db.doc(`rateLimits/${scope}-e-${keys.key}`) : null,
    repeat: db.doc(`rateLimits/${scope}-m-${keys.repeat}`),
    everyone: db.doc(`rateLimits/${scope}-day-${day}`),
  };

  const verdict = await db.runTransaction(async (tx) => {
    const [s, k, m, all] = await Promise.all(
      [refs.sender, refs.key, refs.repeat, refs.everyone].map((r) => (r ? tx.get(r) : null)),
    );
    if (m.exists) return 'repeat';
    const sentBy = (s.get('times') ?? []).filter((t) => now - t < DAY);
    const recent = sentBy.filter((t) => now - t < limits.short.ms);
    const sentTo = k ? (k.get('times') ?? []).filter((t) => now - t < DAY) : [];
    if (recent.length >= limits.short.count || sentBy.length >= limits.day || (k && sentTo.length >= limits.keyDay)) return 'sender';
    if ((all.get('count') ?? 0) >= limits.everyoneDay) return 'everyone';

    const expireAt = Timestamp.fromMillis(now + DAY);
    tx.set(refs.sender, { times: [...sentBy, now], expireAt });
    if (refs.key) tx.set(refs.key, { times: [...sentTo, now], expireAt });
    tx.set(refs.repeat, { expireAt });
    tx.set(refs.everyone, { count: FieldValue.increment(1), expireAt: Timestamp.fromMillis(now + 2 * DAY) }, { merge: true });
    save(tx, now);
    return 'sent';
  });

  sweepLimits().catch((err) => logger.warn('Rate limit sweep failed', { error: err?.message }));
  return verdict;
};

const finish = (verdict, scope) => {
  // The same post twice is treated as sent, so a double click never shows an error.
  if (verdict === 'sent' || verdict === 'repeat') return { ok: true };
  logger.info('Public write: limit reached', { scope, verdict });
  throw new HttpsError('resource-exhausted', verdict === 'everyone' ? 'everyone' : 'sender');
};

// The extra fields each site's contact form sends, with the longest value each may have.
const MESSAGE_FIELDS = {
  portfolio: { collection: 'portfolio_messages', optional: { subject: 150 } },
  petsitting: { collection: 'petsitting_messages', optional: { phone: 30, petName: 60, petType: 40, serviceInterest: 100 } },
};
const MESSAGE_LIMITS = { short: { count: 2, ms: 10 * 60 * 1000 }, day: 5, keyDay: 5, everyoneDay: 40 };

// Both contact forms post here:
//   { site: 'portfolio' | 'petsitting', name, email, message, ...extra fields, website, elapsed }
exports.sendMessage = onCall(CALLABLE, async (request) => {
  const d = request.data ?? {};
  const site = Object.hasOwn(MESSAGE_FIELDS, d.site) ? d.site : null;
  if (looksLikeBot(d)) {
    logger.info('Contact form: dropped a likely bot', { site });
    return { ok: true };
  }

  const name = text(d.name, 100);
  const email = text(d.email, 254);
  const message = text(d.message, 5000);
  if (!site || !name || !message || !EMAIL.test(email)) {
    throw new HttpsError('invalid-argument', 'The name, email or message is missing or not valid.');
  }
  const { collection, optional } = MESSAGE_FIELDS[site];
  const extra = Object.fromEntries(Object.entries(optional).map(([k, max]) => [k, text(d[k], max)]));
  const check = screen({ name, body: message, extra: Object.values(extra) });
  if (check.drop) {
    logger.info('Contact form: dropped link spam', { site });
    return { ok: true };
  }

  const lower = email.toLowerCase();
  const keys = {
    sender: scramble(clientIp(request.rawRequest)),
    key: scramble(lower),
    repeat: scramble(`${lower}|${message.toLowerCase()}`),
  };
  const verdict = await limited('msg', MESSAGE_LIMITS, keys, (tx, now) => {
    tx.create(db.collection(collection).doc(), {
      name, email, ...extra, message,
      read: false,
      ...flagFields(check.flags),
      createdAt: FieldValue.serverTimestamp(),
      expireAt: Timestamp.fromMillis(now + KEEP_DAYS * DAY),
    });
  });
  return finish(verdict, 'msg');
});

// A pet sitter gets a handful of reviews a week, so these are deliberately tight.
const POST_LIMITS = { short: { count: 3, ms: 10 * 60 * 1000 }, day: 6, everyoneDay: 30 };

// Petsitting reviews and comments post here. Both arrive unapproved and wait for the admin.
//   { kind: 'review', authorName, rating, title, body, petName, serviceUsed, website, elapsed }
//   { kind: 'comment', reviewId, authorName, body, website, elapsed }
exports.postReview = onCall(CALLABLE_ONCE, async (request) => {
  const d = request.data ?? {};
  const kind = d.kind === 'review' || d.kind === 'comment' ? d.kind : null;
  if (looksLikeBot(d)) {
    logger.info('Review form: dropped a likely bot', { kind });
    return { ok: true };
  }

  const bad = () => new HttpsError('invalid-argument', 'Some of the details are missing or not valid.');
  const authorName = text(d.authorName, 60);
  if (!kind || authorName.length < 2) throw bad();

  const body = text(d.body, kind === 'review' ? 2000 : 700);
  // Reviews are moderated, so spam never goes live - but it would still fill the queue.
  const check = screen({ name: authorName, body, extra: [text(d.title, 100), text(d.petName, 60)] });
  if (check.drop) {
    logger.info('Review form: dropped link spam', { kind });
    return { ok: true };
  }

  let save;
  if (kind === 'review') {
    const rating = Number(d.rating);
    if (body.length < 10 || !Number.isInteger(rating) || rating < 1 || rating > 5) throw bad();
    const fields = {
      authorName, rating, title: text(d.title, 100), body, petName: text(d.petName, 60), serviceUsed: text(d.serviceUsed, 80),
    };
    save = (tx) => tx.create(db.collection('petsitting_reviews').doc(), {
      ...fields, approved: false, likes: 0, ...flagFields(check.flags), createdAt: FieldValue.serverTimestamp(),
    });
  } else {
    const reviewId = text(d.reviewId, 128);
    if (body.length < 2 || !reviewId || reviewId.includes('/')) throw bad();
    // Comments only go on a published review.
    const review = await db.doc(`petsitting_reviews/${reviewId}`).get();
    if (!review.exists || review.get('approved') !== true) throw bad();
    save = (tx) => tx.create(review.ref.collection('petsitting_review_comments').doc(), {
      authorName, body, approved: false, likes: 0, ...flagFields(check.flags), createdAt: FieldValue.serverTimestamp(),
    });
  }

  const keys = {
    sender: scramble(clientIp(request.rawRequest)),
    repeat: scramble(`${kind}|${body.toLowerCase()}`),
  };
  return finish(await limited('post', POST_LIMITS, keys, save), 'post');
});

// ── Likes ───────────────────────────────────────────────────────────────────
// Likes used to be a direct Firestore write, which a script could repeat forever.
// Now one address gets one like per review or comment: the like is remembered as a
// scrambled record, liking again does nothing, and changes per address are capped.
const LIKE_LIMIT = { count: 60, ms: 60 * 60 * 1000 };
const ID = /^[A-Za-z0-9_-]{1,128}$/;

//   { reviewId, commentId?, like: true | false }  ->  { liked, likes }
exports.likePost = onCall(CALLABLE_ONCE, async (request) => {
  const d = request.data ?? {};
  const reviewId = String(d.reviewId ?? '');
  const commentId = d.commentId == null ? null : String(d.commentId);
  if (!ID.test(reviewId) || (commentId !== null && !ID.test(commentId)) || typeof d.like !== 'boolean') {
    throw new HttpsError('invalid-argument', 'Not a valid like.');
  }

  const target = commentId
    ? db.doc(`petsitting_reviews/${reviewId}/petsitting_review_comments/${commentId}`)
    : db.doc(`petsitting_reviews/${reviewId}`);
  const sender = scramble(clientIp(request.rawRequest));
  const record = db.doc(`postLikes/${scramble(`${sender}|${target.path}`)}`);
  const limit = db.doc(`rateLimits/like-s-${sender}`);
  const now = Date.now();

  return db.runTransaction(async (tx) => {
    const [post, mine, lim] = await Promise.all([tx.get(target), tx.get(record), tx.get(limit)]);
    // Only published posts can be liked, the same rule the site shows.
    if (!post.exists || post.get('approved') !== true) throw new HttpsError('not-found', 'That post is not available.');

    const likes = Math.max(0, Number(post.get('likes')) || 0);
    // Already in the state asked for: nothing to change, and it does not count against the limit.
    if (mine.exists === d.like) return { liked: mine.exists, likes };

    const recent = (lim.get('times') ?? []).filter((t) => now - t < LIKE_LIMIT.ms);
    if (recent.length >= LIKE_LIMIT.count) throw new HttpsError('resource-exhausted', 'sender');
    tx.set(limit, { times: [...recent, now], expireAt: Timestamp.fromMillis(now + DAY) });

    const next = d.like ? likes + 1 : Math.max(0, likes - 1);
    if (d.like) tx.create(record, { expireAt: Timestamp.fromMillis(now + KEEP_DAYS * DAY) });
    else tx.delete(record);
    tx.update(target, { likes: next });
    return { liked: d.like, likes: next };
  });
});
