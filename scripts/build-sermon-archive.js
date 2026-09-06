#!/usr/bin/env node
/**
 * ქადაგებების არქივის შემდგენელი.
 *
 * YouTube-ის RSS მაქსიმუმ 15 ჩანაწერს აბრუნებს (rss2json კი — 10),
 * ამიტომ სრული წლიური სია მისით ვერ აიწყობა: 2023 წელს 40 ქადაგებაა.
 * ეს სკრიპტი დასაკრავი სიის გვერდს კითხულობს, სადაც ყველა ვიდეოა,
 * და შედეგს ერთ ფაილში ინახავს — data/sermon-archive.json.
 *
 * საიტი მერე ამ ფაილს კითხულობს: სწრაფია, სრულია და გარე სერვისზე
 * არ არის დამოკიდებული. მიმდინარე წლის ახალი ქადაგებები ისევ
 * ავტომატურად ემატება YouTube-ის feed-იდან, ამიტომ სკრიპტის ხელახლა
 * გაშვება მხოლოდ მაშინ სჭირდება, როცა ძველ წელს ცვლი ან ახალ
 * წლიურ დასაკრავ სიას ქმნი.
 *
 * გაშვება:  node scripts/build-sermon-archive.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// უნდა ემთხვეოდეს sanity-fetch.js-ის SERMON_PLAYLISTS-ს.
const PLAYLISTS = [
  { year: '2026', id: 'PLC_n-dqgCYfWAb2CbwumDHPRApAkcP99A' },
  { year: '2024', id: 'PLC_n-dqgCYfVoTDhwa3nqvBb-VT6h6BBn' },
  { year: '2023', id: 'PLC_n-dqgCYfVuW9J_rlhSNAdCSj6Qci2-' },
  { year: '2022', id: 'PLC_n-dqgCYfWBOSLMaNQTs8u6eivVOnPz' }
];

const OUT = path.join(__dirname, '..', 'data', 'sermon-archive.json');

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        // თანხმობის ფანჯარა HTML-ს ცვლის — ამით ვუვლით გვერდს.
        'Cookie': 'CONSENT=YES+1'
      }
    }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        return resolve(get(res.headers.location));
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error('HTTP ' + res.statusCode + ' — ' + url));
      }
      let body = '';
      res.setEncoding('utf8');
      res.on('data', d => { body += d; });
      res.on('end', () => resolve(body));
    }).on('error', reject);
  });
}

// ytInitialData-ს ფრჩხილების დათვლით ვჭრით: რეგულარული გამოსახულება
// ამხელა ჩადგმულ ობიექტზე საიმედო არ არის.
function sliceInitialData(html) {
  // YouTube ამ ცვლადს რამდენიმენაირად წერს და გვერდიდან გვერდზე ცვლის.
  const keys = ['var ytInitialData = ', 'window["ytInitialData"] = ', 'ytInitialData = '];
  let key = null, start = -1;
  for (const k of keys) {
    const at = html.indexOf(k);
    if (at >= 0 && html[at + k.length] === '{') { key = k; start = at; break; }
  }
  if (start < 0) throw new Error('ytInitialData ვერ მოიძებნა — YouTube-მა გვერდის სტრუქტურა შეცვალა');
  let i = start + key.length;
  let depth = 0, inStr = false, esc = false;
  for (; i < html.length; i++) {
    const c = html[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') { inStr = true; continue; }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return html.slice(start + key.length, i + 1); }
  }
  throw new Error('ytInitialData დაუსრულებელია');
}

// YouTube ვიდეოს ბარათს ახლა lockupViewModel ჰქვია.
function collectVideos(node, out) {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node)) { node.forEach(n => collectVideos(n, out)); return out; }
  if (node.lockupViewModel) {
    const l = node.lockupViewModel;
    const meta = l.metadata && l.metadata.lockupMetadataViewModel;
    const title = (meta && meta.title && meta.title.content) || '';
    if (l.contentId && /^[A-Za-z0-9_-]{11}$/.test(l.contentId)) out.push({ id: l.contentId, title: title.trim() });
    return out;
  }
  for (const k in node) collectVideos(node[k], out);
  return out;
}

// YouTube დროდადრო გვერდის სხვა ვარიანტს აბრუნებს, სადაც მონაცემები
// სხვაგვარადაა ჩაწერილი — ერთი მცდელობა საიმედო არ არის.
async function readPlaylist(pl, attempts = 3) {
  let lastErr;
  for (let n = 1; n <= attempts; n++) {
    try {
      const html = await get('https://www.youtube.com/playlist?list=' + pl.id);
      const data = JSON.parse(sliceInitialData(html));
      const found = collectVideos(data, []);
      if (!found.length) throw new Error('ვიდეოები ვერ ამოვიცანი');
      const seen = new Set();
      // დასაკრავ სიაში ვიდეოები ქრონოლოგიურად ალაგია — რიგს ვინარჩუნებთ,
      // რადგან სათაურებში თარიღები ხანდახან შეცდომითაა აკრეფილი.
      return found.filter(v => !seen.has(v.id) && seen.add(v.id));
    } catch (err) {
      lastErr = err;
      if (n < attempts) await new Promise(r => setTimeout(r, 1200 * n));
    }
  }
  throw lastErr;
}

(async () => {
  const years = {};
  for (const pl of PLAYLISTS) {
    process.stdout.write(pl.year + ' … ');
    try {
      const videos = await readPlaylist(pl);
      years[pl.year] = videos;
      console.log(videos.length + ' ქადაგება');
    } catch (err) {
      console.log('ვერ წავიკითხე — ' + err.message);
      process.exitCode = 1;
      return;
    }
  }

  const total = Object.values(years).reduce((n, v) => n + v.length, 0);

  // უსაფრთხოების ზღვარი — მთავარია ავტომატური გაშვებისთვის: თუ YouTube-მა
  // ნაკლული გვერდი დააბრუნა, სრული არქივი არ უნდა ჩავანაცვლოთ მოკლეთი.
  // შეგნებული შემცირებისთვის: node scripts/build-sermon-archive.js --force
  if (fs.existsSync(OUT) && !process.argv.includes('--force')) {
    try {
      const prev = JSON.parse(fs.readFileSync(OUT, 'utf8'));
      const prevTotal = Object.values(prev.years || {}).reduce((n, v) => n + v.length, 0);
      if (total < prevTotal) {
        console.log('\nშევჩერდი: ახალ სიაში ' + total + ' ქადაგებაა, არსებულში კი ' + prevTotal +
          '. ფაილი უცვლელი დარჩა. თუ შემცირება განზრახია — --force.');
        process.exitCode = 1;
        return;
      }
    } catch (e) { /* დაზიანებული ფაილი — უბრალოდ გადავაწერთ */ }
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify({
    generatedAt: new Date().toISOString().slice(0, 10),
    years
  }, null, 1) + '\n');

  console.log('\nჩაიწერა ' + path.relative(process.cwd(), OUT) + ' — სულ ' + total + ' ქადაგება');
})();
