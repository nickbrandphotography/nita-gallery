#!/usr/bin/env node
/*
 * Builds the exhibition pages from content/exhibitions.json.
 *
 *   node tools/build-exhibitions.mjs            build from content/exhibitions.json
 *   node tools/build-exhibitions.mjs --example  build from content/exhibitions.example.json (local preview only)
 *
 * Writes:
 *   exhibitions.html               the /exhibitions index (now showing, coming up, past)
 *   exhibitions/<slug>.html        one page per show, at /exhibitions/<slug>
 *   sitemap.xml, llms.txt          the exhibition entries, between the EXHIBITIONS markers
 *
 * Header, footer, visit and contact sections are copied from visit.html on every build,
 * so the exhibition pages stay in step with the rest of the site.
 * Add a show: add an entry to content/exhibitions.json, put its images in img/ex/<slug>/,
 * run this script, check the page, then commit and push.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://www.nitagallery.com.au';
const GALLERY_ID = `${SITE}/#gallery`;
const example = process.argv.includes('--example');
const dataFile = path.join(ROOT, 'content', example ? 'exhibitions.example.json' : 'exhibitions.json');
const today = new Date().toISOString().slice(0, 10);

// Artists the gallery shows often: write just the name in the data file.
const ARTISTS = {
  'Ritushka': { page: '/ritushka', site: 'https://www.ritushka.com/', sameAs: ['https://www.ritushka.com/', 'https://www.instagram.com/ritushka.art/'] },
  'Nick Brand': { page: '/nick-brand', site: 'https://www.nickbrandphotography.com/about', sameAs: ['https://www.nickbrandphotography.com/', 'https://www.fiftypagesofshades.com/', 'https://www.instagram.com/nickbrandphotography/'] },
};

const HOURS = [
  ['Tue', '10am – 6pm'], ['Wed', '10am – 6pm'], ['Thu', '10am – 8pm'], ['Fri', '10am – 6pm'], ['Sat', '10am – 3pm'],
];

// ---------- helpers
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const d = (iso) => { const [y, m, dd] = iso.split('-').map(Number); return new Date(Date.UTC(y, m - 1, dd)); };
const fmt = (iso, year = true) => { const x = d(iso); return `${x.getUTCDate()} ${MONTHS[x.getUTCMonth()]}${year ? ' ' + x.getUTCFullYear() : ''}`; };
const fmtDay = (iso) => `${DAYS[d(iso).getUTCDay()]} ${fmt(iso, false)}`;
const range = (a, b) => (a.slice(0, 4) === b.slice(0, 4) ? `${fmt(a, false)} to ${fmt(b)}` : `${fmt(a)} to ${fmt(b)}`);
const t12 = (hhmm) => { let [h, m] = hhmm.split(':').map(Number); const ap = h >= 12 ? 'pm' : 'am'; h = h % 12 || 12; return m ? `${h}:${String(m).padStart(2, '0')}${ap}` : `${h}${ap}`; };
const listJoin = (a) => (a.length < 2 ? a.join('') : `${a.slice(0, -1).join(', ')} and ${a.at(-1)}`);
const abs = (p) => (/^https?:/.test(p) ? p : `${SITE}/${p.replace(/^\//, '')}`);
const status = (x) => (x.end < today ? 'past' : x.start > today ? 'upcoming' : 'now');
const ld = (o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`;
const fail = (msg) => { console.error(`exhibitions: ${msg}`); process.exit(1); };

// ---------- data
if (!fs.existsSync(dataFile)) fail(`missing ${path.relative(ROOT, dataFile)}`);
const shows = JSON.parse(fs.readFileSync(dataFile, 'utf8')).filter((x) => !x.draft);
const slugs = new Set();
for (const x of shows) {
  for (const k of ['slug', 'title', 'artists', 'medium', 'start', 'end', 'summary', 'body', 'hero']) if (!x[k]) fail(`"${x.title || x.slug}" is missing "${k}"`);
  if (!/^[a-z0-9-]+$/.test(x.slug)) fail(`slug "${x.slug}" must be lowercase letters, numbers and hyphens`);
  if (slugs.has(x.slug)) fail(`slug "${x.slug}" is used twice`);
  slugs.add(x.slug);
  if (x.summary.length > 160) console.warn(`exhibitions: "${x.title}" summary is ${x.summary.length} characters; Google shows about 155`);
  if (!fs.existsSync(path.join(ROOT, x.hero.src.split('?')[0]))) console.warn(`exhibitions: image not found yet: ${x.hero.src}`);
}
shows.sort((a, b) => b.start.localeCompare(a.start));

// ---------- shell copied from visit.html
const visit = fs.readFileSync(path.join(ROOT, 'visit.html'), 'utf8');
const cut = (s, a, b) => { const i = s.indexOf(a); const j = s.indexOf(b, i); if (i < 0 || j < 0) fail(`visit.html no longer contains "${a}"`); return s.slice(i, j); };
const headAssets = cut(visit, '<meta name="theme-color"', '<script type="application/ld+json">').replace(/<link rel="stylesheet" href="css\/visit\.css[^>]*>/, '');
const visitCss = (visit.match(/<link rel="stylesheet" href="css\/visit\.css[^>]*>/) || [''])[0];
const bodyTop = cut(visit, '<body', '<main id="top">').replace(' aria-current="page"', '');
const visitAndContact = cut(visit, '<section class="sec visit"', '</main>');
const bodyEnd = visit.slice(visit.indexOf('</main>'));

const page = ({ title, description, url, image, jsonld, main }) => `<!doctype html>
<html lang="en-AU">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<base href="/">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="NITA Gallery">
<meta property="og:locale" content="en_AU">
<meta name="twitter:card" content="summary_large_image">
<link rel="canonical" href="${esc(url)}">
<meta name="robots" content="index, follow, max-image-preview:large">
${headAssets}${visitCss}<link rel="stylesheet" href="css/exhibitions.css?v=${cssVersion()}">
${jsonld.map(ld).join('')}</head>
${bodyTop}<main id="top">
${main}
${visitAndContact}${bodyEnd}`;

function cssVersion() {
  const css = fs.readFileSync(path.join(ROOT, 'css', 'exhibitions.css'));
  let h = 0; for (const b of css) h = (h * 31 + b) >>> 0;
  return h.toString(16).padStart(8, '0');
}

// ---------- schema
const gallery = { '@type': 'ArtGallery', '@id': GALLERY_ID, name: 'NITA Gallery', url: `${SITE}/`,
  address: { '@type': 'PostalAddress', streetAddress: '68 Campbell Street', addressLocality: 'Surry Hills', addressRegion: 'NSW', postalCode: '2010', addressCountry: 'AU' } };
const person = (name) => ({ '@type': 'Person', name, ...(ARTISTS[name] ? { url: `${SITE}${ARTISTS[name].page}`, sameAs: ARTISTS[name].sameAs } : {}) });
const eventLd = (x) => {
  const url = `${SITE}/exhibitions/${x.slug}`;
  const e = {
    '@context': 'https://schema.org', '@type': 'ExhibitionEvent', '@id': `${url}#event`, name: x.title, url,
    description: x.summary, startDate: x.start, endDate: x.end,
    eventStatus: 'https://schema.org/EventScheduled', eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    isAccessibleForFree: true, location: gallery, organizer: { '@id': GALLERY_ID, '@type': 'ArtGallery', name: 'NITA Gallery', url: `${SITE}/` },
    performer: x.artists.map(person), image: [abs(x.hero.src), ...(x.images || []).map((i) => abs(i.src))],
    offers: { '@type': 'Offer', price: 0, priceCurrency: 'AUD', availability: 'https://schema.org/InStock', url, validFrom: x.announced || x.start },
  };
  if (x.opening) e.subEvent = { '@type': 'Event', name: `Opening night: ${x.title}`, startDate: `${x.opening.date}T${x.opening.start}:00+${tz(x.opening.date)}`,
    endDate: `${x.opening.date}T${x.opening.end}:00+${tz(x.opening.date)}`, location: { '@id': GALLERY_ID }, isAccessibleForFree: true,
    eventStatus: 'https://schema.org/EventScheduled', eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode' };
  if (x.works?.length) e.workFeatured = x.works.map((w) => ({ '@type': 'VisualArtwork', name: w.title, ...(w.url ? { url: w.url } : {}), creator: person(w.artist || x.artists[0]) }));
  return e;
};
// Sydney: AEDT (+11:00) from the first Sunday in October to the first Sunday in April, else AEST (+10:00)
function tz(iso) {
  const x = d(iso), y = x.getUTCFullYear();
  const firstSun = (m) => { const t = new Date(Date.UTC(y, m, 1)); t.setUTCDate(1 + ((7 - t.getUTCDay()) % 7)); return t; };
  return x >= firstSun(3) && x < firstSun(9) ? '10:00' : '11:00';
}
const crumbs = (items) => ({ '@context': 'https://schema.org', '@type': 'BreadcrumbList',
  itemListElement: items.map(([name, url], i) => ({ '@type': 'ListItem', position: i + 1, name, item: url })) });

// ---------- one exhibition page
function showPage(x) {
  const url = `${SITE}/exhibitions/${x.slug}`;
  const st = status(x);
  const names = listJoin(x.artists.map((n) => (ARTISTS[n] ? `<a href="${ARTISTS[n].page}">${esc(n)}</a>` : esc(n))));
  const when = range(x.start, x.end);
  const kicker = { now: 'Now showing', upcoming: 'Coming up', past: 'Past exhibition' }[st];
  const opening = x.opening ? `${fmtDay(x.opening.date)}, ${t12(x.opening.start)} to ${t12(x.opening.end)}` : '';
  const lede = `${esc(x.title)} ${st === 'past' ? 'was' : 'is'} an exhibition of ${x.count ? `${x.count} ` : ''}${esc(x.medium)} by ${names} at NITA Gallery, 68 Campbell Street, Surry Hills, ${st === 'past' ? 'which ran ' : ''}from ${when}. ${st === 'past' ? '' : `Free entry${opening && st === 'upcoming' ? `; opening night ${opening}` : ''}.`}`;
  const facts = [
    ['Dates', when],
    ...(opening ? [['Opening night', `${opening}. All welcome.`]] : []),
    ...(st === 'past' ? [] : [['Hours', `${HOURS.map(([dd, h]) => `${dd} ${h}`).join(', ')}. Open by appointment any day.`], ['Entry', 'Free']]),
    ['Where', 'NITA Gallery, 68 Campbell Street, Surry Hills NSW 2010. Five minutes\u2019 walk from Central Station.'],
    ...(x.priceFrom ? [['Prices', `Works from A$${Number(x.priceFrom).toLocaleString('en-AU')}`]] : []),
  ];
  const quote = x.quote ? `<blockquote class="x-quote rv"><p>\u201C${esc(x.quote.text)}\u201D</p><cite>${esc(x.quote.by)}</cite></blockquote>` : '';
  const imgs = (x.images || []).length ? `<section class="v-sec" aria-labelledby="xImgs"><div class="wrap"><h2 id="xImgs" class="v-h rv">In the room</h2><ul class="x-imgs">${x.images.map((i) => `<li class="rv"><figure><img src="${esc(i.src)}" alt="${esc(i.alt)}"${i.width ? ` width="${i.width}" height="${i.height}"` : ''} loading="lazy">${i.caption ? `<figcaption>${esc(i.caption)}</figcaption>` : ''}</figure></li>`).join('')}</ul></div></section>` : '';
  const works = (x.works || []).length ? `<section class="v-sec" aria-labelledby="xWorks"><div class="wrap"><h2 id="xWorks" class="v-h rv">Works in the exhibition</h2><ul class="v-see">${x.works.map((w) => `<li class="rv">${w.url ? `<a href="${esc(w.url)}">${esc(w.title)}</a>` : `<b>${esc(w.title)}</b>`}<span>${esc([w.artist || (x.artists.length > 1 ? '' : x.artists[0]), w.details].filter(Boolean).join(' · '))}</span></li>`).join('')}</ul><p class="v-p rv">Buy works from the show in the gallery or online in the <a href="/shop">NITA Gallery shop</a>.</p></div></section>` : '';
  const artists = `<section class="v-sec" aria-labelledby="xArtists"><div class="wrap"><h2 id="xArtists" class="v-h rv">About the ${x.artists.length > 1 ? 'artists' : 'artist'}</h2><ul class="v-see">${x.artists.map((n) => `<li class="rv">${ARTISTS[n] ? `<a href="${ARTISTS[n].page}">${esc(n)} at NITA Gallery</a><span>Portfolio and studio: <a href="${ARTISTS[n].site}">${esc(ARTISTS[n].site.replace(/^https:\/\/www\.|\/.*$/g, ''))}</a></span>` : `<b>${esc(n)}</b>`}${x.artistNotes?.[n] ? `<span>${esc(x.artistNotes[n])}</span>` : ''}</li>`).join('')}</ul></div></section>`;

  const main = `<section class="s-hero">
  <div class="wrap">
    <p class="kicker rv">${kicker} · ${esc(when)}</p>
    <h1 class="s-title rv">${esc(x.title)}</h1>
    <p class="s-lede answer rv">${lede.replace(/\s+/g, ' ').trim()}</p>
    ${st === 'past' ? '<p class="rv"><a class="btn ghost magnetic" href="/exhibitions"><span>All exhibitions</span></a></p>' : '<p class="rv"><a class="btn lg magnetic" href="/visit"><span>Plan your visit</span></a> <a class="btn ghost magnetic" href="/shop"><span>Shop the works</span></a></p>'}
  </div>
</section>

<section class="x-hero rv"><div class="wrap"><figure><img src="${esc(x.hero.src)}" alt="${esc(x.hero.alt)}"${x.hero.width ? ` width="${x.hero.width}" height="${x.hero.height}"` : ''} fetchpriority="high">${x.hero.caption ? `<figcaption>${esc(x.hero.caption)}</figcaption>` : ''}</figure></div></section>

<section class="v-sec" aria-labelledby="xAbout">
  <div class="wrap v-grid">
    <div>
      <h2 id="xAbout" class="v-h rv">About the exhibition</h2>
      ${x.body.map((p) => `<p class="v-p rv">${esc(p)}</p>`).join('\n      ')}
      ${quote}
    </div>
    <div>
      <h2 class="v-h rv">Details</h2>
      <dl class="v-dl rv">${facts.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
    </div>
  </div>
</section>
${imgs}
${works}
${artists}
<section class="v-sec" aria-labelledby="xMore"><div class="wrap"><h2 id="xMore" class="v-h rv">More exhibitions</h2><p class="v-p rv">See <a href="/exhibitions">all exhibitions at NITA Gallery</a>, or <a href="/visit">plan your visit to Surry Hills</a>.</p></div></section>
`;
  return page({
    title: `${x.title}: ${x.artists.join(' & ')} | NITA Gallery, Surry Hills`.slice(0, 120),
    description: x.summary, url, image: abs(x.hero.src),
    jsonld: [eventLd(x), crumbs([['NITA Gallery', `${SITE}/`], ['Exhibitions', `${SITE}/exhibitions`], [x.title, url]])],
    main,
  });
}

// ---------- index page
function indexPage() {
  const groups = [['now', 'Now showing'], ['upcoming', 'Coming up'], ['past', 'Past exhibitions']];
  const card = (x) => `<li class="rv"><a class="x-card" href="/exhibitions/${x.slug}"><img src="${esc(x.hero.src)}" alt="${esc(x.hero.alt)}" loading="lazy"><b>${esc(x.title)}</b></a><span>${esc(x.artists.join(' & '))} · ${esc(range(x.start, x.end))}</span><p>${esc(x.summary)}</p></li>`;
  const sections = groups.map(([k, h]) => {
    const list = shows.filter((x) => status(x) === k);
    if (k === 'past') list.sort((a, b) => b.end.localeCompare(a.end)); else list.sort((a, b) => a.start.localeCompare(b.start));
    return list.length ? `<section class="v-sec" aria-labelledby="x-${k}"><div class="wrap"><h2 id="x-${k}" class="v-h rv">${h}</h2><ul class="v-near x-list">${list.map(card).join('')}</ul></div></section>` : '';
  }).filter(Boolean).join('\n');
  const main = `<section class="s-hero">
  <div class="wrap">
    <p class="kicker rv">Exhibitions · NITA Gallery</p>
    <h1 class="s-title rv">Exhibitions<br><em>in Surry Hills.</em></h1>
    <p class="s-lede answer rv">NITA Gallery, 68 Campbell Street, Surry Hills, holds exhibitions of abstract painting, fine-art photography and wearable art. Between shows the walls always hang <a href="/ritushka">Ritushka's abstract paintings</a> and <a href="/nick-brand">Nick Brand's Fifty Pages of Shades</a>. Entry is free, Tuesday to Saturday.</p>
    <p class="rv"><a class="btn lg magnetic" href="/visit"><span>Plan your visit</span></a> <a class="btn ghost magnetic" href="/shop"><span>Shop the works</span></a></p>
  </div>
</section>
${sections || '<section class="v-sec"><div class="wrap"><p class="v-p rv">The next exhibition will be announced here. Until then, come and see the current hang, Tuesday to Saturday.</p></div></section>'}
`;
  const url = `${SITE}/exhibitions`;
  const jsonld = [crumbs([['NITA Gallery', `${SITE}/`], ['Exhibitions', url]])];
  if (shows.length) jsonld.push({ '@context': 'https://schema.org', '@type': 'ItemList', name: 'Exhibitions at NITA Gallery',
    itemListElement: shows.map((x, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE}/exhibitions/${x.slug}`, name: x.title })) });
  return page({ title: 'Exhibitions | NITA Gallery, Art Gallery in Surry Hills, Sydney',
    description: 'Current, upcoming and past exhibitions at NITA Gallery, 68 Campbell Street, Surry Hills: abstract painting, fine-art photography and wearable art. Free entry.',
    url, image: `${SITE}/img/brand/og.jpg`, jsonld, main });
}

// ---------- write
const outDir = path.join(ROOT, 'exhibitions');
fs.mkdirSync(outDir, { recursive: true });
for (const f of fs.readdirSync(outDir)) if (f.endsWith('.html') && !slugs.has(f.slice(0, -5))) fs.unlinkSync(path.join(outDir, f));
for (const x of shows) fs.writeFileSync(path.join(outDir, `${x.slug}.html`), showPage(x));
fs.writeFileSync(path.join(ROOT, 'exhibitions.html'), indexPage());

if (!example) {
  const between = (file, start, end, body) => {
    const p = path.join(ROOT, file); let s = fs.readFileSync(p, 'utf8');
    const i = s.indexOf(start), j = s.indexOf(end);
    if (i < 0 || j < 0) fail(`${file} is missing the ${start} / ${end} markers`);
    s = s.slice(0, i + start.length) + body + s.slice(j);
    fs.writeFileSync(p, s);
  };
  between('sitemap.xml', '<!-- EXHIBITIONS -->', '<!-- /EXHIBITIONS -->', '\n' + [
    `  <url><loc>${SITE}/exhibitions</loc><lastmod>${today}</lastmod></url>`,
    ...shows.map((x) => `  <url><loc>${SITE}/exhibitions/${x.slug}</loc><lastmod>${x.updated || x.announced || x.start}</lastmod></url>`),
  ].join('\n') + '\n  ');
  between('llms.txt', '<!-- EXHIBITIONS -->', '<!-- /EXHIBITIONS -->', '\n' + [
    `- [Exhibitions: current, upcoming and past](${SITE}/exhibitions)`,
    ...shows.map((x) => `- [${x.title}, ${x.artists.join(' and ')}, ${range(x.start, x.end)}](${SITE}/exhibitions/${x.slug}): ${x.summary}`),
  ].join('\n') + '\n');
}
console.log(`exhibitions: built ${shows.length} show page(s) and the index${example ? ' (example data, sitemap and llms.txt untouched)' : ''}.`);
