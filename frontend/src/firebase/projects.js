import {
  collection, doc, getDocs, addDoc, updateDoc, deleteDoc,
  query, orderBy, onSnapshot, serverTimestamp,
} from 'firebase/firestore'
import { db } from './app'

const COL = 'portfolio_projects'

const mapDoc = d => ({ id: d.id, ...d.data() })

/**
 * A project is visible unless it is explicitly hidden.
 *
 * The flag is stored as `hidden: true` rather than `visible: false` so every
 * document written before this field existed - which has no flag at all -
 * still reads as visible. Inverting it would have hidden the whole portfolio
 * until each project was re-saved.
 */
const isProjectVisible = p => p?.hidden !== true

/**
 * Every project, hidden ones included. This is the admin view - the public
 * pages go through the `subscribe*` helpers, which drop hidden projects.
 */
export async function getProjects() {
  const q = query(collection(db, COL), orderBy('order', 'asc'))
  const snap = await getDocs(q)
  return snap.docs.map(mapDoc)
}

/**
 * Live project list, ordered by `order`.
 *
 * Public pages subscribe rather than fetch once so an edit in the admin panel
 * appears on the site immediately instead of on the visitor's next reload.
 * Returns the Firestore unsubscribe function - callers MUST return it from
 * their effect cleanup, or the listener outlives the component and keeps an
 * open channel for the rest of the session.
 *
 * Hidden projects are dropped here, so no public page has to remember to
 * filter them. Pass `{ includeHidden: true }` for an admin-side listener.
 * The filter is in memory rather than a `where('hidden', '!=', true)` clause
 * for two reasons: combining it with orderBy('order') would need a composite
 * index, and a `!=` filter skips documents that lack the field entirely -
 * i.e. every project written before this flag existed.
 */
export function subscribeProjects(onData, onError, { includeHidden = false } = {}) {
  return onSnapshot(
    query(collection(db, COL), orderBy('order', 'asc')),
    snap => {
      const all = snap.docs.map(mapDoc)
      onData(includeHidden ? all : all.filter(isProjectVisible))
    },
    onError,
  )
}

/**
 * Live featured projects, falling back to the first `fallbackCount` of the
 * full list when nothing is flagged featured.
 *
 * `featured` is filtered in memory off the same ordered query rather than
 * added as a `where` clause: combining it with orderBy('order') would need a
 * composite index, and the collection is a handful of documents.
 */
export function subscribeFeaturedProjects(onData, onError, fallbackCount = 6) {
  return subscribeProjects(
    all => {
      const featured = all.filter(p => p.featured === true)
      onData(featured.length > 0 ? featured : all.slice(0, fallbackCount))
    },
    onError,
  )
}

export async function createProject(data) {
  return addDoc(collection(db, COL), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function updateProject(id, data) {
  return updateDoc(doc(db, COL, id), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteProject(id) {
  return deleteDoc(doc(db, COL, id))
}
