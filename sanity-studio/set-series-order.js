/**
 * ერთჯერადი: ანიჭებს ქადაგებების სერიებს რიგითობას, რომელიც ემთხვევა იმას,
 * რასაც ვიზიტორები მიგრაციამდე ხედავდნენ.
 *
 *   npx sanity exec set-series-order.js --with-user-token
 */
import {getCliClient} from 'sanity/cli'

const client = getCliClient()

const ORDER = [
  'იგავები სამეფოს შესახებ',
  'თესალონიკელთა პირველი წერილის განხილვა',
  'კოლასელთა წერილის განხილვა',
  'იაკობის წერილის განხილვა',
]

async function run() {
  const docs = await client.fetch('*[_type == "sermonSeries"]{_id, title, order}')
  let tx = client.transaction()
  let changes = 0

  for (const doc of docs) {
    const index = ORDER.indexOf(doc.title)
    const value = index === -1 ? ORDER.length + 1 : index + 1
    if (doc.order === value) {
      console.log(`  = ${value}. ${doc.title} (უცვლელი)`)
      continue
    }
    console.log(`  → ${value}. ${doc.title}`)
    tx = tx.patch(doc._id, p => p.set({order: value}))
    changes++
  }

  if (changes === 0) {
    console.log('\nცვლილება არ დასჭირდა.')
    return
  }
  await tx.commit()
  console.log(`\nგანახლდა ${changes} სერია.`)
}

run().then(
  () => process.exit(0),
  err => {
    console.error('შეცდომა:', err.message)
    process.exit(1)
  }
)
