import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { storage } from './app'
import downscaleImage from '../utils/downscaleImage'

// The only prefix this admin may delete from. The bucket is shared with the
// petsitting site and has legacy files at its root that no admin owns.
const OWNED_PREFIX = 'portfolio/'

// Unique, collision-proof filename: <timestamp>_<random>_<sanitised original>.
// Fixes the old bug where same-named uploads overwrote each other.
function uniqueName(file) {
  const safe = (file.name || 'file').replace(/\s+/g, '_').replace(/[^\w.-]/g, '')
  return `${Date.now()}_${Math.round(Math.random() * 1e6)}_${safe}`
}

// Every upload path in the admin funnels through here, so this is the one
// place that has to cap image size. Oversized originals stall the visitor's
// main thread on decode; see utils/downscaleImage.
export async function uploadFile(file, path) {
  const upload = await downscaleImage(file)
  const storageRef = ref(storage, `${path}/${uniqueName(upload)}`)
  await uploadBytes(storageRef, upload)
  return getDownloadURL(storageRef)
}

export async function uploadMultiple(files, path) {
  return Promise.all(Array.from(files).map(f => uploadFile(f, path)))
}

/** The storage path inside a Firebase download URL, or null if it is not one. */
export function storagePath(url) {
  const m = typeof url === 'string' && url.match(/\/o\/([^?]+)\?/)
  return m ? decodeURIComponent(m[1]) : null
}

// Best effort by design: a file that is already gone, or that was never ours,
// must never turn into a failed save.
export async function deleteFileByUrl(url) {
  const path = storagePath(url)
  if (!path?.startsWith(OWNED_PREFIX)) return false
  try {
    await deleteObject(ref(storage, path))
    return true
  } catch {
    return false
  }
}
