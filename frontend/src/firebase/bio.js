import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore'
import { db } from './app'

const COL = 'portfolio_bio'

export async function getBioProfile() {
  const snap = await getDoc(doc(db, COL, 'profile'))
  return snap.exists() ? snap.data() : null
}

export async function getBioSection(section) {
  const snap = await getDoc(doc(db, COL, section))
  return snap.exists() ? snap.data() : null
}

/**
 * Live single bio document ('profile', 'education', 'experience', 'skills').
 *
 * Yields `null` for a document that does not exist yet, matching the one-shot
 * getters above, so the calling page needs only one empty-state branch rather
 * than separate "missing" and "not loaded" cases.
 *
 * Returns the Firestore unsubscribe function - callers MUST return it from
 * their effect cleanup.
 */
export function subscribeBioSection(section, onData, onError) {
  return onSnapshot(
    doc(db, COL, section),
    snap => onData(snap.exists() ? snap.data() : null),
    onError,
  )
}

export async function updateBioSection(section, data) {
  return setDoc(doc(db, COL, section), data, { merge: true })
}
