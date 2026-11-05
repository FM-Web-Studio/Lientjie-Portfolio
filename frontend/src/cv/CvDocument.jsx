import { Children } from 'react'
import { Buffer } from 'buffer/'
import { Document, Page, View, Text, Image, Link, Font, StyleSheet, pdf } from '@react-pdf/renderer'
import w400 from '@fontsource/inter-tight/files/inter-tight-latin-400-normal.woff?url'
import w500 from '@fontsource/inter-tight/files/inter-tight-latin-500-normal.woff?url'
import w600 from '@fontsource/inter-tight/files/inter-tight-latin-600-normal.woff?url'
import w700 from '@fontsource/inter-tight/files/inter-tight-latin-700-normal.woff?url'

// The CV as an A4 PDF, built in the browser and loaded only when someone asks for it.
// Single column on purpose: it reads in the right order on paper, on screen and in applicant tracking systems.
// react-pdf checks Buffer.isBuffer when it loads an image, which browsers do not have.
globalThis.Buffer ??= Buffer

Font.register({
  family: 'Inter',
  fonts: [
    { src: w400, fontWeight: 400 },
    { src: w500, fontWeight: 500 },
    { src: w600, fontWeight: 600 },
    { src: w700, fontWeight: 700 },
  ],
})
// Whole words only. A hyphenated name, place or link reads badly on a CV.
Font.registerHyphenationCallback(word => [word])

const INK = '#141414'
const INK_2 = '#3A3A3A'
const INK_3 = '#6E6E6E'
const LINE = '#DADADA'
const ACCENT = '#115F29'
const MINT = '#B0EFC3'

// One colour per section, deep enough to read in print, each with a pale tint for fills.
const TONE = {
  mint:     { ink: '#115F29', tint: '#E3F7EA', bright: '#B0EFC3' },
  sky:      { ink: '#1D5F99', tint: '#E3F1FC', bright: '#A8DAFF' },
  lavender: { ink: '#5B3FC4', tint: '#EEEAFE', bright: '#CDBEFF' },
  coral:    { ink: '#A3302F', tint: '#FCE9E9', bright: '#F2A7A7' },
  peach:    { ink: '#7A4A1E', tint: '#F7EEE7', bright: '#E3CBB9' },
}
const STRIP = ['mint', 'sky', 'lavender', 'coral', 'peach']

const s = StyleSheet.create({
  page: { paddingTop: 30, paddingBottom: 46, paddingHorizontal: 48, fontFamily: 'Inter', fontSize: 9.2, lineHeight: 1.45, color: INK },

  strip: { position: 'absolute', top: 0, left: 0, right: 0, height: 5, flexDirection: 'row' },
  stripCell: { flex: 1 },
  headPanel: { marginTop: -30, marginHorizontal: -48, paddingHorizontal: 48, paddingTop: 36, paddingBottom: 18, backgroundColor: '#EEF9F2', borderBottomWidth: 0.8, borderBottomColor: '#CFEBD9' },
  head: { flexDirection: 'row', alignItems: 'flex-start' },
  headText: { flex: 1, paddingRight: 16 },
  name: { fontSize: 25, fontWeight: 700, letterSpacing: -0.6, lineHeight: 1.05 },
  title: { marginTop: 4, fontSize: 11, fontWeight: 600, color: ACCENT },
  contact: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
  contactItem: { flexDirection: 'row', alignItems: 'center', marginRight: 12, marginBottom: 3 },
  contactDot: { width: 3.5, height: 3.5, borderRadius: 2, backgroundColor: MINT, marginRight: 5 },
  contactText: { fontSize: 8.6, color: INK_2, textDecoration: 'none' },
  photo: { width: 70, height: 86, objectFit: 'cover', borderRadius: 10, borderWidth: 2.5, borderColor: '#FFFFFF' },

  profile: { marginTop: 14, fontSize: 9.5, lineHeight: 1.5, color: INK_2 },

  section: { marginTop: 14 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  sectionMark: { width: 7, height: 7, borderRadius: 2, marginRight: 7 },
  sectionTitle: { fontSize: 8.6, fontWeight: 700, letterSpacing: 1.3, textTransform: 'uppercase', marginRight: 10 },
  sectionRule: { flex: 1, height: 0.8 },

  entry: { marginTop: 6, paddingLeft: 9, borderLeftWidth: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  role: { flex: 1, fontSize: 10, fontWeight: 600, paddingRight: 12 },
  date: { fontSize: 7.8, fontWeight: 600, textAlign: 'right', borderRadius: 8, paddingVertical: 2, paddingHorizontal: 6 },
  org: { fontSize: 9, fontWeight: 500, color: INK_3, marginTop: 1 },
  orgInline: { fontSize: 9, fontWeight: 500, color: INK_3 },
  text: { marginTop: 2, color: INK_2 },
  link: { color: ACCENT, textDecoration: 'none' },

  pair: { flexDirection: 'row', marginTop: 5 },
  pairKey: { width: 96, fontSize: 9, fontWeight: 600, color: INK, paddingTop: 2 },
  pairVal: { flex: 1, color: INK_2 },
  pills: { flex: 1, flexDirection: 'row', flexWrap: 'wrap' },
  pill: { fontSize: 8.2, lineHeight: 1, borderRadius: 9, paddingVertical: 3.2, paddingHorizontal: 7, marginRight: 4, marginBottom: 4 },

  note: { marginTop: 6, fontSize: 8.6, color: INK_3 },

  foot: { position: 'absolute', top: 841.89 - 28, left: 48, right: 48, flexDirection: 'row', justifyContent: 'space-between', fontSize: 7.6, color: INK_3 },
})

const clean = (v) => String(v ?? '').replace(/\s+/g, ' ').trim()
const bare = (url) => url.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/+$/, '')
const cap = (t) => (t ? t[0].toUpperCase() + t.slice(1) : t)
const URL_IN_TEXT = /(https?:\/\/[^\s)]+)/g

// "2023 - current", "2024 – Present (Expected 2026)" and "Jan 2022 - Dec 2023" all read the same way.
const tidyDate = (v) => cap(clean(v)
  .replace(/\s*[-–]\s*/g, ' – ')
  .replace(/\b(current|present|now|today)\b/gi, 'Present')
  .replace(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\b/g, m => m.slice(0, 3)))

// Most recent first: ongoing entries on top, then by the last year mentioned.
const endYear = (v) => {
  const t = clean(v)
  if (/present|current|now/i.test(t)) return 9999
  const years = t.match(/\b(19|20)\d{2}\b/g)
  return years ? Number(years[years.length - 1]) : 0
}
const newestFirst = (list) => list.map((x, i) => [x, i]).sort((a, b) => endYear(b[0].period) - endYear(a[0].period) || a[1] - b[1]).map(([x]) => x)

// Every description ends as a full sentence.
const sentence = (v) => {
  const t = cap(clean(v))
  return !t || /[.!?)]$/.test(t) ? t : `${t}.`
}

// The first sentence of a description. A long one is cut at a comma, never mid-thought with "...".
const brief = (v, max = 230) => {
  const first = clean(v).split(/(?<=[.!?])\s/)[0]
  if (first.length <= max) return sentence(first)
  const comma = first.lastIndexOf(',', max)
  return sentence(comma > 60 ? first.slice(0, comma) : first)
}

// Organisation names in title case ("Royal academy of dance" -> "Royal Academy of Dance").
// Words already capitalised, like "NG" or "De", are left as typed.
const SMALL = new Set(['a', 'an', 'and', 'at', 'for', 'in', 'of', 'on', 'the', 'to'])
const titleCase = (v) => clean(v).split(' ').map((w, i) => (i > 0 && SMALL.has(w) ? w : cap(w))).join(' ')

// Plain text in which any web address becomes a link. A full stop after a link stays outside it.
function Rich({ style, children }) {
  const parts = clean(children).split(URL_IN_TEXT)
  return (
    <Text style={style}>
      {parts.map((p, i) => {
        if (i % 2 === 0) return p
        const [, url, tail] = p.match(/^(.*?)([.,;:!?]*)$/)
        return [<Link key={i} src={url} style={s.link}>{bare(url)}</Link>, tail]
      })}
    </Text>
  )
}

// The heading travels with its first entry, so it can never end a page on its own.
function Section({ title, tone = 'mint', children }) {
  const [first, ...rest] = Children.toArray(children)
  const c = TONE[tone]
  return (
    <View style={s.section}>
      <View wrap={false}>
        <View style={s.sectionHead}>
          <View style={[s.sectionMark, { backgroundColor: c.bright }]} />
          <Text style={[s.sectionTitle, { color: c.ink }]}>{title}</Text>
          <View style={[s.sectionRule, { backgroundColor: c.tint }]} />
        </View>
        {first}
      </View>
      {rest}
    </View>
  )
}

// inline puts the organisation on the title line, for short entries such as awards.
function Entry({ title, org, date, text, plainOrg = false, inline = false, tone = 'mint' }) {
  const c = TONE[tone]
  return (
    <View style={[s.entry, { borderLeftColor: c.bright }]} wrap={false}>
      <View style={s.row}>
        <Text style={s.role}>
          {cap(clean(title))}
          {inline && clean(org) ? <Text style={s.orgInline}>{`  ·  ${titleCase(org)}`}</Text> : null}
        </Text>
        {clean(date) && <Text style={[s.date, { color: c.ink, backgroundColor: c.tint }]}>{tidyDate(date)}</Text>}
      </View>
      {!inline && clean(org) && <Text style={s.org}>{plainOrg ? cap(clean(org)) : titleCase(org)}</Text>}
      {clean(text) && <Rich style={s.text}>{sentence(text)}</Rich>}
    </View>
  )
}

function CvDocument({ name, title, photo, bio, reach, education, experience, achievements, skills, projects, languages, references, site, t }) {
  const paragraphs = String(bio ?? '').split(/\n\s*\n/).map(clean).filter(Boolean)

  return (
    <Document title={`${clean(name)} - ${t.documentLabel}`} author={clean(name)} subject={t.documentLabel} creator={bare(site)} producer={bare(site)}>
      <Page size="A4" style={s.page}>
        <View style={s.headPanel}>
        <View style={s.head}>
          <View style={s.headText}>
            <Text style={s.name}>{clean(name)}</Text>
            {clean(title) && <Text style={s.title}>{clean(title)}</Text>}
            <View style={s.contact}>
              {reach.map(r => (
                <View key={r.key} style={s.contactItem}>
                  <View style={s.contactDot} />
                  {r.href ? <Link src={r.href} style={s.contactText}>{r.value}</Link> : <Text style={s.contactText}>{r.value}</Text>}
                </View>
              ))}
            </View>
          </View>
          {photo && <Image style={s.photo} src={photo} />}
        </View>
        </View>

        {paragraphs.map((p, i) => <Text key={i} style={s.profile}>{p}</Text>)}

        {education.length > 0 && (
          <Section title={t.educationHeading} tone="mint">
            {newestFirst(education).map((e, i) => <Entry key={i} tone="mint" title={e.degree} org={e.institution} date={e.period} text={e.description} />)}
          </Section>
        )}

        {experience.length > 0 && (
          <Section title={t.experienceHeading} tone="sky">
            {newestFirst(experience).map((e, i) => <Entry key={i} tone="sky" title={e.role} org={e.company} date={e.period} text={e.description} />)}
          </Section>
        )}

        {projects.length > 0 && (
          <Section title={t.projectsHeading} tone="lavender">
            {projects.map((p, i) => (
              <Entry key={i} tone="lavender" title={p.title} org={clean(p.category)} plainOrg date={clean(p.year)} text={brief(p.description)} />
            ))}
            <Text style={s.note}>
              {t.projectsNote} <Link src={`${site}/work`} style={s.link}>{bare(site)}/work</Link>
            </Text>
          </Section>
        )}

        {skills.length > 0 && (
          <Section title={t.skillsHeading} tone="coral">
            {skills.map((g, i) => (
              <View key={i} style={s.pair} wrap={false}>
                <Text style={s.pairKey}>{g.name}</Text>
                <View style={s.pills}>
                  {g.items.map(item => {
                    const c = TONE[STRIP[(i + 3) % STRIP.length]]
                    return <Text key={item} style={[s.pill, { color: c.ink, backgroundColor: c.tint }]}>{item}</Text>
                  })}
                </View>
              </View>
            ))}
          </Section>
        )}

        {achievements.length > 0 && (
          <Section title={t.achievementsHeading} tone="peach">
            {newestFirst(achievements).map((a, i) => <Entry key={i} tone="peach" inline title={a.title} org={a.issuer} date={a.period} text={a.description} />)}
          </Section>
        )}

        {(languages || references) && (
          <Section title={t.furtherHeading} tone="mint">
            {languages && <View style={s.pair}><Text style={s.pairKey}>{t.languagesHeading}</Text><Text style={s.pairVal}>{languages}</Text></View>}
            {references && <View style={s.pair}><Text style={s.pairKey}>{t.referencesHeading}</Text><Text style={s.pairVal}>{references}</Text></View>}
          </Section>
        )}

        <View style={s.strip} fixed>
          {STRIP.map(t => <View key={t} style={[s.stripCell, { backgroundColor: TONE[t].bright }]} />)}
        </View>
        <View style={s.foot} fixed>
          <Text>{clean(name)}  ·  {t.documentLabel}</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}

// The portrait is shrunk to print size first: uploads can be several MB.
// A blocked or failed fetch leaves it out rather than failing the CV.
async function printPhoto(url) {
  if (!url) return null
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const bitmap = await createImageBitmap(await res.blob())
    const scale = Math.min(1, 600 / Math.max(bitmap.width, bitmap.height))
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
