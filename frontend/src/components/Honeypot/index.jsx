import { forwardRef } from 'react'
import styles from './Honeypot.module.css'

// A field people never see or reach. Bots that fill every input fill this one too.
const Honeypot = forwardRef(function Honeypot(_props, ref) {
  return (
    <div className={styles.trap} aria-hidden="true">
      <label>
        Leave this empty
        <input ref={ref} type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
      </label>
    </div>
  )
})

export default Honeypot

/** True when the trap field was filled in, i.e. the submission is almost certainly a bot. */
export const caughtBot = ref => Boolean(ref.current?.value)
