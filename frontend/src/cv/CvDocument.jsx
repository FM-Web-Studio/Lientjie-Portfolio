import { Buffer } from 'buffer/'
import { Document, Page, View, Text, Image, Link, Font, StyleSheet, pdf } from '@react-pdf/renderer'
import serif300i from '@fontsource/cormorant-garamond/files/cormorant-garamond-latin-300-italic.woff?url'
import serif400 from '@fontsource/cormorant-garamond/files/cormorant-garamond-latin-400-normal.woff?url'
import serif400i from '@fontsource/cormorant-garamond/files/cormorant-garamond-latin-400-italic.woff?url'
import serif500 from '@fontsource/cormorant-garamond/files/cormorant-garamond-latin-500-normal.woff?url'
import sans400 from '@fontsource/dm-sans/files/dm-sans-latin-400-normal.woff?url'
import sans500 from '@fontsource/dm-sans/files/dm-sans-latin-500-normal.woff?url'
import sans600 from '@fontsource/dm-sans/files/dm-sans-latin-600-normal.woff?url'
import mono400 from '@ibm/plex-mono/fonts/complete/woff/IBMPlexMono-Regular.woff?url'
import mono500 from '@ibm/plex-mono/fonts/complete/woff/IBMPlexMono-Medium.woff?url'

// The CV as an A4 PDF, built in the browser and loaded only when someone asks for it.
// react-pdf checks Buffer.isBuffer when it loads an image, which browsers do not have.
globalThis.Buffer ??= Buffer

Font.register({
  family: 'Serif',
  fonts: [
    { src: serif300i, fontWeight: 300, fontStyle: 'italic' },
    { src: serif400, fontWeight: 400 },
    { src: serif400i, fontWeight: 400, fontStyle: 'italic' },
    { src: serif500, fontWeight: 500 },
  ],
})
Font.register({
  family: 'Sans',
  fonts: [
    { src: sans400, fontWeight: 400 },
    { src: sans500, fontWeight: 500 },
    { src: sans600, fontWeight: 600 },
  ],
})
Font.register({
  family: 'Mono',
  fonts: [
    { src: mono400, fontWeight: 400 },
    { src: mono500, fontWeight: 500 },
  ],
})
// Whole words only. A hyphenated name, place or link reads badly on a CV.
Font.registerHyphenationCallback(word => [word])

// The light theme's values, restated because a PDF cannot read CSS variables.
const INK = '#1A1A1A'
const INK_2 = '#3D3D3D'
const INK_3 = '#555555'
const ACCENT = '#115F29'
const MINT = '#B0EFC3'
const RULE = '#D2D2D2'
const HAIR = 0.6

const SIDE = 44
const LEAD = 104
const PAGE_H = 841.89

const s = StyleSheet.create({
  page: { paddingTop: 40, paddingBottom: 78, paddingHorizontal: SIDE, fontFamily: 'Sans', fontSize: 8.8, lineHeight: 1.45, color: INK, backgroundColor: '#FFFFFF' },

  head: { flexDirection: 'row', alignItems: 'flex-end' },
  headType: { flex: 1, paddingRight: 20 },
  eyebrow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  eyebrowLine: { width: 24, height: HAIR, backgroundColor: ACCENT, marginRight: 8 },
  mono: { fontFamily: 'Mono', fontSize: 6.8, letterSpacing: 1.1, textTransform: 'uppercase', color: INK_3 },
  nameFirst: { fontFamily: 'Serif', fontStyle: 'italic', fontWeight: 300, fontSize: 44, lineHeight: 0.92, letterSpacing: -0.8 },
  nameLast: { fontFamily: 'Serif', fontWeight: 400, fontSize: 44, lineHeight: 0.92, letterSpacing: -0.8, marginLeft: 6 },
  dot: { color: ACCENT },
  role: { marginTop: 14, paddingTop: 6, borderTopWidth: HAIR, borderTopColor: RULE, alignSelf: 'flex-start' },
  photo: { width: 90, height: 120, objectFit: 'cover' },

  band: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: MINT, marginTop: 18, paddingTop: 8, paddingBottom: 3, paddingHorizontal: 12 },
  reach: { paddingRight: 10, marginBottom: 5 },
  reachKey: { fontFamily: 'Mono', fontSize: 5.8, letterSpacing: 1, textTransform: 'uppercase', color: '#2B2B2B' },
  reachVal: { fontSize: 8.2, color: '#121212', textDecoration: 'none', marginTop: 1 },

  section: { marginTop: 16 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', paddingBottom: 5, borderBottomWidth: HAIR, borderBottomColor: RULE },
  sectionNum: { fontFamily: 'Mono', fontSize: 7, color: ACCENT, width: LEAD },
  sectionTitle: { fontFamily: 'Serif', fontWeight: 500, fontSize: 15, lineHeight: 1, color: INK },

  lead: { marginLeft: LEAD, paddingTop: 6 },
  bio: { fontFamily: 'Serif', fontSize: 12, lineHeight: 1.32, color: INK },
  bioGap: { marginTop: 5 },

  entry: { flexDirection: 'row', paddingVertical: 5.5, borderBottomWidth: HAIR, borderBottomColor: RULE },
  period: { width: LEAD, paddingRight: 10, paddingTop: 1.6, fontFamily: 'Mono', fontSize: 6.4, letterSpacing: 0.5, lineHeight: 1.4, textTransform: 'uppercase', color: ACCENT },
  entryBody: { flex: 1 },
  entryTitle: { fontSize: 9.4, fontWeight: 600, lineHeight: 1.3, color: INK },
  text: { marginTop: 2, color: INK_2 },
  link: { color: ACCENT, textDecoration: 'none' },

  skills: { flexDirection: 'row', flexWrap: 'wrap', marginLeft: LEAD, paddingTop: 7 },
  skillGroup: { width: '33.33%', paddingRight: 12, marginBottom: 4 },
  skillHead: { fontFamily: 'Mono', fontSize: 6.6, letterSpacing: 0.9, textTransform: 'uppercase', color: ACCENT, marginBottom: 3 },
  skill: { fontSize: 8.8, lineHeight: 1.5, color: INK_2 },

  projects: { flexDirection: 'row', flexWrap: 'wrap', marginLeft: LEAD },
  project: { width: '50%', paddingVertical: 5, paddingRight: 12, borderBottomWidth: HAIR, borderBottomColor: RULE },
  projectTitle: { fontFamily: 'Serif', fontWeight: 500, fontSize: 11.6, lineHeight: 1.2, color: INK },
  projectMeta: { fontSize: 7.8, lineHeight: 1.4, color: INK_3, marginTop: 1 },
  projectYear: { fontFamily: 'Mono', fontSize: 6.4, letterSpacing: 0.5, color: ACCENT },
  inlinePlace: { fontFamily: 'Serif', fontStyle: 'italic', fontWeight: 400, fontSize: 10.6, color: INK_2 },
  note: { marginLeft: LEAD, marginTop: 6, fontSize: 8, color: INK_3 },

  block: { position: 'absolute', left: SIDE, right: SIDE, top: PAGE_H - 50, flexDirection: 'row', alignItems: 'flex-start', borderTopWidth: HAIR, borderTopColor: INK, paddingTop: 5 },
  cell: { paddingRight: 10, marginRight: 10, borderRightWidth: HAIR, borderRightColor: RULE },
  cellLast: { flex: 1, borderRightWidth: 0, marginRight: 0, paddingRight: 0, alignItems: 'flex-end' },
  cellKey: { fontFamily: 'Mono', fontSize: 5.4, letterSpacing: 0.9, textTransform: 'uppercase', color: INK_3 },
  cellVal: { fontSize: 7.2, color: INK, marginTop: 1.5, textDecoration: 'none' },
})

// Three columns, the first wide enough for an email address.
const REACH_W = ['42%', '27%', '31%']

const clean = (v) => String(v ?? '').replace(/\s+/g, ' ').trim()
const bare = (url) => url.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/+$/, '')
const URL_IN_TEXT = /(https?:\/\/[^\s)]+)/g

// Plain text in which any web address becomes a working link.
function Rich({ style, children }) {
  const parts = clean(children).split(URL_IN_TEXT)
  return (
    <Text style={style}>
      {parts.map((p, i) => (i % 2
        ? <Link key={i} src={p} style={s.link}>{bare(p)}</Link>
        : p))}
    </Text>
  )
}

// `keep` holds a short section together, so its heading never ends a page alone.
function Section({ num, title, keep, children }) {
  return (
    <View style={s.section} wrap={!keep}>
      <View style={s.sectionHead} minPresenceAhead={60}>
        <Text style={s.sectionNum}>{num}</Text>
        <Text style={s.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  )
}

function Entry({ period, title, place, text }) {
  const where = clean(place)
  return (
    <View style={s.entry} wrap={false}>
      <Text style={s.period}>{clean(period)}</Text>
      <View style={s.entryBody}>
        {clean(title) && (
          <Text style={s.entryTitle}>
            {clean(title)}
            {where ? <Text style={s.inlinePlace}>{`  ${where}`}</Text> : null}
          </Text>
        )}
        {clean(text) && <Rich style={s.text}>{text}</Rich>}
      </View>
    </View>
  )
}

function CvDocument({ name, title, photo, bio, reach, education, experience, achievements, skills, projects, languages, references, site, t }) {
  const [first, ...rest] = clean(name).split(' ')
  const last = rest.join(' ')
  const paragraphs = String(bio ?? '').split(/\n\s*\n/).map(clean).filter(Boolean)
  const updated = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(new Date())
  const further = [
    languages && { key: t.languagesHeading, value: languages },
    references && { key: t.referencesHeading, value: references },
  ].filter(Boolean)

  const sections = [
    paragraphs.length > 0 && 'profile',
    education.length > 0 && 'education',
    experience.length > 0 && 'experience',
    projects.length > 0 && 'projects',
    achievements.length > 0 && 'achievements',
    skills.length > 0 && 'skills',
    further.length > 0 && 'further',
  ].filter(Boolean)
  const num = (id) => String(sections.indexOf(id) + 1).padStart(2, '0')
  const has = (id) => sections.includes(id)

  return (
    <Document title={`${clean(name)} - ${t.documentLabel}`} author={clean(name)} subject={t.documentLabel} creator={bare(site)} producer={bare(site)}>
      <Page size="A4" style={s.page}>
        <View style={s.head}>
          <View style={s.headType}>
            <View style={s.eyebrow}>
              <View style={s.eyebrowLine} />
              <Text style={s.mono}>{t.documentLabel}</Text>
            </View>
            <Text style={s.nameFirst}>{first}</Text>
            {last
              ? <Text style={s.nameLast}>{last}<Text style={s.dot}>.</Text></Text>
              : null}
            {clean(title) && <Text style={[s.mono, s.role]}>{clean(title)}</Text>}
          </View>
          {photo && <Image style={s.photo} src={photo} />}
        </View>

        {reach.length > 0 && (
          <View style={s.band}>
            {reach.map((r, i) => (
              <View key={r.key} style={[s.reach, { width: REACH_W[i % 3] }]}>
                <Text style={s.reachKey}>{r.key}</Text>
                {r.href
                  ? <Link src={r.href} style={s.reachVal}>{r.value}</Link>
                  : <Text style={s.reachVal}>{r.value}</Text>}
              </View>
            ))}
          </View>
        )}

        {has('profile') && (
          <Section num={num('profile')} title={t.profileHeading}>
            <View style={s.lead}>
              {paragraphs.map((p, i) => <Text key={i} style={[s.bio, i > 0 && s.bioGap]}>{p}</Text>)}
            </View>
          </Section>
        )}

        {has('education') && (
          <Section num={num('education')} title={t.educationHeading}>
            {education.map((e, i) => (
              <Entry key={i} period={e.period} title={e.degree} place={e.institution} text={e.description} />
            ))}
          </Section>
        )}

        {has('experience') && (
          <Section num={num('experience')} title={t.experienceHeading}>
            {experience.map((e, i) => (
              <Entry key={i} period={e.period} title={e.role} place={e.company} text={e.description} />
            ))}
          </Section>
        )}

        {has('projects') && (
          <Section num={num('projects')} title={t.projectsHeading}>
            <View style={s.projects}>
              {projects.map((p, i) => (
                <View key={i} style={s.project} wrap={false}>
                  <Text style={s.projectTitle}>{clean(p.title)}</Text>
                  <Text style={s.projectMeta}>
                    {clean(p.year) && <Text style={s.projectYear}>{`${clean(p.year)}   `}</Text>}
                    {clean(p.category)}
                  </Text>
                </View>
              ))}
            </View>
            <Text style={s.note}>
              {t.projectsNote} <Link src={`${site}/work`} style={s.link}>{bare(site)}/work</Link>
            </Text>
          </Section>
        )}

        {has('achievements') && (
          <Section num={num('achievements')} title={t.achievementsHeading}>
            {achievements.map((a, i) => (
              <Entry key={i} period={a.period} title={a.title} place={a.issuer} text={a.description} />
            ))}
          </Section>
        )}

        {has('skills') && (
          <Section keep num={num('skills')} title={t.skillsHeading}>
            <View style={s.skills}>
              {skills.map((g, i) => (
                <View key={i} style={s.skillGroup} wrap={false}>
                  {g.name && <Text style={s.skillHead}>{g.name}</Text>}
                  <Text style={s.skill}>{g.items.join('\n')}</Text>
                </View>
              ))}
            </View>
          </Section>
        )}

        {has('further') && (
          <Section keep num={num('further')} title={t.furtherHeading}>
            {further.map((f, i) => (
              <Entry key={f.key} period={f.key} text={f.value} />
            ))}
          </Section>
        )}

        <View style={s.block} fixed>
          <View style={s.cell}>
            <Text style={s.cellKey}>{t.blockName}</Text>
            <Text style={s.cellVal}>{clean(name)}</Text>
          </View>
          <View style={s.cell}>
            <Text style={s.cellKey}>{t.blockDocument}</Text>
            <Text style={s.cellVal}>{t.documentLabel}</Text>
          </View>
          <View style={s.cell}>
            <Text style={s.cellKey}>{t.blockPortfolio}</Text>
            <Link src={site} style={s.cellVal}>{bare(site)}</Link>
          </View>
          <View style={s.cell}>
            <Text style={s.cellKey}>{t.blockUpdated}</Text>
            <Text style={s.cellVal}>{updated}</Text>
          </View>
          <View style={[s.cell, s.cellLast]}>
            <Text style={s.cellKey}>{t.blockSheet}</Text>
            <Text style={s.cellVal} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
          </View>
        </View>
      </Page>
    </Document>
  )
}

// The portrait is shrunk to print size first: the uploaded original can be several MB.
// A failed fetch drops the photo rather than failing the CV.
async function printPhoto(url) {
  if (!url) return null
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const bitmap = await createImageBitmap(await res.blob())
    const scale = Math.min(1, 720 / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close?.()
    return canvas.toDataURL('image/jpeg', 0.86)
  } catch {
    return null
  }
}

export async function renderCv(props) {
  const photo = await printPhoto(props.photo)
  return pdf(<CvDocument {...props} photo={photo} />).toBlob()
}
