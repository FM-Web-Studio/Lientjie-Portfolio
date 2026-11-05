import { useState } from 'react'
import { useContent } from '../../context/ContentContext'
import { useToast } from '../../context/ToastContext'
import { gather } from '../../cv/gather'
import styles from './CvButton.module.css'

const loadEngine = () => import('../../cv')

function save(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60000)
}

// Builds the CV PDF from the live site content and downloads it.
// The PDF engine is large, so it is fetched on hover or focus and never on page load.
export default function CvButton({ className = 'btn', showIcon = true }) {
  const { copy } = useContent()
  const { addToast } = useToast()
  const cv = copy('cv')
  const [busy, setBusy] = useState(false)

  async function download() {
    if (busy) return
    setBusy(true)
    try {
      const [data, { renderCv }] = await Promise.all([
        gather(),
        loadEngine(),
      ])
      const blob = await renderCv(data)
      save(blob, `${data.name} CV.pdf`)
    } catch (err) {
      console.error('[CV] download failed:', err)
      addToast({ type: 'error', title: 'The CV could not be made', message: 'Please try again in a moment.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      className={`${className} ${styles.cv}`}
      onClick={download}
      onPointerEnter={loadEngine}
      onFocus={loadEngine}
      aria-busy={busy}
    >
      {busy ? cv.busyLabel : cv.buttonLabel}
      {showIcon && (
        <svg className={busy ? styles.spin : styles.icon} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {busy
            ? <path d="M12 3a9 9 0 1 0 9 9" />
            : <><path d="M12 4v11" /><path d="m7 10 5 5 5-5" /><path d="M5 20h14" /></>}
        </svg>
      )}
    </button>
  )
}
