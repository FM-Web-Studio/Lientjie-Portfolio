import { getBioSection, getProjects, getContent } from '../firebase'
import { SITE_URL } from '../content/seo'
import { GROUP_FIELDS, resolveGroup } from '../content/siteCopy'

const clean = (v) => String(v ?? '').replace(/\s+/g, ' ').trim()
const filled = (list, ...keys) => (list ?? []).filter(x => keys.some(k => clean(x?.[k])))

// Same rule as the About page: a link typed without https:// still has to work.
const href = (raw) => {
  const url = clean(raw)
  if (!url) return null
  return /^(https?:|mailto:|tel:)/i.test(url) ? url : `https://${url}`
}

// Reads the same documents the About page shows, fresh, at the moment of download.
// The site copy is read again too, so an early click never prints the code defaults.
export async function gather() {
  const [content, profile, education, experience, achievements, skills, projects] = await Promise.all([
    getContent(),
    getBioSection('profile'),
    getBioSection('education'),
    getBioSection('experience'),
    getBioSection('achievements'),
    getBioSection('skills'),
    getProjects(),
  ])
  const [cv, info, about] = ['cv', 'contact', 'about'].map(g => resolveGroup(GROUP_FIELDS[g], content?.[g]))

  const reach = [
    info.email && { key: 'Email', value: info.email, href: `mailto:${info.email}` },
    info.phone && { key: 'Phone', value: info.phone, href: `tel:${info.phone.replace(/[^\d+]/g, '')}` },
    info.location && { key: 'Location', value: info.location },
    { key: 'Portfolio', value: SITE_URL.replace(/^https?:\/\//, ''), href: SITE_URL },
    info.linkedin && { key: 'LinkedIn', value: href(info.linkedin).replace(/^https?:\/\/(www\.)?/, '').replace(/\/+$/, ''), href: href(info.linkedin) },
    info.instagram && { key: 'Instagram', value: info.instagramLabel || 'Instagram', href: href(info.instagram) },
  ].filter(Boolean)

  const count = Math.max(0, Number.parseInt(cv.projectCount, 10) || 0)

  return {
    name: clean(profile?.name) || about.fallbackName,
    title: clean(profile?.title) || about.fallbackTitle,
    photo: clean(cv.photo).toLowerCase() === 'no' ? null : profile?.profileImage,
    bio: profile?.bio ?? '',
    reach,
    education: filled(education?.items, 'degree', 'institution'),
    experience: filled(experience?.items, 'role', 'company'),
    achievements: filled(achievements?.items, 'title'),
    skills: (skills?.categories ?? [])
      .map(c => ({ name: clean(c.name), items: (c.items ?? []).map(i => clean(i?.label)).filter(Boolean) }))
      .filter(c => c.items.length),
    projects: projects.filter(p => p.hidden !== true && clean(p.title)).slice(0, count),
    languages: clean(cv.languages),
    references: clean(cv.references),
    site: SITE_URL,
    t: cv,
  }
}
