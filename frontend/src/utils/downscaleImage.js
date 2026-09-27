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

// 4096 on the long edge: the browser's own pinch-zoom goes well past a
// fit-to-screen view, and presentation boards are read through their linework.
// Earlier caps of 2000 and 3200 softened it as soon as anyone zoomed in.
const MAX_EDGE = 4096

// Mobile Safari silently hands back a blank canvas past ~16.7 megapixels, so
// area is capped too, below that limit.
const MAX_PIXELS = 12_000_000

// 0.95, not 0.92: black hairlines on white are the worst case for a lossy
// codec, and the ringing it leaves is what reads as a compressed image.
const QUALITY = 0.95

// An image already inside the caps is passed through untouched however heavy.
// Re-encoding it would cost a generation of quality and save nothing visible.
// Past this it is re-encoded at its own size, where bandwidth wins.
const HUGE_BYTES = 12 * 1024 * 1024

/** Draw `bitmap` into a canvas scaled to fit both caps and return a WebP blob. */
function toScaledBlob(bitmap, width, height) {
  const scale = Math.min(
    1,
    MAX_EDGE / Math.max(width, height),
    Math.sqrt(MAX_PIXELS / (width * height)),
  )
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

    // Within both caps: leave it alone rather than spend a generation of
    // quality on an image that needs no resizing.
    const withinCaps =
      Math.max(width, height) <= MAX_EDGE && width * height <= MAX_PIXELS
    if (withinCaps && file.size <= HUGE_BYTES) {
      bitmap.close?.()
      return file
    }

    const blob = await toScaledBlob(bitmap, width, height)
    bitmap.close?.()
    if (!blob) return file
    // Rejecting a heavier re-encode only makes sense when nothing was
    // resized; over the caps, the smaller bitmap is the whole point.
    if (withinCaps && blob.size >= file.size) return file

    const name = (file.name || 'image').replace(/\.[^.]+$/, '') + '.webp'
    return new File([blob], name, { type: 'image/webp', lastModified: Date.now() })
  } catch {
    return file
  }
}
