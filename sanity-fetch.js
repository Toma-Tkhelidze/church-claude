const PROJECT_ID = 'f9j6xr69';
const DATASET = 'production';
const API_VERSION = 'v2021-10-21';

function getYouTubeId(url) {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

function getVideoDetails(url) {
  if (!url) return null;
  // YouTube
  const ytRegExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const ytMatch = url.match(ytRegExp);
  if (ytMatch && ytMatch[2].length === 11) {
    return { platform: 'youtube', id: ytMatch[2] };
  }
  // Vimeo
  const vimeoRegExp = /vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|video\/|)(\d+)(?:$|\/|\?)/;
  const vimeoMatch = url.match(vimeoRegExp);
  if (vimeoMatch && vimeoMatch[3]) {
    return { platform: 'vimeo', id: vimeoMatch[3] };
  }
  return null;
}

// The newest sermon comes from the YouTube playlist feed. It is fetched
// independently of Sanity so a slow, blocked or unreachable Sanity request
// cannot leave the page showing a stale hardcoded video.
// ბოლო ქადაგების id მოკლე დროით ინახება ბრაუზერში, რომ ერთი
// ვიზიტის განმავლობაში გვერდიდან გვერდზე გადასვლამ ერთი და იგივე მოთხოვნა არ
// გააგზავნოს. ვადა განზრახ: ახალი ქადაგება არაუმეტეს 15 წუთს დააგვიანებს.
const SERMON_CACHE_KEY = 'efc:latest-sermon:v1';
const SERMON_CACHE_TTL = 15 * 60 * 1000;

function readCachedSermonId() {
  try {
    const raw = JSON.parse(localStorage.getItem(SERMON_CACHE_KEY));
    if (raw && raw.id && Date.now() - raw.at < SERMON_CACHE_TTL) return raw.id;
  } catch (e) { /* private mode ან დაზიანებული ჩანაწერი */ }
  return null;
}

function cacheSermonId(id) {
  if (!id) return;
  try {
    localStorage.setItem(SERMON_CACHE_KEY, JSON.stringify({ id: id, at: Date.now() }));
  } catch (e) { /* კვოტა ან private mode */ }
}

function fetchLatestPlaylistVideoId() {
  const cached = readCachedSermonId();
  if (cached) return Promise.resolve(cached);

  const playlistId = 'PLC_n-dqgCYfWAb2CbwumDHPRApAkcP99A';
  // მისამართში გამანახლებელი (&t=...) განზრახ აღარ არის. ის rss2json-ს
  // აიძულებდა feed-ის თავიდან დამუშავებას და იწვევდა 429-ს. მისი გარეშე
  // სერვისი საკუთარ კეშს იყენებს და ახალ ვიდეოს ბევრად უფრო ადრე ვიგებთ.
  const feedUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent('https://www.youtube.com/feeds/videos.xml?playlist_id=' + playlistId)}`;

  return fetch(feedUrl)
    .then(res => {
      if (!res.ok) {
        // ყველაზე ხშირი 429-ია (გადაჭარბებული ლიმიტი) — ვხედავთ დიაგნოსტიკისთვის.
        console.warn('YouTube playlist feed request failed with status', res.status);
        return null;
      }
      return res.json();
    })
    .then(rssData => {
      if (!rssData || !rssData.items || rssData.items.length === 0) return null;
      // Find the video item with the latest pubDate
      const latestVideo = rssData.items.reduce((latest, item) => {
        return (new Date(item.pubDate) > new Date(latest.pubDate)) ? item : latest;
      }, rssData.items[0]);
      if (!latestVideo) return null;
      let id = null;
      if (latestVideo.guid) {
        const parts = latestVideo.guid.split(':');
        if (parts.length >= 3) id = parts[2];
      }
      if (!id) id = getYouTubeId(latestVideo.link);
      cacheSermonId(id);
      return id;
    })
    .catch(rssError => {
      console.warn('Failed to fetch latest YouTube playlist video, falling back to Sanity config:', rssError);
      return null;
    });
}

// Idempotent: safe to call from both the feed path and the Sanity path.
function applyLatestSermonId(sermonId) {
  if (!sermonId) return;

  document.querySelectorAll('#sanity-latest-sermon').forEach(el => {
    if (el.getAttribute('data-video-id') === sermonId) return;
    el.setAttribute('data-video-id', sermonId);
    if (typeof setYouTubeThumbnailBackground === 'function') {
      setYouTubeThumbnailBackground(el, sermonId, 'linear-gradient(rgba(0,0,0,0.1), rgba(0,0,0,0.2))');
    } else {
      el.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.1), rgba(0,0,0,0.2)), url('https://img.youtube.com/vi/${sermonId}/hqdefault.jpg')`;
    }
  });

  const mainPlayer = document.getElementById('mainSermonPlayer');
  if (mainPlayer && !(mainPlayer.src || '').includes(sermonId)) {
    mainPlayer.src = `https://www.youtube-nocookie.com/embed/${sermonId}?rel=0&modestbranding=1&vq=hd1080`;
  }
}

// CMS ტექსტი HTML-ში ჩასმამდე უნდა გაიწმინდოს.
function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// საოჯახო ჯგუფების ბარათები. მარკაპი იმეორებს გვერდზე არსებულ სტატიკურ
// ბარათებს ერთ-ერთში, რომ იერი არ შეიცვალოს.
function renderFamilyGroups(groups) {
  const grid = document.querySelector('.groups-grid');
  if (!grid || !groups || groups.length === 0) return;

  const data = {};
  const cards = groups.map((group, index) => {
    const id = String(index + 1);
    const image = group.imageAssetUrl || group.imageUrl || '';
    data[id] = {
      title: group.title,
      leader: group.leader,
      formLeader: group.formLeader || group.leader,
      time: group.time,
      location: group.location,
      type: group.groupType,
      image: image,
      description: group.description,
      map: group.mapUrl
    };

    return `
                <div class="group-card scroll-reveal" data-group-id="${id}">
                    <div class="group-image-wrap">
                        <img src="${escapeHtml(image)}"
                            alt="${escapeHtml(group.title)}">
                        <span class="group-badge">${escapeHtml(group.badge)}</span>
                    </div>
                    <div class="group-card-content">
                        <h3 class="group-leaders">${escapeHtml(group.title)}</h3>
                        <div class="group-meta-info">
                            <i class="fa-solid fa-user"></i> ${escapeHtml(group.leader)}
                        </div>
                        <div class="group-meta-info">
                            <i class="fa-regular fa-clock"></i> ${escapeHtml(group.cardTime)}
                        </div>
                        <div class="group-meta-info">
                            <a href="${escapeHtml(group.mapUrl)}" target="_blank"
                                rel="noopener noreferrer">
                                <i class="fa-solid fa-location-dot"></i> მისამართი (ნახვა რუკაზე)
                            </a>
                        </div>
                        <p class="group-excerpt">${escapeHtml(group.excerpt)}</p>
                        <span class="group-action-btn">დეტალების ნახვა <i class="fa-solid fa-arrow-right"></i></span>
                    </div>
                </div>`;
  });

  window.groupsData = data;
  grid.innerHTML = cards.join('');
  if (typeof window.setupScrollReveal === 'function') window.setupScrollReveal();
}

// მთავარ გვერდზე ღია რეგისტრაციების ზოლი. ვიზიტორმა შეიძლება ვერასოდეს
// მოახერხოს რეგისტრაციის გვერდზე, ამიტომ აქტიური ღონისძიება აქვეც ჩანს.
// თუ აქტიური არევია, ბლოკი დამალული რჩება — ცარიელი ადგილი არ რჩება.
function renderOpenEvents(events) {
  const mount = document.getElementById('openEvents');
  if (!mount) return;

  const open = (events || []).filter(evt => evt && evt.status === 'active' && evt.title);
  if (open.length === 0) {
    mount.hidden = true;
    return;
  }

  mount.innerHTML = open.map(evt => {
    const anchor = evt.eventId ? '#' + encodeURIComponent(evt.eventId) : '';
    const date = evt.dateText
      ? `<span class="open-event-date">${escapeHtml(evt.dateText)}</span>`
      : '';
    return `
      <a class="open-event" href="pages/registration.html${anchor}">
        <span class="open-event-flag">
          <span class="open-event-dot" aria-hidden="true"></span>ღია რეგისტრაცია
        </span>
        <span class="open-event-title">${escapeHtml(evt.title)}</span>
        ${date}
        <span class="open-event-cta">
          დარეგისტრირდი <i class="fa-solid fa-arrow-right-long" aria-hidden="true"></i>
        </span>
      </a>`;
  }).join('');

  mount.hidden = false;
}

// მსახურთა გუნდი: უფროსი პასტორები + სულიერი საბჭო.
function renderTeam(members) {
  if (!members || members.length === 0) return;

  const pastor = members.find(m => m.memberRole === 'lead-pastor');
  if (pastor) {
    const setText = (id, value) => {
      const el = document.getElementById(id);
      if (el && value) el.textContent = value;
    };
    setText('sanity-pastor-name', pastor.name);
    setText('sanity-pastor-role', pastor.roleLabel);
    setText('sanity-pastor-tagline', pastor.tagline);
    setText('sanity-pastor-bio1', pastor.bio1);
    setText('sanity-pastor-bio2', pastor.bio2);

    const photo = document.getElementById('sanity-pastor-photo');
    const photoSrc = pastor.photoAssetUrl || pastor.photoUrl;
    if (photo && photoSrc) {
      photo.src = photoSrc;
      if (pastor.name) photo.alt = pastor.name;
    }

    const email = document.getElementById('sanity-pastor-email');
    if (email && pastor.email) email.href = 'mailto:' + pastor.email;
  }

  const elders = members.filter(m => m.memberRole === 'elder');
  const eldersWrap = document.getElementById('sanity-elders-wrap');
  if (eldersWrap && elders.length > 0) {
    // ორ სვეტად, ისევე როგორც სტატიკურ ვერსიაში.
    const half = Math.ceil(elders.length / 2);
    const columns = [elders.slice(0, half), elders.slice(half)];
    eldersWrap.innerHTML = columns
      .filter(column => column.length > 0)
      .map(column => `
                        <div style="flex: 1; min-width: 140px;">
                            <ul style="list-style: none; padding: 0; margin: 0;">
${column.map(member => `                                <li style="padding: 10px 0; border-bottom: 1px solid #eee; color: #444;"><strong>${escapeHtml(member.name)}</strong> <div style="color: #888; font-size: 0.85rem; margin-top: 2px;">${escapeHtml(member.roleLabel || 'საბჭოს წევრი')}</div></li>`).join('\n')}
                            </ul>
                        </div>`)
      .join('');
  }
}

function updatePageContent() {
  const groqQuery = `{
    "siteContent": *[_type == "siteContent"][0]{
      title,
      youtubeUrl,
      "imageUrl": imageUrl.asset->url,
      buildingSubtitle,
      buildingTitle,
      buildingText1,
      buildingText2,
      latestSermonUrl,
      youthCampVideoUrl,
      youthCampTitle,
      youthCampDesc1,
      youthCampDesc2,
      kidsCampVideoUrl,
      kidsCampTitle,
      kidsCampDesc1,
      kidsCampDesc2,
      weeklyVerseText,
      weeklyVerseRef,
      "weeklyVersePdf": weeklyVersePdf.asset->{url, originalFilename, size}
    },
    "events": *[_type == "registrationEvent"] | order(_createdAt asc) {
      eventId,
      title,
      status,
      dateText,
      detailsText,
      description,
      "imageUrl": imageUrl.asset->url
    },
    "familyGroups": *[_type == "familyGroup"] | order(order asc) {
      title,
      leader,
      formLeader,
      time,
      cardTime,
      badge,
      location,
      groupType,
      excerpt,
      description,
      mapUrl,
      imageUrl,
      "imageAssetUrl": image.asset->url
    },
    "teamMembers": *[_type == "teamMember"] | order(order asc) {
      name,
      memberRole,
      roleLabel,
      tagline,
      bio1,
      bio2,
      email,
      photoUrl,
      "photoAssetUrl": photo.asset->url
    },
    "sermons": *[_type == "sermonSeries"] | order(order asc, _createdAt desc) {
      title,
      subtitle,
      category,
      "thumbnailUrl": thumbnailUrl.asset->url,
      description,
      speaker,
      episodes[] {
        title,
        speaker,
        youtubeUrl,
        duration
      }
    }
  }`;

  const url = `https://${PROJECT_ID}.apicdn.sanity.io/${API_VERSION}/data/query/${DATASET}?query=${encodeURIComponent(groqQuery)}`;

  // Runs in parallel with the Sanity query; both paths update the page.
  const latestVideoIdPromise = fetchLatestPlaylistVideoId();
  latestVideoIdPromise.then(applyLatestSermonId);

  fetch(url)
    .then(response => response.json())
    .then(async data => {
      if (data && data.result) {
        const { siteContent, events, sermons, familyGroups, teamMembers } = data.result;

        renderFamilyGroups(familyGroups);
        renderTeam(teamMembers);
        renderOpenEvents(events);

        const latestVideoId = await latestVideoIdPromise;
        // 1. UPDATE SITECONTENT PROPERTIES
        if (siteContent) {
          // Main Title
          if (siteContent.title) {
            const titleEl = document.getElementById('sanity-main-title');
            if (titleEl) titleEl.textContent = siteContent.title;
          }

          // Main Video
          if (siteContent.youtubeUrl) {
            const videoUrl = siteContent.youtubeUrl;
            const containerEl = document.getElementById('building-video-container') || document.querySelector('.building-video-wrap .video-container');
            if (containerEl) {
              if (videoUrl.includes('.mp4') || videoUrl.includes('cloudinary.com')) {
                let optimizedUrl = videoUrl;
                if (videoUrl.includes('cloudinary.com') && !videoUrl.includes('f_auto') && !videoUrl.includes('q_auto')) {
                  optimizedUrl = videoUrl.replace('/video/upload/', '/video/upload/f_auto,q_auto/');
                }
                // Render HTML5 video element
                containerEl.innerHTML = `
                  <video 
                      id="sanity-video-element"
                      src="${optimizedUrl}" 
                      autoplay 
                      loop 
                      muted 
                      playsinline 
                      preload="metadata" 
                      style="width: 100%; height: 100%; object-fit: cover; position: absolute; top: 0; left: 0; pointer-events: none;">
                  </video>
                `;

                // Some browsers (notably iOS Safari) ignore the autoplay
                // attribute on media inserted via innerHTML, so start it
                // explicitly. The viewport observer in script.js still
                // decides whether it keeps playing.
                const injectedVideo = containerEl.querySelector('video');
                if (injectedVideo) {
                  injectedVideo.muted = true;
                  injectedVideo.playsInline = true;
                  const playAttempt = injectedVideo.play();
                  if (playAttempt && typeof playAttempt.catch === 'function') {
                    playAttempt.catch(() => { /* blocked by autoplay policy or paused while off-screen */ });
                  }
                }
              } else {
                const videoDetails = getVideoDetails(videoUrl);
                if (videoDetails) {
                  if (videoDetails.platform === 'vimeo') {
                    containerEl.innerHTML = `
                      <iframe 
                          id="sanity-video-iframe"
                          src="https://player.vimeo.com/video/${videoDetails.id}?autoplay=1&mute=1&loop=1&autopause=0&background=1" 
                          allow="autoplay; fullscreen; picture-in-picture" 
                          referrerpolicy="strict-origin-when-cross-origin"
                          allowfullscreen
                          style="width: 100%; height: 100%; position: absolute; top: 0; left: 0; pointer-events: none;"
                          frameborder="0">
                      </iframe>
                    `;
                  } else {
                    containerEl.innerHTML = `
                      <iframe 
                          id="sanity-video-iframe"
                          src="https://www.youtube-nocookie.com/embed/${videoDetails.id}?autoplay=1&mute=1&loop=1&playlist=${videoDetails.id}&controls=0&rel=0&modestbranding=1&disablekb=1&fs=0&iv_load_policy=3&showinfo=0&vq=hd1080" 
                          allow="autoplay; encrypted-media" 
                          referrerpolicy="strict-origin-when-cross-origin"
                          allowfullscreen
                          style="width: 100%; height: 100%; position: absolute; top: 0; left: 0; pointer-events: none;"
                          frameborder="0">
                      </iframe>
                    `;
                  }
                }
              }
            }
          }

          // Main Image (Background of Hero Section)
          if (siteContent.imageUrl) {
            const imgEl = document.getElementById('sanity-main-image');
            if (imgEl) imgEl.style.backgroundImage = `url('${siteContent.imageUrl}')`;
          }

          // Building Section Texts
          if (siteContent.buildingSubtitle) {
            const el = document.getElementById('sanity-building-subtitle');
            if (el) el.textContent = siteContent.buildingSubtitle;
          }
          if (siteContent.buildingTitle) {
            const el = document.getElementById('sanity-building-title');
            if (el) el.textContent = siteContent.buildingTitle;
          }
          if (siteContent.buildingText1) {
            const el = document.getElementById('sanity-building-text1');
            if (el) el.textContent = siteContent.buildingText1;
          }
          if (siteContent.buildingText2) {
            const el = document.getElementById('sanity-building-text2');
            if (el) el.textContent = siteContent.buildingText2;
          }

          // Latest Sermon Video ID update (uses YouTube feed if available, otherwise falls back to Sanity)
          let sermonId = latestVideoId;
          if (!sermonId && siteContent.latestSermonUrl) {
            sermonId = getYouTubeId(siteContent.latestSermonUrl);
          }
          applyLatestSermonId(sermonId);

          // Main Sermon Player falls back to the first Sanity episode only
          // when neither the playlist feed nor latestSermonUrl gave an id.
          if (!sermonId && sermons && sermons.length > 0) {
            const mainPlayer = document.getElementById('mainSermonPlayer');
            const firstEpisode = sermons[0]?.episodes?.[0];
            const fallbackId = firstEpisode ? getYouTubeId(firstEpisode.youtubeUrl) : null;
            if (mainPlayer && fallbackId) {
              mainPlayer.src = `https://www.youtube-nocookie.com/embed/${fallbackId}?rel=0&modestbranding=1&vq=hd1080`;
            }
          }

          // Youth Camp (Youth Page)
          if (siteContent.youthCampVideoUrl) {
            const videoDetails = getVideoDetails(siteContent.youthCampVideoUrl);
            const campVideoEl = document.getElementById('sanity-youth-camp-video');
            if (videoDetails && campVideoEl) {
              const campVideoId = videoDetails.id;
              const platform = videoDetails.platform;
              campVideoEl.setAttribute('data-video-id', campVideoId);
              campVideoEl.setAttribute('data-video-platform', platform);
              if (platform === 'vimeo') {
                campVideoEl.style.backgroundSize = 'cover';
                campVideoEl.style.backgroundPosition = 'center';
                campVideoEl.style.position = 'relative';
                fetch(`https://vimeo.com/api/v2/video/${campVideoId}.json`)
                  .then(res => res.json())
                  .then(data => {
                    if (data && data[0] && data[0].thumbnail_large) {
                      campVideoEl.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.4)), url('${data[0].thumbnail_large}')`;
                    }
                  })
                  .catch(err => {
                    console.error('Error fetching Vimeo thumbnail:', err);
                    campVideoEl.style.backgroundColor = '#1e1e1e';
                  });
              } else {
                if (typeof setYouTubeThumbnailBackground === 'function') {
                  setYouTubeThumbnailBackground(campVideoEl, campVideoId, 'linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.4))');
                } else {
                  campVideoEl.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.4)), url('https://img.youtube.com/vi/${campVideoId}/hqdefault.jpg')`;
                }
              }
            }
          }
          if (siteContent.youthCampTitle) {
            const el = document.getElementById('sanity-youth-camp-title');
            if (el) el.textContent = siteContent.youthCampTitle;
          }
          if (siteContent.youthCampDesc1) {
            const el = document.getElementById('sanity-youth-camp-desc1');
            if (el) el.textContent = siteContent.youthCampDesc1;
          }
          if (siteContent.youthCampDesc2) {
            const el = document.getElementById('sanity-youth-camp-desc2');
            if (el) el.textContent = siteContent.youthCampDesc2;
          }

          // Kids Camp (Kids Page)
          if (siteContent.kidsCampVideoUrl) {
            const videoDetails = getVideoDetails(siteContent.kidsCampVideoUrl);
            const kidsVideoEl = document.getElementById('sanity-kids-camp-video');
            if (videoDetails && kidsVideoEl) {
              const kidsVideoId = videoDetails.id;
              const platform = videoDetails.platform;
              kidsVideoEl.setAttribute('data-video-id', kidsVideoId);
              kidsVideoEl.setAttribute('data-video-platform', platform);
              if (platform === 'vimeo') {
                kidsVideoEl.style.backgroundSize = 'cover';
                kidsVideoEl.style.backgroundPosition = 'center';
                kidsVideoEl.style.position = 'relative';
                fetch(`https://vimeo.com/api/v2/video/${kidsVideoId}.json`)
                  .then(res => res.json())
                  .then(data => {
                    if (data && data[0] && data[0].thumbnail_large) {
                      kidsVideoEl.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.4)), url('${data[0].thumbnail_large}')`;
                    }
                  })
                  .catch(err => {
                    console.error('Error fetching Vimeo thumbnail:', err);
                    kidsVideoEl.style.backgroundColor = '#1e1e1e';
                  });
              } else {
                if (typeof setYouTubeThumbnailBackground === 'function') {
                  setYouTubeThumbnailBackground(kidsVideoEl, kidsVideoId, 'linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.4))');
                } else {
                  kidsVideoEl.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.4)), url('https://img.youtube.com/vi/${kidsVideoId}/hqdefault.jpg')`;
                }
              }
            }
          }
          if (siteContent.kidsCampTitle) {
            const el = document.getElementById('sanity-kids-camp-title');
            if (el) el.textContent = siteContent.kidsCampTitle;
          }
          if (siteContent.kidsCampDesc1) {
            const el = document.getElementById('sanity-kids-camp-desc1');
            if (el) el.textContent = siteContent.kidsCampDesc1;
          }
          if (siteContent.kidsCampDesc2) {
            const el = document.getElementById('sanity-kids-camp-desc2');
            if (el) el.textContent = siteContent.kidsCampDesc2;
          }

          // კვირის მუხლი (მთავარი გვერდი). თუ CMS-ში ცარიელია,
          // გვერდზე რჩება კოდში ჩაწერილი სარეზერვო მუხლი.
          if (siteContent.weeklyVerseText) {
            const el = document.getElementById('sanity-weekly-verse');
            if (el) el.textContent = siteContent.weeklyVerseText;
          }
          if (siteContent.weeklyVerseRef) {
            const el = document.getElementById('sanity-weekly-verse-ref');
            if (el) el.textContent = siteContent.weeklyVerseRef;
          }
          // მუხლების PDF. ბმული მარკაპში დამალულია და მხოლოდ
          // აქ, ფაილის არსებობისას, იხსნება.
          const pdf = siteContent.weeklyVersePdf;
          if (pdf && pdf.url) {
            const el = document.getElementById('sanity-weekly-verse-pdf');
            if (el) {
              // Sanity-ს CDN სხვა დომენია, ამიტომ download ატრიბუტს
              // ბრაუზერი იგნორირებს — PDF ახალ ტაბში იხსნება.
              el.href = pdf.url;
              const meta = document.getElementById('sanity-weekly-verse-pdf-meta');
              if (meta && pdf.size) {
                const kb = pdf.size / 1024;
                meta.textContent = kb >= 1024
                  ? '· ' + (kb / 1024).toFixed(1) + ' MB'
                  : '· ' + Math.round(kb) + ' KB';
              }
              el.hidden = false;
            }
          }
        }

        // 2. UPDATE EVENTS (REGISTRATION PAGE)
        if (events && events.length > 0) {
          events.forEach(evt => {
            const card = document.querySelector(`.event-card[data-event="${evt.eventId}"]`);
            if (card) {
              const isActive = evt.status === 'active';
              const statusText = isActive ? 'ღიაა' : 'დასრულდა';
              const statusClassToRemove = isActive ? 'status-closed' : 'status-active';
              const statusClassToAdd = isActive ? 'status-active' : 'status-closed';
              const buttonText = isActive ? 'რეგისტრაციის გავლა' : 'რეგისტრაცია დასრულდა';
              const metaIconClass = evt.eventId === 'conference' ? 'fa-location-dot' : 'fa-users';

              // Update card classes
              card.classList.remove(statusClassToRemove);
              card.classList.add(statusClassToAdd);

              // Update status badge
              const badge = card.querySelector('.event-status-badge');
              if (badge) badge.textContent = statusText;

              // Update image
              const img = card.querySelector('.event-image-wrap img');
              if (img && evt.imageUrl) {
                img.src = evt.imageUrl;
              }

              // Update title
              const title = card.querySelector('.event-title');
              if (title && evt.title) title.textContent = evt.title;

              // Update metadata rows
              const metas = card.querySelectorAll('.event-meta');
              if (metas.length >= 2) {
                if (evt.dateText) {
                  metas[0].innerHTML = `<i class="fa-regular fa-calendar"></i> ${evt.dateText}`;
                }
                if (evt.detailsText) {
                  metas[1].innerHTML = `<i class="fa-solid ${metaIconClass}"></i> ${evt.detailsText}`;
                }
              }

              // Update description
              const desc = card.querySelector('.event-description');
              if (desc && evt.description) desc.textContent = evt.description;

              // Update button
              const button = card.querySelector('.btn-register-cta');
              if (button) {
                button.textContent = buttonText;
                if (isActive) {
                  button.removeAttribute('disabled');
                } else {
                  button.setAttribute('disabled', 'true');
                }
              }
            }
          });
        }

        // 3. UPDATE SERMONS (SERMONS PAGE)
        if (sermons && sermons.length > 0) {
          const seriesGrid = document.querySelector('.series-grid');
          if (seriesGrid) {
            // Keep static cards that are NOT in Sanity (e.g. by title)
            const staticCards = Array.from(seriesGrid.querySelectorAll('.series-card'));
            const sanityTitles = new Set(sermons.map(s => s.title.trim().toLowerCase()));
            
            const uniqueStaticCards = staticCards.filter(card => {
              const titleEl = card.querySelector('.series-info h3');
              if (!titleEl) return false;
              const title = titleEl.textContent.trim().toLowerCase();
              return !sanityTitles.has(title);
            });

            let sermonsHtml = '';
            sermons.forEach(series => {
              let episodesHtml = '';
              const episodeCount = series.episodes ? series.episodes.length : 0;
              
              if (series.episodes) {
                series.episodes.forEach((ep, index) => {
                  const epVideoId = getYouTubeId(ep.youtubeUrl);
                  const isPlayingClass = (index === 0) ? 'is-playing' : '';
                  episodesHtml += `
                    <div class="episode-item ${isPlayingClass}" data-video-id="${epVideoId || ''}">
                        <div class="episode-title-block">
                            <span class="episode-title"><i class="fa-solid fa-play"></i> ${ep.title}</span>
                            <span class="episode-speaker">სპიკერი: ${ep.speaker}</span>
                        </div>
                        ${ep.duration ? `<span class="episode-meta">${ep.duration}</span>` : ''}
                    </div>
                  `;
                });
              }

              sermonsHtml += `
                <div class="series-card" data-category="${series.category}">
                    <div class="series-thumbnail">
                        <div class="thumbnail-img-wrap">
                            <img src="${series.thumbnailUrl || 'https://picsum.photos/600/400'}" alt="${series.title}" onerror="this.onerror=null; this.src='https://picsum.photos/600/400';">
                        </div>
                        <div class="series-meta-details">
                            <div class="meta-description-section">
                                <span class="meta-label">სერიის შესახებ</span>
                                <p class="meta-description-text">${series.description}</p>
                            </div>
                            <div class="meta-tags-section">
                                <div class="meta-tag">
                                    <i class="fa-solid fa-folder"></i>
                                    <div>კატეგორია: ${
                                      series.category === 'spiritual' ? 'სულიერი ზრდა' :
                                      series.category === 'family' ? 'ოჯახი & ცხოვრება' : 'ბიბლიური სწავლებები'
                                    }</div>
                                </div>
                                <div class="meta-tag">
                                    <i class="fa-solid fa-user"></i>
                                    <div>სპიკერი: ${series.speaker}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="series-main">
                        <div class="series-header">
                            <div class="series-info">
                                <h3>${series.title}</h3>
                                <p>${series.subtitle}</p>
                            </div>
                            <div style="display: flex; align-items: center;">
                                <span class="series-badge">${episodeCount} ეპიზოდი</span>
                                <i class="fa-solid fa-chevron-down series-icon"></i>
                            </div>
                        </div>
                        <div class="episodes-panel">
                            <div class="episodes-list">
                                ${episodesHtml}
                            </div>
                        </div>
                    </div>
                </div>
              `;
            });
            
            // Rebuild container and append cards
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = sermonsHtml;
            const sanityCards = Array.from(tempDiv.children);
            
            seriesGrid.innerHTML = '';
            sanityCards.forEach(card => seriesGrid.appendChild(card));
            uniqueStaticCards.forEach(card => seriesGrid.appendChild(card));
          }
        }
      }
    })
    .catch(error => console.error('Error fetching data from Sanity:', error));
}

document.addEventListener('DOMContentLoaded', updatePageContent);
