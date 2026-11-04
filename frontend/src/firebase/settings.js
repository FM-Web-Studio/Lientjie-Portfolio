import { doc, getDoc } from 'firebase/firestore'
import { db } from './app'

async function getSettings(docId) {
  const snap = await getDoc(doc(db, 'settings', docId))
  return snap.exists() ? snap.data() : null
}

export async function isAdminEmail(email) {
  try {
    const settings = await getSettings('admins')
    return Array.isArray(settings?.emails) && settings.emails.includes(email)
  } catch {
    return false
  }
}
