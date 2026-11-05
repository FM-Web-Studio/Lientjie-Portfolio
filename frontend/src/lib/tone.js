// A stable colour for a label, so the same category always gets the same tone.
export const TONES = ['mint', 'coral', 'lavender', 'sky', 'peach']

export function toneFor(text = '') {
  let h = 0
  for (const c of String(text).toLowerCase()) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return TONES[h % TONES.length]
}
