/**
 * ერთჯერადი მიგრაცია: საიტის HTML-ში ჩაწერილი კონტენტი გადმოაქვს Sanity-ში.
 *
 *   npx sanity exec migrate-content.js --with-user-token
 *
 * უსაფრთხოა ხელახლა გაშვება — არსებულ დოკუმენტებს არ ცვლის და არაფერს შლის.
 * მონაცემები იკითხება migration-payload.json-იდან (იმავე საქაღალდეში).
 */
import fs from 'fs'
import path from 'path'
import {fileURLToPath} from 'url'
import {getCliClient} from 'sanity/cli'

const here = path.dirname(fileURLToPath(import.meta.url))
const payload = JSON.parse(fs.readFileSync(path.join(here, 'migration-payload.json'), 'utf8'))
const client = getCliClient()

const created = []
const skipped = []

async function uploadImage(url, label) {
  process.stdout.write(`    სურათი: ${label} ... `)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`სურათი ვერ ჩამოიტვირთა (${res.status}): ${url}`)
  const buffer = Buffer.from(await res.arrayBuffer())
  const asset = await client.assets.upload('image', buffer, {
    filename: label.replace(/[^\w.-]+/g, '-').slice(0, 60) + '.jpg',
  })
  console.log('ატვირთულია')
  return {_type: 'image', asset: {_type: 'reference', _ref: asset._id}}
}

async function ensure({type, matchQuery, params, label, build}) {
  const existing = await client.fetch(matchQuery, params)
  if (existing) {
    skipped.push(`${type}: ${label}`)
    console.log(`  ⏭  უკვე არსებობს — ${label}`)
    return
  }
  console.log(`  ➕ იქმნება — ${label}`)
  const doc = await build()
  await client.create({_type: type, ...doc})
  created.push(`${type}: ${label}`)
}

async function run() {
  console.log('\n=== ქადაგებების სერიები ===')
  for (const s of payload.series) {
    await ensure({
      type: 'sermonSeries',
      matchQuery: '*[_type == "sermonSeries" && title == $title][0]._id',
      params: {title: s.title},
      label: `${s.title} (${s.episodes.length} ეპიზოდი)`,
      build: async () => ({
        title: s.title,
        subtitle: s.subtitle,
        category: s.category,
        description: s.description,
        speaker: s.speaker,
        thumbnailUrl: await uploadImage(s.thumbnail, s.title),
        episodes: s.episodes.map(e => {
          const episode = {
            _type: 'episode',
            _key: Math.random().toString(36).slice(2, 12),
            title: e.title,
            speaker: e.speaker,
            youtubeUrl: e.youtubeUrl,
          }
          if (e.duration) episode.duration = e.duration
          return episode
        }),
      }),
    })
  }

  console.log('\n=== ღონისძიება ===')
  const k = payload.kidsCamp
  await ensure({
    type: 'registrationEvent',
    matchQuery: '*[_type == "registrationEvent" && eventId == $eventId][0]._id',
    params: {eventId: k.eventId},
    label: k.title,
    build: async () => ({
      eventId: k.eventId,
      title: k.title,
      status: k.status,
      dateText: k.dateText,
      detailsText: k.detailsText,
      description: k.description,
      imageUrl: await uploadImage(k.image, k.title),
    }),
  })

  console.log('\n=== საოჯახო ჯგუფები ===')
  for (const g of payload.groups) {
    await ensure({
      type: 'familyGroup',
      matchQuery: '*[_type == "familyGroup" && title == $title][0]._id',
      params: {title: g.title},
      label: `${g.order}. ${g.title} — ${g.leader}`,
      build: async () => ({...g}),
    })
  }

  console.log('\n=== მსახურთა გუნდი ===')
  for (const m of payload.team) {
    await ensure({
      type: 'teamMember',
      matchQuery: '*[_type == "teamMember" && name == $name][0]._id',
      params: {name: m.name},
      label: `${m.order}. ${m.name}`,
      build: async () => {
        const doc = {...m}
        Object.keys(doc).forEach(key => doc[key] === undefined && delete doc[key])
        return doc
      },
    })
  }

  console.log('\n──────────────────────────────')
  console.log(`შეიქმნა: ${created.length}`)
  created.forEach(c => console.log('  + ' + c))
  console.log(`გამოტოვებულია (უკვე არსებობდა): ${skipped.length}`)
  skipped.forEach(c => console.log('  = ' + c))
}

run().then(
  () => process.exit(0),
  err => {
    console.error('\nშეცდომა:', err.message)
    process.exit(1)
  }
)
