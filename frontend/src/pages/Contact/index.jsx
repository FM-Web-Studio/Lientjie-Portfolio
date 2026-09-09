import { useState } from 'react'
import { createMessage } from '../../firebase'
import { Reveal } from '../../components'
import { useToast } from '../../context/ToastContext'
import { useContent } from '../../context/ContentContext'
import styles from './Contact.module.css'

const EMPTY = { name: '', email: '', subject: '', message: '' }

const FIELDS = [
  { name: 'name',    label: 'Name',    type: 'text',  autoComplete: 'name',  required: true  },
  { name: 'email',   label: 'Email',   type: 'email', autoComplete: 'email', required: true  },
  { name: 'subject', label: 'Subject', type: 'text',  autoComplete: 'off',   required: false },
]

function validate(data) {
  const e = {}
  if (!data.name.trim())  e.name  = 'Required'
  if (!data.email.trim()) e.email = 'Required'
  /* Deliberately permissive. A strict RFC-5322 pattern rejects valid
     addresses, and the real check is whether the reply arrives - this only
     catches obvious typos before the message is written to Firestore. */
  else if (!/\S+@\S+\.\S+/.test(data.email)) e.email = 'Not a valid address'
  if (!data.message.trim()) e.message = 'Required'
  return e
}

function buildDetails(info) {
  return [
    info.email && { key: 'Email', value: info.email, href: `mailto:${info.email}` },
    info.phone && {
      key: 'Phone',
      value: info.phone,
      href: `tel:${info.phone.replace(/\s+/g, '')}`,
    },
    info.location && { key: 'Location', value: info.location },
    info.instagram && {
      key: 'Instagram',
      value: info.instagramLabel || 'Instagram',
      href: info.instagram,
      external: true,
    },
    info.linkedin && { key: 'LinkedIn', value: 'LinkedIn', href: info.linkedin, external: true },
    info.responseTime && { key: 'Response time', value: info.responseTime },
  ].filter(Boolean)
}

export default function Contact() {
  const { addToast } = useToast()
  const { copy } = useContent()
  const t = copy('contactPage')
  const details = buildDetails(copy('contact'))

  const [form,    setForm]    = useState(EMPTY)
  const [errors,  setErrors]  = useState({})
  const [touched, setTouched] = useState({})
  const [status,  setStatus]  = useState('idle')

  function handleChange(e) {
    const { name, value } = e.target
    const next = { ...form, [name]: value }
    setForm(next)
    // Only re-validate a field the reader has already left, so an error does
    // not appear while they are still mid-word on their first pass.
    if (touched[name]) setErrors(p => ({ ...p, [name]: validate(next)[name] }))
  }

  function handleBlur(e) {
    const { name } = e.target
    setTouched(p => ({ ...p, [name]: true }))
    setErrors(p => ({ ...p, [name]: validate(form)[name] }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate(form)
    if (Object.keys(errs).length) {
      setErrors(errs)
      setTouched({ name: true, email: true, subject: true, message: true })
      return
    }
    setStatus('sending')
    try {
      await createMessage(form)
      setStatus('sent')
      setForm(EMPTY)
      setTouched({})
      setErrors({})
      addToast({
        type: 'success',
        title: 'Message sent',
        message: t.successBody,
      })
    } catch {
      setStatus('idle')
      addToast({
        type: 'error',
        title: 'Something went wrong',
        message: 'Please try again, or email directly.',
      })
    }
  }

  const sending = status === 'sending'

  return (
    <>
      {/* ════ HEADER ════════════════════════════════════════════════════════ */}
      <header className={`tone-accent ${styles.head}`}>
        <div className="grid12">
          <Reveal className={styles.headType} variant="rise">
            <p className={styles.eyebrow}>{t.eyebrow}</p>
            <h1 className={styles.title}>
              {t.heading}
            </h1>
          </Reveal>
          <Reveal className={styles.headSub} variant="rise-sm" index={1}>
            <p className={styles.sub}>{t.sub}</p>
          </Reveal>
        </div>
      </header>

      {/* ════ FORM + DETAILS ════════════════════════════════════════════════
          Form on the left seven columns, details on the right three. Not a
          centred card. */}
      <section className={`tone-base ${styles.body}`}>
        <div className="grid12">
          <div className={styles.formCol}>
            {status === 'sent' ? (
              <Reveal className={styles.sent} variant="rise">
                <p className={styles.sentMark} aria-hidden="true">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
                       stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </p>
                <h2 className={styles.sentTitle}>{t.successTitle}</h2>
                <p className={styles.sentBody}>{t.successBody}</p>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setStatus('idle')}
                >
                  Send another
                </button>
              </Reveal>
            ) : (
              <form onSubmit={handleSubmit} noValidate>
                <div className={styles.fields}>
                  {FIELDS.map(f => (
                    <div key={f.name} className={styles.field}>
                      <label className={styles.label} htmlFor={f.name}>
                        {f.label}
                        {f.required && <span className={styles.req} aria-hidden="true">*</span>}
                      </label>
                      <input
                        id={f.name}
                        name={f.name}
                        type={f.type}
                        value={form[f.name]}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        autoComplete={f.autoComplete}
                        className={`${styles.input} ${
                          errors[f.name] && touched[f.name] ? styles.inputErr : ''
                        }`}
                        /* aria-invalid and aria-describedby are set together:
                           the first announces that the field is wrong, the
                           second points at the text saying how. */
                        aria-invalid={errors[f.name] && touched[f.name] ? 'true' : undefined}
                        aria-describedby={
                          errors[f.name] && touched[f.name] ? `${f.name}-err` : undefined
                        }
                      />
                      {errors[f.name] && touched[f.name] && (
                        <span className={styles.err} id={`${f.name}-err`} role="alert">
                          {errors[f.name]}
                        </span>
                      )}
                    </div>
                  ))}

                  <div className={`${styles.field} ${styles.fieldWide}`}>
                    <label className={styles.label} htmlFor="message">
                      Message
                      <span className={styles.req} aria-hidden="true">*</span>
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      rows={7}
                      value={form.message}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className={`${styles.input} ${styles.textarea} ${
                        errors.message && touched.message ? styles.inputErr : ''
                      }`}
                      aria-invalid={errors.message && touched.message ? 'true' : undefined}
                      aria-describedby={
                        errors.message && touched.message ? 'message-err' : undefined
                      }
                    />
                    {errors.message && touched.message && (
                      <span className={styles.err} id="message-err" role="alert">
                        {errors.message}
                      </span>
                    )}
                  </div>
                </div>

                <div className={styles.actions}>
                  <button
                    type="submit"
                    className="btn btn-accent"
                    disabled={sending}
                  >
                    {sending ? 'Sending…' : t.submitLabel}
                  </button>
                  <p className={styles.note}>Fields marked * are required.</p>
                </div>
              </form>
            )}
          </div>

          {/* ── Details rail ─────────────────────────────────────────────── */}
          <Reveal className={`tone-accent-deep ${styles.detailsCol}`} variant="rise-sm" index={1}>
            <p className={styles.detailsHead}>{t.detailsTitle}</p>
            <dl className={styles.details}>
              {details.map(d => (
                <div key={d.key} className={styles.detail}>
                  <dt className={styles.detailKey}>{d.key}</dt>
                  <dd className={styles.detailVal}>
                    {d.href ? (
                      <a
                        href={d.href}
                        className={styles.detailLink}
                        {...(d.external
                          ? { target: '_blank', rel: 'noopener noreferrer' }
                          : {})}
                      >
                        {d.value}
                      </a>
                    ) : d.value}
                  </dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>
      </section>
    </>
  )
}
