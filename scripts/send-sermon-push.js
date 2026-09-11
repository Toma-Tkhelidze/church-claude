#!/usr/bin/env node
/**
 * ახალი ქადაგების შეტყობინება აპლიკაციაში (Web Push, OneSignal).
 *
 * არქივიდან იღებს ბოლო ქადაგებას და OneSignal-ის API-ით უგზავნის ყველას,
 * ვინც საიტზე შეტყობინებები ჩართო. ფოსტის ტყუპისცალია — იგივე
 * ტრიგერი, სხვა არხი.
 *
 * გაშვება:
 *   node scripts/send-sermon-push.js --dry-run   ყველაფერს აკეთებს, გარდა გაგზავნისა
 *   node scripts/send-sermon-push.js             გზავნის
 *
 * გასაღები ONESIGNAL_REST_API_KEY გარემოს ცვლადიდან მოდის — კოდში
 * არასდროს წერია. App ID საჯაროა (საიტის კოდშიც ისაა), ამიტომ აქაც
 * შეიძლება ეწეროს, მაგრამ ცვლადი უფრო მაღლა დგას, თუ ოდესმე შეიცვალა.
 */

const { SITE_BASE, latestSermon, splitTitle } = require('./latest-sermon');

// ── კონფიგურაცია ──────────────────────────────────────────────────
const APP_ID = process.env.ONESIGNAL_APP_ID || 'b657bdbe-ade7-4269-b8d0-63fcf7c4f698';
const API = 'https://api.onesignal.com/notifications';

function buildMessage(sermon) {
  const parts = splitTitle(sermon.title, sermon.date);
  return {
    parts,
    body: {
      app_id: APP_ID,
      target_channel: 'push',
      // OneSignal-ის ნაგულისხმევი სეგმენტი — ყველა, ვინც ჩართო.
      included_segments: ['Total Subscriptions'],
      // OneSignal ენების ლექსიკონს ითხოვს და „en“ სავალდებულოა;
      // ტექსტი მაინც ქართულია — გასაღები მხოლოდ ფორმალობაა.
      headings: { en: 'ახალი ქადაგება' },
      contents: { en: parts.title + (parts.date ? ' · ' + parts.date : '') },
      url: SITE_BASE + 'pages/sermons.html',
      chrome_web_icon: SITE_BASE + 'icons/icon-192.png',
      // ერთი თემა: თუ წინა კვირის შეტყობინება ჯერ არ წაუკითხავთ,
      // ახალი მას ჩაანაცვლებს და ორი არ დაგროვდება.
      web_push_topic: 'sermon'
    }
  };
}

async function send(message) {
  const res = await fetch(API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Key ' + process.env.ONESIGNAL_REST_API_KEY
    },
    body: JSON.stringify(message.body)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || (data.errors && data.errors.length)) {
    throw new Error('OneSignal ' + res.status + ': ' + JSON.stringify(data.errors || data));
  }
  return data;
}

// ── გაშვება ───────────────────────────────────────────────────────
(async function main() {
  const args = process.argv.slice(2);
  const sermon = latestSermon();

  if (!sermon) {
    console.error('არქივში ქადაგება ვერ ვიპოვე — არაფერი გაიგზავნა.');
    process.exitCode = 1;
    return;
  }

  const message = buildMessage(sermon);
  console.log('ქადაგება: ' + message.parts.title);
  console.log('თარიღი:   ' + message.parts.date);
  console.log('ტექსტი:   ' + message.body.headings.en + ' — ' + message.body.contents.en);
  console.log('ბმული:    ' + message.body.url);

  if (args.includes('--dry-run')) {
    console.log('\nსატესტო რეჟიმი — შეტყობინება არ გაგზავნილა.');
    return;
  }

  if (!process.env.ONESIGNAL_REST_API_KEY) {
    console.error('ONESIGNAL_REST_API_KEY ცარიელია — გაგზავნა შეუძლებელია.');
    process.exitCode = 1;
    return;
  }

  try {
    const data = await send(message);
    console.log('\nგაიგზავნა. შეტყობინების ID: ' + data.id);
  } catch (err) {
    console.error('\nგაგზავნა ვერ მოხერხდა: ' + err.message);
    process.exitCode = 1;
  }
})();
