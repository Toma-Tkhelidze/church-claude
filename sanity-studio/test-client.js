import { getCliClient } from 'sanity/cli'

const client = getCliClient()
client.fetch('*[_type == "sermonSeries"]')
  .then(res => {
    console.log("Success! Found series:", res.length)
    res.forEach((s, idx) => {
      console.log(`${idx + 1}. Title: "${s.title}" (ID: ${s._id})`)
      console.log(`   Subtitle: "${s.subtitle}"`)
      console.log(`   Episodes Count: ${s.episodes ? s.episodes.length : 0}`)
      if (s.episodes && s.episodes.length > 0) {
        console.log(`   First Ep: "${s.episodes[0].title}"`)
      }
    })
    process.exit(0)
  })
  .catch(err => {
    console.error("Error fetching:", err)
    process.exit(1)
  })
