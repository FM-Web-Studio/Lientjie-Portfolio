import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks'
import { useContent } from '../../context/ContentContext'
import { useToast } from '../../context/ToastContext'
import { signInWithGoogle, signOut, getMessages } from '../../firebase'
import Button from '../../components/Button'
import { ThemeToggle } from '../../components/NavigationBar'
import { ArrowLeft, ArrowUpRight, Spinner } from '../../components/Icons'
import ProfileSection from './sections/ProfileSection'
import ContactInfoSection from './sections/ContactInfoSection'
import SiteCopySection from './sections/SiteCopySection'
import EducationSection from './sections/EducationSection'
import ExperienceSection from './sections/ExperienceSection'
import AchievementsSection from './sections/AchievementsSection'
import SkillsSection from './sections/SkillsSection'
import ProjectsSection from './sections/ProjectsSection'
import InterestsSection from './sections/InterestsSection'
import MessagesSection from './sections/MessagesSection'
import {
  IconUser, IconCard, IconType, IconCap, IconBriefcase, IconAward, IconBars,
  IconPlan, IconImage, IconInbox, IconLogout, IconChevDown, IconMenu,
} from './icons'
import { SectionContext, cx, useMediaQuery } from './ui'
import styles from './Admin.module.css'
import '../../styles/admin.css'

const GROUPS = ['Identity', 'Content', 'Work', 'Inbox']

const SECTIONS = [
  { id: 'profile',      group: 'Identity', title: 'Profile',      Icon: IconUser },
  { id: 'contact',      group: 'Identity', title: 'Contact Info', Icon: IconCard },
  { id: 'copy',         group: 'Content',  title: 'Site Copy',    Icon: IconType },
  { id: 'education',    group: 'Content',  title: 'Education',    Icon: IconCap },
  { id: 'experience',   group: 'Content',  title: 'Experience',   Icon: IconBriefcase },
  { id: 'achievements', group: 'Content',  title: 'Achievements', Icon: IconAward },
  { id: 'skills',       group: 'Content',  title: 'Skills',       Icon: IconBars },
  { id: 'projects',     group: 'Work',     title: 'Projects',     Icon: IconPlan },
  { id: 'interests',    group: 'Work',     title: 'Interests',    Icon: IconImage },
  { id: 'messages',     group: 'Inbox',    title: 'Messages',     Icon: IconInbox },
]

function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3zM12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22zM6.4 14c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.4H3.1a10 10 0 0 0 0 9.2zM12 5.9c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.4L6.4 10c.8-2.3 3-4.1 5.6-4.1z" />
    </svg>
  )
}

// Every signed-out state shares one calm, centred card.
function Gate({ children, status }) {
  return (
    <div className={cx('admin-scope', styles.gate)}>
      <header className={styles.gateTop}>
        <Link to="/" className={cx('link', styles.gateBack)}><ArrowLeft size={14} /> Back to site</Link>
        <ThemeToggle />
      </header>
      <main className={styles.gateMain} aria-busy={status === 'loading' || undefined}>
        <div className={cx('card', styles.gateCard)}>{children}</div>
      </main>
    </div>
  )
}

export default function Admin() {
  const { user, isAdmin, loading } = useAuth()
  const siteName = useContent().copy('brand').siteName
  const initials = siteName.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const { addToast } = useToast()
  const [view, setView] = useState('profile')
  const [signingIn, setSigningIn] = useState(false)
  const [navOpen, setNavOpen] = useState(false)
  const sheetBtnRef = useRef(null)
  const wasOpen = useRef(false)
  const [unread, setUnread] = useState(0)
  const isMobile = useMediaQuery('(max-width: 900px)')
  const mainRef = useRef(null)
  const itemRefs = useRef({})
  const [indicator, setIndicator] = useState(null)

  useEffect(() => {
    if (!navOpen) return undefined
    const onKey = (e) => { if (e.key === 'Escape') setNavOpen(false) }
    window.addEventListener('keydown', onKey)
    // Move focus into the sheet so keyboard users land on the current section.
    const raf = requestAnimationFrame(() => itemRefs.current[view]?.focus())
    return () => { window.removeEventListener('keydown', onKey); cancelAnimationFrame(raf) }
  }, [navOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (!isMobile) setNavOpen(false) }, [isMobile])

  // Closing the sheet hands focus back to the button that opened it.
  useEffect(() => {
    if (wasOpen.current && !navOpen && isMobile) sheetBtnRef.current?.focus({ preventScroll: true })
    wasOpen.current = navOpen
  }, [navOpen, isMobile])

  // One read for the sidebar badge. The inbox reports later changes back through onUnread.
  useEffect(() => {
    if (!isAdmin) return undefined
    let live = true
    getMessages().then(ms => { if (live) setUnread(ms.filter(m => !m.read).length) }).catch(() => {})
    return () => { live = false }
  }, [isAdmin])

  // The indicator glides to the active item; measured rather than computed so it survives any label length.
  const measure = useCallback(() => {
    const el = itemRefs.current[view]
    if (!el) return
    setIndicator(prev => ({ y: el.offsetTop, h: el.offsetHeight, ready: prev !== null }))
  }, [view])
  useLayoutEffect(() => { measure() }, [measure, isAdmin, isMobile, navOpen])
  useEffect(() => {
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [measure])

  const openSection = (id) => {
    setView(id)
    setNavOpen(false)
    mainRef.current?.scrollTo({ top: 0 })
  }

  // Up and down arrows walk the section list, Home and End jump to its ends.
  function onNavKey(e) {
    const keys = ['ArrowDown', 'ArrowUp', 'Home', 'End']
    if (!keys.includes(e.key)) return
    const items = SECTIONS.map(s => itemRefs.current[s.id]).filter(Boolean)
    const at = items.indexOf(document.activeElement)
    if (at === -1) return
    e.preventDefault()
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1
      : (at + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length
    items[next].focus()
  }

  async function handleSignIn() {
    setSigningIn(true)
    try { await signInWithGoogle() }
    catch (err) {
      if (err?.code !== 'auth/popup-closed-by-user') addToast({ type: 'error', title: 'Sign-in failed', message: 'Could not sign in with Google.' })
    } finally { setSigningIn(false) }
  }

  async function handleSignOut() {
    try { await signOut() } catch { addToast({ type: 'error', title: 'Sign-out failed' }) }
  }

  if (loading) {
    return (
      <Gate status="loading">
        <div className={styles.gateLoading} role="status">
          <Spinner size={20} className={styles.spin} />
          <span>Checking your sign-in</span>
        </div>
      </Gate>
    )
  }

  if (!user) {
    return (
      <Gate>
        <span className={styles.gateMark} aria-hidden="true">{initials}</span>
        <h1 className={styles.gateTitle}>{siteName}</h1>
        <p className={styles.gateLead}>Welcome back. Sign in to edit projects, copy and messages.</p>
        <Button
          variant="accent"
          size="lg"
          magnetic={false}
          className={styles.gateBtn}
          onClick={handleSignIn}
          disabled={signingIn}
          icon={signingIn ? <Spinner size={16} className={styles.spin} /> : <GoogleMark />}
        >
          {signingIn ? 'Waiting for Google…' : 'Sign in with Google'}
        </Button>
        <p className={styles.gateNote}>Opens a Google pop-up</p>
      </Gate>
    )
  }

  if (!isAdmin) {
    return (
      <Gate>
        <span className={cx(styles.gateMark, styles.gateMarkErr)} aria-hidden="true">!</span>
        <h1 className={styles.gateTitle}>Not on the list</h1>
        <p className={styles.gateLead}>
          <strong className={styles.gateEmail}>{user.email}</strong> is not on the admin list.
          Sign out and try a different Google account.
        </p>
        <Button magnetic={false} className={styles.gateBtn} onClick={handleSignOut} icon={<IconLogout size={16} />}>Sign out</Button>
      </Gate>
    )
  }

  const active = SECTIONS.find(s => s.id === view) ?? SECTIONS[0]
  const counts = { messages: unread }

  function renderSection() {
    switch (view) {
      case 'profile':      return <ProfileSection />
      case 'contact':      return <ContactInfoSection />
      case 'copy':         return <SiteCopySection />
      case 'education':    return <EducationSection />
      case 'experience':   return <ExperienceSection />
      case 'achievements': return <AchievementsSection />
      case 'skills':       return <SkillsSection />
      case 'projects':     return <ProjectsSection />
      case 'interests':    return <InterestsSection />
      case 'messages':     return <MessagesSection onUnread={setUnread} />
      default:             return null
    }
  }

  return (
    <div className={cx('admin-scope', styles.page)}>
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true">{initials}</span>
          <span className={styles.brandText}>
            <strong>{siteName}</strong>
            <span>Content studio</span>
          </span>
        </div>

        <button
          ref={sheetBtnRef}
          type="button"
          className={styles.sheetBtn}
          onClick={() => setNavOpen(true)}
          aria-expanded={navOpen}
          aria-controls="admin-nav"
          aria-label={`Sections menu, current: ${active.title}`}
        >
          <IconMenu size={16} />
          <span className={styles.sheetTitle}>{active.title}</span>
          {unread > 0 && <span className={styles.sheetDot} aria-hidden="true" />}
          <IconChevDown size={14} />
        </button>

        <div className={styles.topRight}>
          <span className={styles.userChip} title={user.email}>
            <span className={styles.avatar} aria-hidden="true">{(user.email || '?')[0].toUpperCase()}</span>
            <span className={styles.userEmail}>{user.email}</span>
          </span>
          <ThemeToggle className={styles.themeBtn} />
          <Button to="/" size="sm" magnetic={false} icon={<ArrowUpRight size={13} />} className={styles.viewSite}>View site</Button>
          <Button size="sm" magnetic={false} onClick={handleSignOut} icon={<IconLogout size={15} />} className={styles.signOut} aria-label="Sign out">Sign out</Button>
        </div>
      </header>

      <div className={styles.shell}>
        <div
          className={cx(styles.navBackdrop, navOpen && styles.navBackdropOn)}
          onClick={() => setNavOpen(false)}
          aria-hidden="true"
        />
        <aside
          id="admin-nav"
          className={cx(styles.nav, navOpen && styles.navOpen)}
          aria-label="Sections"
          inert={isMobile && !navOpen ? '' : undefined}
        >
          <div className={styles.sheetHandle} aria-hidden="true" />
          <div className={styles.navList} onKeyDown={onNavKey}>
            {indicator && (
              <span
                className={cx(styles.navIndicator, indicator.ready && styles.navIndicatorLive)}
                style={{ transform: `translateY(${indicator.y}px)`, height: indicator.h }}
                aria-hidden="true"
              />
            )}
            {GROUPS.map(group => (
              <div key={group} className={styles.navGroup}>
                <p className={styles.navGroupLabel}>{group}</p>
                {SECTIONS.filter(s => s.group === group).map(s => {
                  const isActive = s.id === view
                  const count = counts[s.id]
                  return (
                    <button
                      key={s.id}
                      ref={el => { itemRefs.current[s.id] = el }}
                      type="button"
                      className={cx(styles.navItem, isActive && styles.navItemActive)}
                      onClick={() => openSection(s.id)}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <span className={styles.navIcon} aria-hidden="true"><s.Icon size={17} /></span>
                      <span className={styles.navLabel}>{s.title}</span>
                      {count > 0 && <span className={styles.navCount} aria-label={`${count} unread`}>{count}</span>}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
          <div className={styles.navFoot}>
            <span className={styles.navFootLabel}>Signed in as</span>
            <span className={styles.navFootEmail}>{user.email}</span>
          </div>
        </aside>

        <main ref={mainRef} className={styles.content}>
          <SectionContext.Provider value={{ title: active.title, group: active.group }}>
            <div key={view} className={styles.sectionBody}>
              {renderSection()}
            </div>
          </SectionContext.Provider>
        </main>
      </div>
    </div>
  )
}
