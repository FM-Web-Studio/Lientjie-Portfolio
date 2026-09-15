import {
  collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc,
  query, orderBy, onSnapshot, serverTimestamp,
} from 'firebase/firestore'
import { db } from './app'

const COL = 'portfolio_interests'

const mapDoc = d => ({ id: d.id, ...d.data() })

/**
 * An interest is visible unless explicitly hidden - same convention as
 * projects, so a document written before this field existed still reads as
 * visible rather than disappearing the moment the flag was introduced.
 */
export const isInterestVisible = i => i?.hidden !== true

/** Every interest, hidden ones included - the admin view. */
export async function getInterests() {
  const q = query(collection(db, COL), orderBy('order', 'asc'))
  const snap = await getDocs(q)
  return snap.docs.map(mapDoc)
}

export async function getInterest(id) {
  const snap = await getDoc(doc(db, COL, id))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

/**
 * Live interest list, ordered by `order`, hidden ones dropped.
 *
 * Public pages subscribe rather than fetch once so an edit in the admin panel
 * appears on the site immediately. Returns the Firestore unsubscribe function -
 * callers MUST return it from their effect cleanup.
 */
export function subscribeInterests(onData, onError, { includeHidden = false } = {}) {
  return onSnapshot(
    query(collection(db, COL), orderBy('order', 'asc')),
    snap => {
      const all = snap.docs.map(mapDoc)
      onData(includeHidden ? all : all.filter(isInterestVisible))
    },
    onError,
  )
}

export async function createInterest(data) {
  return addDoc(collection(db, COL), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function updateInterest(id, data) {
  return updateDoc(doc(db, COL, id), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteInterest(id) {
  return deleteDoc(doc(db, COL, id))
}
