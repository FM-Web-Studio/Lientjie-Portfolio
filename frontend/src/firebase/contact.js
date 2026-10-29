import {
  collection, doc, getDocs, addDoc, updateDoc, deleteDoc,
  query, orderBy, serverTimestamp, Timestamp,
} from 'firebase/firestore'
import { db } from './app'
import { CONTACT_RETENTION_DAYS } from '../content/legal'

const COL = 'portfolio_messages'

// Kept in sync with portfolio_messages in firestore.rules.
export const CONTACT_LIMITS = { name: 100, email: 254, subject: 150, message: 5000 }

const clip = (value, max) => String(value ?? '').trim().slice(0, max)

// Every field is always written, matching the rules. expireAt drives the TTL
// policy that deletes the message on that date.
export async function createMessage(data) {
  return addDoc(collection(db, COL), {
    name:    clip(data.name, CONTACT_LIMITS.name),
    email:   clip(data.email, CONTACT_LIMITS.email),
    subject: clip(data.subject, CONTACT_LIMITS.subject),
    message: clip(data.message, CONTACT_LIMITS.message),
    read: false,
    createdAt: serverTimestamp(),
    expireAt: Timestamp.fromMillis(Date.now() + CONTACT_RETENTION_DAYS * 864e5),
  })
}

export async function getMessages() {
  const q = query(collection(db, COL), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function markMessageRead(id, read = true) {
  return updateDoc(doc(db, COL, id), { read })
}

export async function deleteMessage(id) {
  return deleteDoc(doc(db, COL, id))
}
