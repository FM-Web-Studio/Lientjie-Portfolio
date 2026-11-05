import {
  collection, doc, getDocs, updateDoc, deleteDoc, query, orderBy,
} from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { app, db } from './app'

const COL = 'portfolio_messages'

// The longest value the form allows for each field. The sendMessage function
// (functions/index.js in this repo) applies the same caps, so keep the two in step.
export const CONTACT_LIMITS = { name: 100, email: 254, subject: 150, message: 5000 }

const clip = (value, max) => String(value ?? '').trim().slice(0, max)

// Sends a message through the sendMessage function, which checks for spam, limits
// how often one person can write, and saves the message with its expiry date.
// website is the hidden trap field, elapsed is how long the form was open in ms.
// Throws an Error whose message is 'limit' (with .limit 'sender' or 'everyone') or 'failed'.
export async function createMessage({ website = '', elapsed = 0, ...data }) {
  const send = httpsCallable(getFunctions(app, 'europe-west1'), 'sendMessage')
  try {
    await send({
      site:    'portfolio',
      name:    clip(data.name, CONTACT_LIMITS.name),
      email:   clip(data.email, CONTACT_LIMITS.email),
      subject: clip(data.subject, CONTACT_LIMITS.subject),
      message: clip(data.message, CONTACT_LIMITS.message),
      website,
      elapsed,
    })
  } catch (err) {
    const tooMany = err?.code === 'functions/resource-exhausted'
    const error = new Error(tooMany ? 'limit' : 'failed')
    error.limit = tooMany ? (err.message === 'everyone' ? 'everyone' : 'sender') : null
    throw error
  }
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
