import { useState, useEffect } from 'react'
import { getMessages, markMessageRead, deleteMessage } from '../../../../firebase'
import { useToast } from '../../../../context/ToastContext'
import Button from '../../../../components/Button'
import { ArrowLeft, Mail } from '../../../../components/Icons'
import { SectionHeader, EmptyState, SkeletonRows, cx } from '../../ui'
import { IconTrash, IconEye, IconEyeOff } from '../../icons'
import styles from '../../Admin.module.css'

const initial = (name) => (name || '?').trim().charAt(0).toUpperCase() || '?'

export default function MessagesSection({ onUnread }) {
  const { addToast } = useToast()
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [expanded, setExpanded] = useState(null)

  const load = () => getMessages().then(setMessages)
    .catch(() => addToast({ type: 'error', title: 'Could not load messages' }))
    .finally(() => setLoading(false))
  useEffect(() => { load() }, [])

  const displayed = filter === 'unread' ? messages.filter(m => !m.read) : messages
  const unreadCount = messages.filter(m => !m.read).length
  const selected = messages.find(m => m.id === expanded) ?? null

  // Keeps the sidebar badge in step with reads, unreads and deletes made here.
  useEffect(() => { if (!loading) onUnread?.(unreadCount) }, [unreadCount, loading]) // eslint-disable-line react-hooks/exhaustive-deps

  async function toggleRead(m) {
    await markMessageRead(m.id, !m.read)
    setMessages(prev => prev.map(x => x.id === m.id ? { ...x, read: !x.read } : x))
  }

  async function remove(m) {
    if (!window.confirm('Delete this message?')) return
    await deleteMessage(m.id)
    setMessages(prev => prev.filter(x => x.id !== m.id))
    if (expanded === m.id) setExpanded(null)
    addToast({ type: 'success', title: 'Message deleted' })
  }

  const fmt = (ts) => {
    if (!ts) return '-'
    const d = ts.toDate ? ts.toDate() : new Date(ts)
    return d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }
  const short = (ts) => {
    if (!ts) return '-'
    const d = ts.toDate ? ts.toDate() : new Date(ts)
    return d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })
  }

  return (
    <div>
      <SectionHeader
        description={<p>Contact-form submissions land here, newest first. Reply opens your email app.</p>}
      />

      <div className={styles.inboxBar}>
        <div className={styles.subTabs} style={{ margin: 0 }} role="group" aria-label="Filter messages">
          <button type="button" className="chip" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>
            All <span className="chip-count">{messages.length}</span>
          </button>
          <button type="button" className="chip" aria-pressed={filter === 'unread'} onClick={() => setFilter('unread')}>
            Unread <span className="chip-count">{unreadCount}</span>
          </button>
        </div>
        {unreadCount > 0 && <span className="badge badge-dot">{unreadCount} new</span>}
      </div>

      {loading ? <SkeletonRows rows={4} />
        : displayed.length === 0 ? (
          <EmptyState icon={<Mail size={20} />} title={filter === 'unread' ? 'All caught up' : 'No messages yet'}>
            {filter === 'unread' ? 'Every message has been read.' : 'When someone uses the contact form, their message appears here.'}
          </EmptyState>
        )
        : (
          <div className={cx(styles.inbox, selected && styles.inboxReading)}>
            <div className={styles.inboxList} role="list" aria-label="Messages">
              {displayed.map((m, i) => (
                <div key={m.id} role="listitem">
                  <button
                    type="button"
                    className={cx(styles.msgRow, !m.read && styles.msgUnread, expanded === m.id && styles.msgRowActive)}
                    style={{ '--i': Math.min(i, 12) }}
                    onClick={() => setExpanded(expanded === m.id ? null : m.id)}
                    aria-expanded={expanded === m.id}
                    aria-controls="msg-pane"
                  >
                    <span className={styles.msgAvatar} aria-hidden="true">{initial(m.name)}</span>
                    <span className={styles.msgLines}>
                      <span className={styles.msgTop}>
                        <span className={styles.msgName}>
                          {!m.read && <><span className={styles.dot} aria-hidden="true" /><span className="visually-hidden">Unread: </span></>}
                          {m.name}
                        </span>
                        <span className={styles.msgDate}>{short(m.createdAt)}</span>
                      </span>
                      {m.subject && <span className={styles.msgSubject}>{m.subject}</span>}
                      <span className={styles.msgSnippet}>{m.message}</span>
                    </span>
                  </button>
                </div>
              ))}
            </div>

            <section id="msg-pane" className={styles.pane} key={selected?.id ?? 'none'} aria-live="polite">
              {selected ? (
                <>
                  <Button size="sm" magnetic={false} className={cx(styles.paneBack, styles.noNudge)} onClick={() => setExpanded(null)} icon={<ArrowLeft size={14} />}>Back</Button>
                  <header className={styles.paneHead}>
                    <h2 className={styles.paneSubject}>{selected.subject || `Message from ${selected.name}`}</h2>
                    <div className={styles.paneFrom}>
                      <span className={cx(styles.msgAvatar, !selected.read && styles.msgUnread)} aria-hidden="true">{initial(selected.name)}</span>
                      <span className={styles.paneWho}>
                        <strong>{selected.name}</strong>
                        <a className="link" href={`mailto:${selected.email}`}>{selected.email}</a>
                      </span>
                      <span className={styles.paneDate}>{fmt(selected.createdAt)}</span>
                    </div>
                  </header>
                  <div className={styles.paneActions}>
                    <Button variant="accent" size="sm" magnetic={false} href={`mailto:${selected.email}`} icon={<Mail size={14} />}>Reply by email</Button>
                    <Button size="sm" magnetic={false} className={styles.noNudge} onClick={() => toggleRead(selected)} icon={selected.read ? <IconEyeOff size={14} /> : <IconEye size={14} />}>
                      {selected.read ? 'Mark unread' : 'Mark read'}
                    </Button>
                    <Button size="sm" magnetic={false} className={cx(styles.danger, styles.noNudge)} onClick={() => remove(selected)} icon={<IconTrash size={14} />}>Delete</Button>
                  </div>
                  <p className={styles.paneText}>{selected.message}</p>
                </>
              ) : (
                <div className={styles.paneEmpty}>
                  <Mail size={28} />
                  <p>Select a message to read it</p>
                  <span className={styles.paneCount}>{unreadCount} unread · {messages.length} total</span>
                </div>
              )}
            </section>
          </div>
        )}
    </div>
  )
}
