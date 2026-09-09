/**
 * Downscale an image in the browser before it is uploaded.
 *
 * Cover images straight off a camera or a render can be 7000px+ on the long
 * edge. The browser has to decode the whole thing to a bitmap before it can
 * paint a 344px-wide card, and a 70-megapixel decode stalls the main thread
 * for roughly a second - which is what made scrolling stutter. The cap below
 * is the balance between that cost and staying sharp under the viewer's zoom.
 *
 * WebP is the output format because it keeps alpha, so a transparent PNG does
 * not come back with a black background the way it would through JPEG.
 *
 * Resizing is best-effort: any failure returns the original file, so a resize
 * problem can never block an upload.
 */

/*
 * Sized for the lightbox's zoom, not just for a full-bleed view.
 *
 * 2000px was chosen when the viewer only ever showed an image fit to the
 * screen. The viewer now zooms to 6x, and the work being shown is dense
 * presentation boards whose value is in the small text and linework - at
 * 2000px those turn to mush as soon as anyone zooms in, which is exactly what
 * the images are there for.
 *
 * 3200px is roughly 2.5x the pixels of the old cap while staying well under
 * the decode cost that made scrolling stutter in the first place. Quality is
 * up too: 0.86 WebP puts visible ringing around fine black linework on white,
 * which is most of a drawing sheet.
 */
const MAX_EDGE     = 3200
const QUALITY      = 0.92
// Anything already under this in both dimensions and weight is passed through
// untouched, so a photo that is already web-sized is never re-encoded.
const SKIP_BYTES   = 1500 * 1024

/** Draw `bitmap` into a canvas scaled to fit MAX_EDGE and return a WebP blob. */
function toScaledBlob(bitmap, width, height) {
  const scale = Math.min(1, MAX_EDGE / Math.max(width, height))
  const w = Math.round(width * scale)
  const h = Math.round(height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h

  const ctx = canvas.getContext('2d')
  if (!ctx) return Promise.resolve(null)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bitmap, 0, 0, w, h)

  return new Promise(resolve => canvas.toBlob(resolve, 'image/webp', QUALITY))
}

/** Decode to an ImageBitmap where available, else via an <img> and object URL. */
async function decode(file) {
  if (typeof createImageBitmap === 'function') {
    try { return await createImageBitmap(file) } catch { /* fall through */ }
  }
  const url = URL.createObjectURL(file)
  try {
    return await new Promise((resolve, reject) => {
      const img = new Image()
      img.onload  = () => resolve(img)
      img.onerror = reject
      img.src = url
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}

export default async function downscaleImage(file) {
  if (!file?.type?.startsWith('image/')) return file
  // SVG is vector - rasterising it would be a downgrade.
  if (file.type === 'image/svg+xml') return file

  try {
    const bitmap = await decode(file)
    const width  = bitmap.width  ?? bitmap.naturalWidth
    const height = bitmap.height ?? bitmap.naturalHeight
    if (!width || !height) return file

    // Already modest in both dimensions and weight - leave it alone.
    if (Math.max(width, height) <= MAX_EDGE && file.size <= SKIP_BYTES) {
      bitmap.close?.()
      return file
    }

    const blob = await toScaledBlob(bitmap, width, height)
    bitmap.close?.()
    if (!blob || blob.size >= file.size) return file

    const name = (file.name || 'image').replace(/\.[^.]+$/, '') + '.webp'
    return new File([blob], name, { type: 'image/webp', lastModified: Date.now() })
  } catch {
    return file
  }
}
