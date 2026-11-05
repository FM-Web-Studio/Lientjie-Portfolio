import { useState } from 'react'
import { useContent } from '../../context/ContentContext'
import { useToast } from '../../context/ToastContext'
import { gather } from '../../cv/gather'
import Button from '../Button'
import { Download, Spinner } from '../Icons'
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
// asLink renders a plain text link (footer, menus) instead of a pill button.
export default function CvButton({ variant = 'outline', size = 'md', asLink = false, block = false, className = '' }) {
  const { copy } = useContent()
  const { addToast } = useToast()
  const cv = copy('cv')
  const [busy, setBusy] = useState(false)

  async function download() {
    if (busy) return
    setBusy(true)
    try {
      const [data, { renderCv }] = await Promise.all([gather(), loadEngine()])
      const blob = await renderCv(data)
      save(blob, `${data.name} CV.pdf`)
      addToast({ type: 'success', title: 'CV downloaded', message: 'Check your downloads folder.' })
    } catch (err) {
      console.error('[CV] download failed:', err)
      addToast({ type: 'error', title: 'The CV could not be made', message: 'Please try again in a moment.' })
    } finally {
      setBusy(false)
    }
  }

  const label = busy ? cv.busyLabel : cv.buttonLabel
  const icon = busy ? <Spinner size={14} className={styles.spin} /> : <Download size={14} className={styles.icon} />
  const shared = { onClick: download, onPointerEnter: loadEngine, onFocus: loadEngine, 'aria-busy': busy }

  if (asLink) {
    return (
      <button type="button" className={`link ${styles.cv} ${className}`} {...shared}>
        {label}{icon}
      </button>
    )
  }
  return (
    <Button variant={variant} size={size} block={block} icon={icon} className={`${styles.cv} ${className}`} {...shared}>
      {label}
    </Button>
  )
}
