import { useState, useEffect } from 'react'
import { getMessages, markMessageRead, deleteMessage } from '../../../../firebase'
import { useToast } from '../../../../context/ToastContext'
import styles from '../../Admin.module.css'

export default function MessagesSection() {
  const { addToast } = useToast()
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [expanded, setExpanded] = useState(null)

  const load = () => getMessages().then(setMessages).finally(() => setLoading(false))
  useEffect(() => { load() }, [])

  const displayed = filter === 'unread' ? messages.filter(m => !m.read) : messages
  const unreadCount = messages.filter(m => !m.read).length

  async function toggleRead(m) {
    await markMessageRead(m.id, !m.read)
    setMessages(prev => prev.map(x => x.id === m.id ? { ...x, read: !x.read } : x))
  }

  async function remove(m) {
    if (!window.confirm('Delete this message?')) return
    await deleteMessage(m.id)
    setMessages(prev => prev.filter(x => x.id !== m.id))
    addToast({ type: 'success', title: 'Message deleted' })
  }

  const fmt = (ts) => {
    if (!ts) return '-'
    const d = ts.toDate ? ts.toDate() : new Date(ts)
    return d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div>
      <div className={styles.sectionHeader}>
        <span className={styles.intro} style={{ margin: 0 }}>
          {unreadCount > 0 ? <span className={styles.unreadBadge}>{unreadCount} new</span> : 'Contact-form submissions land here.'}
        </span>
        <div className={styles.filters}>
          <button className={`${styles.btn} ${styles.btnSm} ${filter === 'all' ? styles.btnPrimary : styles.btnOutline}`} onClick={() => setFilter('all')}>All</button>
          <button className={`${styles.btn} ${styles.btnSm} ${filter === 'unread' ? styles.btnPrimary : styles.btnOutline}`} onClick={() => setFilter('unread')}>Unread</button>
        </div>
      </div>

      {loading ? <p className={styles.empty}>Loading…</p>
        : displayed.length === 0 ? <p className={styles.empty}>No messages here.</p>
        : (
          <div className={styles.messageList}>
            {displayed.map(m => (
              <div key={m.id} className={`${styles.messageCard} ${!m.read ? styles.unread : ''}`}>
                <div className={styles.msgHeader} onClick={() => setExpanded(expanded === m.id ? null : m.id)}>
                  <div className={styles.msgMeta}>
                    {!m.read && <span className={styles.dot} />}
                    <strong>{m.name}</strong>
                    <span className={styles.msgEmail}>{m.email}</span>
                    {m.subject && <span className={styles.msgSubject}>· {m.subject}</span>}
                  </div>
                  <span className={styles.msgDate}>{fmt(m.createdAt)}</span>
                </div>
                {expanded === m.id && (
                  <div className={styles.msgBody}>
                    <p className={styles.msgText}>{m.message}</p>
                    <div className={styles.msgActions}>
                      <button className={`${styles.btn} ${styles.btnOutline} ${styles.btnSm}`} onClick={() => toggleRead(m)}>{m.read ? 'Mark Unread' : 'Mark Read'}</button>
                      <a href={`mailto:${m.email}`} className={`${styles.btn} ${styles.btnOutline} ${styles.btnSm}`}>Reply by Email</a>
                      <button className={`${styles.btn} ${styles.btnDanger} ${styles.btnSm}`} onClick={() => remove(m)}>Delete</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
    </div>
  )
}
