import { collection, getDocs, doc, getDoc } from 'firebase/firestore'
import { db } from './app'
import { deleteFileByUrl } from './storage'

/*
 * Keeps Storage in step with Firestore.
 *
 * Replacing a cover or removing a gallery image used to leave the old file in
 * the bucket forever. Those leftovers were most of the 66 unused files found
 * in the shared bucket.
 */

// Everywhere a portfolio image URL can be stored.
const COLLECTIONS = ['portfolio_projects', 'portfolio_interests', 'portfolio_bio']
const SETTINGS_DOCS = ['portfolio_content']

/** Every Firebase download URL found anywhere inside a value. */
export function storageUrlsIn(value, found = []) {
  if (typeof value === 'string') {
    if (value.includes('/o/') && value.includes('alt=media')) found.push(value)
  } else if (Array.isArray(value)) {
    value.forEach(v => storageUrlsIn(v, found))
  } else if (value && typeof value === 'object') {
    Object.values(value).forEach(v => storageUrlsIn(v, found))
  }
  return found
}

/** Storage paths still referenced by any portfolio document. */
async function pathsInUse() {
  const urls = []
  for (const name of COLLECTIONS) {
    const snap = await getDocs(collection(db, name))
    snap.forEach(d => storageUrlsIn(d.data(), urls))
  }
  for (const id of SETTINGS_DOCS) {
    const d = await getDoc(doc(db, 'settings', id)).catch(() => null)
    if (d?.exists()) storageUrlsIn(d.data(), urls)
  }
  // Compared by path, not by URL: the same file can carry a different token.
  return new Set(urls.map(u => u.match(/\/o\/([^?]+)\?/)?.[1]).filter(Boolean))
}

/*
 * Deletes any of `previousUrls` that nothing points at any more.
 *
 * Call it AFTER the document has been written, never before. The check is
 * against what Firestore holds at that moment, so a file another project still
 * uses, or one the reader kept, is never touched. Failures are swallowed: a
 * leftover file is a smaller problem than a save that appears to have broken.
 */
export async function pruneUnusedImages(previousUrls) {
  const candidates = (previousUrls || []).filter(Boolean)
  if (!candidates.length) return 0

  try {
    const keep = await pathsInUse()
    const dead = candidates.filter(u => {
      const path = u.match(/\/o\/([^?]+)\?/)?.[1]
      return path && !keep.has(path)
    })
    const results = await Promise.all(dead.map(deleteFileByUrl))
    return results.filter(Boolean).length
  } catch {
    return 0
  }
}
