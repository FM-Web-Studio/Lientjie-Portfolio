import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { createMessage, CONTACT_LIMITS } from '../../firebase'
import Honeypot from '../../components/Honeypot'
import { Reveal, CvButton, Button, TextReveal, ArrowRight, ArrowUpRight, Check, Mail, Spinner } from '../../components'
import { useToast } from '../../context/ToastContext'
import { useContent } from '../../context/ContentContext'
import styles from './Contact.module.css'

const EMPTY = { name: '', email: '', subject: '', message: '' }

const LIMIT_TEXT = {
  sender: 'You have sent several messages already. Please try again tomorrow, or email directly.',
  everyone: 'The form has had a lot of messages today. Please try again tomorrow, or email directly.',
}

const FIELDS = [
  { name: 'name',    label: 'Name',    type: 'text',  autoComplete: 'name',  required: true,  maxLength: CONTACT_LIMITS.name,    half: true },
  { name: 'email',   label: 'Email',   type: 'email', autoComplete: 'email', required: true,  maxLength: CONTACT_LIMITS.email,   half: true },
  { name: 'subject', label: 'Subject', type: 'text',  autoComplete: 'off',   required: false, maxLength: CONTACT_LIMITS.subject },
]

function validate(data) {
  const e = {}
  if (!data.name.trim())  e.name  = 'Please add your name'
  if (!data.email.trim()) e.email = 'Please add your email'
  // Deliberately permissive: it only catches obvious typos, and is never looser than the server check.
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) e.email = 'That does not look like an email address'
  if (!data.message.trim()) e.message = 'Please write a message'
  return e
}

// Her local time, so a visitor abroad knows when a reply is likely.
function useLocalTime() {
  const fmt = () => new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Johannesburg',
  }).format(new Date())
  const [time, setTime] = useState(fmt)
  useEffect(() => {
    const id = setInterval(() => setTime(fmt()), 15000)
    return () => clearInterval(id)
  }, [])
  return time
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }
  const area = document.createElement('textarea')
  area.value = text
  area.setAttribute('readonly', '')
  area.style.position = 'fixed'
  area.style.opacity = '0'
  document.body.appendChild(area)
  area.select()
  const ok = document.execCommand('copy')
  area.remove()
  if (!ok) throw new Error('copy failed')
}

function Sent({ title, body, onReset }) {
  const heading = useRef(null)
  // Moves focus to the confirmation, so a screen reader hears it and keyboard users are not stranded.
  useEffect(() => { heading.current?.focus() }, [])

  return (
    <div className={styles.sent}>
      <div className={styles.badgeOk} aria-hidden="true">
        <Check size={30} />
        {Array.from({ length: 8 }).map((_, i) => (
          <span key={i} className={styles.spark} style={{ '--r': `${i * 45}deg` }} />
        ))}
      </div>
      <h2 ref={heading} tabIndex={-1} className={styles.sentTitle}>{title}</h2>
      <p className={styles.sentBody}>{body}</p>
      <Button onClick={onReset} icon={<ArrowRight size={14} />}>Send another</Button>
    </div>
  )
}

export default function Contact() {
  const { addToast } = useToast()
  const { copy } = useContent()
  const t = copy('contactPage')
  const info = copy('contact')
  const time = useLocalTime()

  const [form,    setForm]    = useState(EMPTY)
  const [errors,  setErrors]  = useState({})
  const [touched, setTouched] = useState({})
  const [status,  setStatus]  = useState('idle')
  const [copied,  setCopied]  = useState(false)
  const trap = useRef(null)
  // When the form was opened. The server drops anything sent faster than a person can type.
  const openedAt = useRef(Date.now())
  const copiedTimer = useRef(null)
  useEffect(() => () => clearTimeout(copiedTimer.current), [])

  function handleChange(e) {
    const { name, value } = e.target
    const next = { ...form, [name]: value }
    setForm(next)
    // Only re-validate a field the reader has already left, so errors do not appear mid-word.
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
      const first = ['name', 'email', 'message'].find(k => errs[k])
      document.getElementById(first)?.focus()
      return
    }
    setStatus('sending')
    try {
      await createMessage({ ...form, website: trap.current?.value ?? '', elapsed: Date.now() - openedAt.current })
      setStatus('sent')
      setForm(EMPTY)
      setTouched({})
      setErrors({})
      addToast({ type: 'success', title: 'Message sent', message: t.successBody })
    } catch (err) {
      setStatus('idle')
      addToast({
        type: 'error',
        title: err.limit ? 'Too many messages' : 'Something went wrong',
        message: LIMIT_TEXT[err.limit] ?? 'Please try again, or email directly.',
      })
    }
  }

  async function copyEmail() {
    try {
      await copyText(info.email)
      setCopied(true)
      clearTimeout(copiedTimer.current)
      copiedTimer.current = setTimeout(() => setCopied(false), 2200)
      addToast({ type: 'success', title: 'Email copied', message: `${info.email} is on your clipboard.` })
    } catch {
      addToast({ type: 'error', title: 'Could not copy', message: `The address is ${info.email}.` })
    }
  }

  const sending = status === 'sending'
  const showErr = name => Boolean(errors[name] && touched[name])

  const links = [
    info.phone && {
      key: 'Phone',
      value: info.phone,
      href: `tel:${info.phone.replace(/\s+/g, '')}`,
      cursor: { 'data-cursor': 'open', 'data-cursor-label': 'Call' },
    },
    info.instagram && {
      key: 'Instagram',
      value: info.instagramLabel || 'Instagram',
      href: info.instagram,
      external: true,
      cursor: { 'data-cursor': 'open' },
    },
    info.linkedin && {
      key: 'LinkedIn',
      value: 'LinkedIn',
      href: info.linkedin,
      external: true,
      cursor: { 'data-cursor': 'open' },
    },
  ].filter(Boolean)

  const fieldClass = name => `field ${styles.field} ${showErr(name) ? styles.fieldErr : ''}`
  let card = 0

  return (
    <>
      <header className={`container ${styles.hero}`}>
        <Reveal variant="rise-sm">
          <span className={`badge ${styles.status}`}>
            <span className={`${styles.statusDot} pulse`} aria-hidden="true" />
            Open to enquiries
          </span>
        </Reveal>
        <TextReveal key={t.heading} as="h1" by="words" trigger="mount" className={styles.title}>
          {t.heading}
        </TextReveal>
        <Reveal as="p" className={styles.sub} variant="rise" index={2}>{t.sub}</Reveal>
      </header>

      <section className={`container ${styles.body}`}>
        <Reveal className={`card ${styles.formCard}`} variant="rise" index={2}>
          {status === 'sent' ? (
            <Sent
              title={t.successTitle}
              body={t.successBody}
              onReset={() => {
                openedAt.current = Date.now()
                setStatus('idle')
              }}
            />
          ) : (
            <form onSubmit={handleSubmit} noValidate className={styles.form} aria-busy={sending}>
              <div className={styles.formHead}>
                <h2 className={styles.formTitle}>Write a message</h2>
                <span className={styles.formReq}><span aria-hidden="true">*</span> required</span>
              </div>

              <div className={styles.fields}>
                {FIELDS.map(f => (
                  <div key={f.name} className={`${fieldClass(f.name)} ${f.half ? styles.half : ''}`}>
                    <label className="field-label" htmlFor={f.name}>
                      {f.label}
                      {f.required && <span className={styles.req} aria-hidden="true"> *</span>}
                    </label>
                    <input
                      id={f.name}
                      name={f.name}
                      type={f.type}
                      value={form[f.name]}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      autoComplete={f.autoComplete}
                      maxLength={f.maxLength}
                      required={f.required}
                      className="input"
                      // aria-invalid announces that the field is wrong, aria-describedby points at how.
                      aria-invalid={showErr(f.name) ? 'true' : undefined}
                      aria-describedby={showErr(f.name) ? `${f.name}-err` : undefined}
                    />
                    {showErr(f.name) && (
                      <span className={styles.err} id={`${f.name}-err`} role="alert">{errors[f.name]}</span>
                    )}
                  </div>
                ))}

                <div className={fieldClass('message')}>
                  <label className="field-label" htmlFor="message">
                    Message<span className={styles.req} aria-hidden="true"> *</span>
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={6}
                    maxLength={CONTACT_LIMITS.message}
                    value={form.message}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    required
                    className="input"
                    aria-invalid={showErr('message') ? 'true' : undefined}
                    aria-describedby={showErr('message') ? 'message-err message-count' : 'message-count'}
                  />
                  <div className={styles.fieldFoot}>
                    {showErr('message')
                      ? <span className={styles.err} id="message-err" role="alert">{errors.message}</span>
                      : <span />}
                    <span className={styles.count} id="message-count">
                      {form.message.length} / {CONTACT_LIMITS.message}
                    </span>
                  </div>
                </div>
              </div>

              <Honeypot ref={trap} />

              <div className={styles.actions}>
                <Button
                  type="submit"
                  variant="accent"
                  size="lg"
                  disabled={sending}
                  icon={sending ? <Spinner size={16} className={styles.spin} /> : <ArrowRight size={16} />}
                >
                  {sending ? 'Sending' : t.submitLabel}
                </Button>
                <p className={styles.privacy}>
                  Your details are used only to reply to you, and messages are deleted after 12 months.
                  See the <Link to="/privacy" className={styles.inlineLink}>privacy policy</Link>.
                </p>
              </div>
            </form>
          )}
        </Reveal>

        <aside className={styles.side} aria-label={t.detailsTitle}>
          <h2 className={styles.sideTitle}>{t.detailsTitle}</h2>

          {info.email && (
            <Reveal className={`card ${styles.item} ${styles.emailItem}`} variant="rise-sm" index={card++}>
              <button
                type="button"
                className={styles.hit}
                onClick={copyEmail}
                data-cursor="open"
                data-cursor-label="Copy"
                aria-label={`Copy email address ${info.email}`}
              >
                <span className={styles.key}>Email</span>
                <span className={styles.val}>
                  {info.email.split('@')[0]}@<wbr />{info.email.split('@').slice(1).join('@')}
                </span>
                <span className={`${styles.note} ${copied ? styles.noteOk : ''}`} aria-live="polite">
                  {copied ? <><Check size={12} /> Copied</> : 'Click to copy'}
                </span>
              </button>
              <a href={`mailto:${info.email}`} className={styles.mailBtn} aria-label="Open in your mail app" data-cursor="mail">
                <Mail size={16} />
              </a>
            </Reveal>
          )}

          {links.map(d => (
            <Reveal key={d.key} className={`card ${styles.item}`} variant="rise-sm" index={card++}>
              <a
                href={d.href}
                className={styles.hit}
                {...(d.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                {...d.cursor}
              >
                <span className={styles.key}>{d.key}</span>
                <span className={styles.val}>{d.value}</span>
                <span className={styles.arrow} aria-hidden="true"><ArrowUpRight size={14} /></span>
              </a>
            </Reveal>
          ))}

          <div className={styles.pair}>
            {info.responseTime && (
              <Reveal className={`card ${styles.item} ${styles.small}`} variant="rise-sm" index={card++}>
                <span className={styles.key}>Replies</span>
                <span className={styles.val}>{info.responseTime}</span>
              </Reveal>
            )}
            {info.location && (
              <Reveal className={`card ${styles.item} ${styles.small}`} variant="rise-sm" index={card++}>
                <span className={styles.key}>Based in</span>
                <span className={styles.val}>{info.location}</span>
                <span className={styles.note}>{time} local time</span>
              </Reveal>
            )}
          </div>

          <Reveal variant="rise-sm" index={card++}><CvButton block /></Reveal>
        </aside>
      </section>
    </>
  )
}
