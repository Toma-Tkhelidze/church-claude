#!/usr/bin/env node
/**
 * ახალი ქადაგების შეტყობინება ელფოსტით.
 *
 * არქივიდან იღებს ბოლო ქადაგებას, ავსებს sermon-email.html-ს და
 * Brevo-ს API-ით უგზავნის სიას „ეკლესიის სიახლეები“.
 *
 * გაშვება:
 *   node scripts/send-sermon-email.js --print-latest   ბოლო ქადაგების ID
 *   node scripts/send-sermon-email.js --dry-run        ყველაფერს აკეთებს, გარდა გაგზავნისა
 *   node scripts/send-sermon-email.js                  გზავნის
 *
 * გასაღები BREVO_API_KEY გარემოს ცვლადიდან მოდის — კოდში არასდროს წერია.
 */

const fs = require('fs');
const path = require('path');

// ── კონფიგურაცია ──────────────────────────────────────────────────
const { SITE_BASE, latestSermon, splitTitle } = require('./latest-sermon');
const LIST_ID = 3;                       // „ეკლესიის სიახლეები“
// გამომგზავნი Brevo-ში ავთენტიფიცირებული დომენიდანაა — სხვა მისამართს
// Brevo @brevosend.com-ით ჩაანაცვლებდა.
const SENDER = { name: 'სახარების რწმენის ეკლესია', email: 'info@efckutaisi.ge' };

const TEMPLATE = path.join(__dirname, 'sermon-email.html');
const API = 'https://api.brevo.com/v3';

function buildHtml(sermon) {
  const parts = splitTitle(sermon.title, sermon.date);
  const values = {
    TITLE: parts.title,
    DATE: parts.date,
    THUMB: 'https://img.youtube.com/vi/' + encodeURIComponent(sermon.id) + '/maxresdefault.jpg',
    LINK: SITE_BASE + 'pages/sermons.html',
    YEAR: String(new Date().getFullYear())
  };
  let html = fs.readFileSync(TEMPLATE, 'utf8');
  Object.keys(values).forEach(key => {
    html = html.split('{{' + key + '}}').join(values[key]);
  });
  return { html: html, subject: 'ახალი ქადაგება: ' + parts.title, parts: parts };
}

// ── Brevo ─────────────────────────────────────────────────────────
async function brevo(method, endpoint, body) {
  const res = await fetch(API + endpoint, {
    method: method,
    headers: {
      'api-key': process.env.BREVO_API_KEY,
      'content-type': 'application/json',
      accept: 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  if (!res.ok) throw new Error(method + ' ' + endpoint + ' → ' + res.status + ' ' + text);
  return text ? JSON.parse(text) : {};
}

async function send(sermon) {
  const mail = buildHtml(sermon);
  // კამპანია და არა transactional: სიაზე გაგზავნისას Brevo თავად
  // ამატებს გამოწერის გაუქმების ბმულს და პატივს სცემს უარის თქმას.
  const campaign = await brevo('POST', '/emailCampaigns', {
    name: 'ახალი ქადაგება — ' + mail.parts.title + ' (' + new Date().toISOString().slice(0, 10) + ')',
    subject: mail.subject,
    sender: SENDER,
    type: 'classic',
    htmlContent: mail.html,
    recipients: { listIds: [LIST_ID] }
  });
  await brevo('POST', '/emailCampaigns/' + campaign.id + '/sendNow');
  return campaign.id;
}

// ── გაშვება ───────────────────────────────────────────────────────
(async function main() {
  const args = process.argv.slice(2);
  const sermon = latestSermon();

  if (args.includes('--print-latest')) {
    process.stdout.write(sermon ? sermon.id : '');
    return;
  }

  if (!sermon) {
    console.error('არქივში ქადაგება ვერ ვიპოვე — არაფერი გაიგზავნა.');
    process.exitCode = 1;
    return;
  }

  const mail = buildHtml(sermon);
  console.log('ქადაგება: ' + mail.parts.title);
  console.log('თარიღი:   ' + mail.parts.date);
  console.log('სათაური:  ' + mail.subject);
  console.log('სიგრძე:   ' + mail.html.length + ' სიმბოლო');

  if (args.includes('--dry-run')) {
    console.log('\nსატესტო რეჟიმი — წერილი არ გაგზავნილა.');
    return;
  }

  if (!process.env.BREVO_API_KEY) {
    console.error('BREVO_API_KEY ცარიელია — გაგზავნა შეუძლებელია.');
    process.exitCode = 1;
    return;
  }

  try {
    const id = await send(sermon);
    console.log('\nგაიგზავნა. კამპანიის ნომერი: ' + id);
  } catch (err) {
    console.error('\nგაგზავნა ვერ მოხერხდა: ' + err.message);
    process.exitCode = 1;
  }
})();
