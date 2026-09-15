import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks'
import { useToast } from '../../context/ToastContext'
import { signInWithGoogle, signOut } from '../../firebase'
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
import styles from './Admin.module.css'
import '../../styles/admin.css'

const GROUPS = ['Identity', 'Content', 'Work', 'Inbox']

const SECTIONS = [
  { id: 'profile',    group: 'Identity', title: 'Profile',      icon: '👤' },
  { id: 'contact',    group: 'Identity', title: 'Contact Info', icon: '📇' },
  { id: 'copy',       group: 'Content',  title: 'Site Copy',    icon: '📝' },
  { id: 'education',  group: 'Content',  title: 'Education',    icon: '🎓' },
  { id: 'experience', group: 'Content',  title: 'Experience',   icon: '💼' },
  { id: 'achievements', group: 'Content', title: 'Achievements', icon: '🏆' },
  { id: 'skills',     group: 'Content',  title: 'Skills',       icon: '📊' },
  { id: 'projects',   group: 'Work',     title: 'Projects',     icon: '🏛️' },
  { id: 'interests',  group: 'Work',     title: 'Interests',    icon: '🎨' },
  { id: 'messages',   group: 'Inbox',    title: 'Messages',     icon: '✉️' },
]

export default function Admin() {
  const { user, isAdmin, loading } = useAuth()
  const { addToast } = useToast()
  const navigate = useNavigate()
  const [view, setView] = useState('profile')
  const [signingIn, setSigningIn] = useState(false)
  const [navOpen, setNavOpen] = useState(false)

  useEffect(() => {
    if (!navOpen) return undefined
    const onKey = (e) => { if (e.key === 'Escape') setNavOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navOpen])

  const openSection = (id) => { setView(id); setNavOpen(false) }

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
      <div className={`admin-scope ${styles.page}`}>
        <div className={styles.authScreen}><div className={styles.spinner} /></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className={`admin-scope ${styles.page}`}>
        <div className={styles.authScreen}>
          <div className={styles.authCard}>
            <span className={styles.authLogo}>L·M</span>
            <h2 className={styles.authTitle}>Portfolio Admin</h2>
            <p className={styles.authSub}>Sign in with your Google account to continue.</p>
            <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleSignIn} disabled={signingIn}>
              {signingIn ? 'Signing in…' : 'Sign in with Google'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className={`admin-scope ${styles.page}`}>
        <div className={styles.authScreen}>
          <div className={styles.authCard}>
            <p className={styles.notAllowed}>Access denied.</p>
            <p className={styles.authSub}>{user.email} is not on the admin list.</p>
            <button className={`${styles.btn} ${styles.btnOutline}`} onClick={handleSignOut}>Sign Out</button>
          </div>
        </div>
      </div>
    )
  }

  const activeSection = SECTIONS.find(s => s.id === view) ?? SECTIONS[0]

  function renderSection() {
    switch (view) {
      case 'profile':    return <ProfileSection />
      case 'contact':    return <ContactInfoSection />
      case 'copy':       return <SiteCopySection />
      case 'education':  return <EducationSection />
      case 'experience': return <ExperienceSection />
      case 'achievements': return <AchievementsSection />
      case 'skills':     return <SkillsSection />
      case 'projects':   return <ProjectsSection />
      case 'interests':  return <InterestsSection />
      case 'messages':   return <MessagesSection />
      default:           return null
    }
  }

  return (
    <div className={`admin-scope ${styles.page}`}>
      <div className={styles.topbar}>
        <div className={styles.topbarLeft}>
          <button type="button" className={styles.menuBtn} onClick={() => setNavOpen(true)} aria-label="Open sections menu">☰</button>
          <span className={styles.topbarTitle}>Portfolio Admin</span>
        </div>
        <div className={styles.topbarRight}>
          <span className={styles.userEmail}>{user.email}</span>
          {/* Neither of these is the constructive action on this screen, so
              neither takes the filled-accent tier: a solid Sign Out button
              puts the heaviest weight in the panel on the one thing you
              almost never want to press. Ghost, then outline. */}
          <button type="button" className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`} onClick={() => navigate('/')}>View site</button>
          <button type="button" className={`${styles.btn} ${styles.btnOutline} ${styles.btnSm}`} onClick={handleSignOut}>Sign Out</button>
        </div>
      </div>

      <div className={styles.shell}>
        {navOpen && <div className={styles.navBackdrop} onClick={() => setNavOpen(false)} aria-hidden="true" />}
        <aside className={[styles.nav, navOpen ? styles.navOpen : ''].join(' ')} aria-label="Sections">
          {GROUPS.map(group => (
            <div key={group} className={styles.navGroup}>
              <p className={styles.navGroupLabel}>{group}</p>
              {SECTIONS.filter(s => s.group === group).map(s => {
                const active = s.id === view
                return (
                  <div key={s.id} className={[styles.navItem, active ? styles.navItemActive : ''].join(' ')}>
                    <button type="button" className={styles.navItemBtn} onClick={() => openSection(s.id)} aria-current={active ? 'page' : undefined}>
                      <span className={styles.navIcon} aria-hidden="true">{s.icon}</span>
                      <span className={styles.navLabel}>{s.title}</span>
                    </button>
                  </div>
                )
              })}
            </div>
          ))}
        </aside>

        <main className={styles.content}>
          <h2 className={styles.sectionTitle}>{activeSection.title}</h2>
          <div key={view} className={styles.sectionBody}>
            {renderSection()}
          </div>
        </main>
      </div>
    </div>
  )
}
