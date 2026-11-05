import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import { getStorage } from 'firebase/storage'
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check'

const firebaseConfig = {
  apiKey:            import.meta.env.FIREBASE_API_KEY,
  authDomain:        import.meta.env.FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.FIREBASE_APP_ID,
  measurementId:     import.meta.env.FIREBASE_MEASUREMENT_ID,
}

if (import.meta.env.DEV && !import.meta.env.FIREBASE_API_KEY) {
  console.warn('[Firebase] Config not found. Copy .env.example to .env and fill in your project values.')
}

export const app     = initializeApp(firebaseConfig)

// App Check stays off until a reCAPTCHA v3 site key is set, so nothing changes before the keys exist.
const appCheckKey = import.meta.env.FIREBASE_APPCHECK_SITE_KEY
if (appCheckKey) {
  // FIREBASE_APPCHECK_DEBUG_TOKEN (local dev only): empty or false = off, true = print a new debug
  // token in the browser console to register in App Check, anything else = that registered token.
  const debugToken = String(import.meta.env.FIREBASE_APPCHECK_DEBUG_TOKEN ?? '').trim()
  if (import.meta.env.DEV && debugToken && debugToken !== 'false') self.FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken === 'true' ? true : debugToken
  initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(appCheckKey), isTokenAutoRefreshEnabled: true })
}

export const db      = getFirestore(app)
export const auth    = getAuth(app)
export const storage = getStorage(app)
