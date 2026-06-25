const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = __dirname;
const SITE = path.join(ROOT, 'wedbyvaleri.ru');
const WEDDING1_SITE = path.join(ROOT, '..', 'Wedding 1', 'wedbyvaleri.ru');
const PAGE_ID = '143805086';
const HTML_NAME = 'maket_batiste.html';
const AUDIO_URL =
  'https://www.dropbox.com/scl/fi/ke6lw3a0jhz866w1yhq43/a-thousand-years-instrumental-violin-piano-cover_aSfWp0Zd.mp3?rlkey=w1i541oqcf5svcx6uydu4x8s1&st=xfe95t92&raw=1';

function curl(url, dest) {
  const dir = path.dirname(dest);
  fs.mkdirSync(dir, { recursive: true });
  if (fs.existsSync(dest) && fs.statSync(dest).size > 0) return true;
  try {
    execSync(`curl.exe -sL --fail "${url}" -o "${dest}"`, { stdio: 'pipe' });
    return fs.existsSync(dest) && fs.statSync(dest).size > 0;
  } catch {
    return false;
  }
}

function urlToLocal(url) {
  url = url.replace(/&amp;/g, '&').split('?')[0];
  if (url.startsWith('https://static.tildacdn.com/css/')) {
    return 'css/' + path.basename(url);
  }
  if (url.startsWith('https://static.tildacdn.com/js/')) {
    return 'js/' + path.basename(url);
  }
  if (url.startsWith('https://static.tildacdn.com/ws/')) {
    return url.replace('https://static.tildacdn.com/', '');
  }
  if (url.startsWith('https://static.tildacdn.com/')) {
    return url.replace('https://static.tildacdn.com/', '');
  }
  if (url.startsWith('https://neo.tildacdn.com/js/')) {
    return 'js/' + path.basename(url);
  }
  if (url.includes('cdn.postnikovmd.com/tilda')) {
    return 'tilda@1.5/mods.min.js';
  }
  if (url.startsWith('https://thb.tildacdn.com/')) {
    const m = url.match(/thb\.tildacdn\.com\/(tild[^/]+)\/-\/resize\/\d+x\/(.+)$/);
    if (m) return `${m[1]}/${m[2]}`;
  }
  return null;
}

function copyFromWedding1(rel) {
  const src = path.join(WEDDING1_SITE, rel);
  const dest = path.join(SITE, rel);
  if (fs.existsSync(src) && !fs.existsSync(dest)) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
    return true;
  }
  return false;
}

console.log('Building Wedding 2 site...');
fs.mkdirSync(SITE, { recursive: true });

const sourceHtml = fs.readFileSync(path.join(ROOT, 'source.html'), 'utf8');

// Collect all URLs from HTML
let allUrls = [...sourceHtml.matchAll(/https?:\/\/[^"'\s<>)]+/g)].map((m) => m[0].replace(/&amp;/g, '&'));

// Download page CSS first
const pageCssUrl = `https://static.tildacdn.com/ws/project15229836/tilda-blocks-page${PAGE_ID}.min.css`;
const pageCssLocal = `ws/project15229836/tilda-blocks-page${PAGE_ID}.min.css`;
curl(pageCssUrl, path.join(SITE, pageCssLocal));

let pageCss = fs.readFileSync(path.join(SITE, pageCssLocal), 'utf8');
const cssUrls = [...pageCss.matchAll(/https?:\/\/[^"'\s)]+/g)].map((m) => m[0]);
allUrls = [...new Set([...allUrls, ...cssUrls])];

// Build download list
const downloads = new Map();
for (const url of allUrls) {
  if (
    url.includes('mc.yandex') ||
    url.includes('fonts.googleapis') ||
    url.includes('fonts.gstatic') ||
    url.includes('wedbyvaleri.ru') ||
    url.includes('yandex.com/maps') ||
    url.includes('ws.tildacdn.com') ||
    url === 'https://static.tildacdn.com'
  ) {
    continue;
  }
  if (url.includes('dropbox.com') && url.includes('.mp3')) {
    downloads.set('audio/background.mp3', url);
    continue;
  }
  const local = urlToLocal(url);
  if (local) {
    let downloadUrl = url.split('?')[0];
    if (url.startsWith('https://thb.tildacdn.com/')) {
      const m = url.match(/thb\.tildacdn\.com\/(tild[^/]+)\/-\/resize\/\d+x\/(.+?)(?:\?|$)/);
      if (m) downloadUrl = `https://static.tildacdn.com/${m[1]}/${m[2]}`;
    }
    downloads.set(local, downloadUrl);
  }
}

// Shared assets - try copy from Wedding 1 first
const sharedPrefixes = ['css/tilda-', 'js/tilda-', 'js/uploadcare'];
console.log(`Downloading ${downloads.size} assets...`);
let ok = 0;
let fail = 0;
for (const [local, url] of downloads) {
  const dest = path.join(SITE, local);
  const isShared = sharedPrefixes.some((p) => local.startsWith(p));
  if (isShared && copyFromWedding1(local)) {
    ok++;
    continue;
  }
  if (curl(url, dest)) {
    ok++;
  } else {
    fail++;
    console.log('  FAIL:', local);
  }
}

// Localize fonts in page CSS
for (const url of [...pageCss.matchAll(/https:\/\/static\.tildacdn\.com\/([^'"]+)/g)].map((m) => m[0])) {
  const rel = url.replace('https://static.tildacdn.com/', '');
  pageCss = pageCss.split(url).join(rel);
}
pageCss = pageCss.replace(/url\('tild/g, "url('../../tild");
fs.writeFileSync(path.join(SITE, pageCssLocal), pageCss, 'utf8');

// Build HTML with local paths
let html = sourceHtml;
const replacements = new Map();

for (const url of allUrls) {
  if (url.includes('dropbox.com') && url.includes('.mp3')) {
    replacements.set(url, 'audio/background.mp3');
    continue;
  }
  const local = urlToLocal(url);
  if (local) replacements.set(url, local);
  const noQuery = url.split('?')[0];
  if (local && noQuery !== url) replacements.set(noQuery, local);
}

// Standard static replacements
const staticMap = {
  'https://cdn.postnikovmd.com/tilda@1.5/mods.min.js': 'tilda@1.5/mods.min.js',
  'https://neo.tildacdn.com/js/tilda-fallback-1.0.min.js': 'js/tilda-fallback-1.0.min.js',
  [`https://static.tildacdn.com/ws/project15229836/tilda-blocks-page${PAGE_ID}.min.css?t=1780320154`]: pageCssLocal,
  [`https://static.tildacdn.com/ws/project15229836/tilda-blocks-page${PAGE_ID}.min.js?t=1780320154`]:
    `ws/project15229836/tilda-blocks-page${PAGE_ID}.min.js`,
};
for (const [from, to] of Object.entries(staticMap)) {
  replacements.set(from, to);
}

// Sort by length descending for safe replacement
for (const [from, to] of [...replacements.entries()].sort((a, b) => b[0].length - a[0].length)) {
  html = html.split(from).join(to);
}

// Fix thb thumbnails in HTML (relative paths after static URL removal)
const thumbPatterns = [...html.matchAll(/tild[a-f0-9-]+\/-\/resize\/\d+x\/[^"'\s]+/g)].map((m) => m[0]);
for (const thumb of [...new Set(thumbPatterns)]) {
  const m = thumb.match(/(tild[^/]+)\/-\/resize\/\d+x\/(.+)/);
  if (m) html = html.split(thumb).join(`${m[1]}/${m[2]}`);
}

// Cleanup
html = html.replace(/<script>\s*document\.addEventListener\('keydown'[\s\S]*?<\/script>/, '');
html = html.replace(/<div style="display:none!important;color:#FFFFFF!important[\s\S]*?<\/body>/, '</body>');
html = html.replace(/<!-- Stat -->[\s\S]*?<\/html>/, '</html>');
html = html.replace('data-tilda-lazy="yes"', 'data-tilda-lazy="no"');
html = html.replace('<title>Макет Батист</title>', '<title>Приглашение на свадьбу — Батист</title>');

fs.writeFileSync(path.join(SITE, HTML_NAME), html, 'utf8');

const indexHtml = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta http-equiv="refresh" content="0; url=wedbyvaleri.ru/${HTML_NAME}">
  <title>Приглашение на свадьбу</title>
  <script>location.replace('wedbyvaleri.ru/${HTML_NAME}');</script>
</head>
<body>
  <p><a href="wedbyvaleri.ru/${HTML_NAME}">Открыть приглашение</a></p>
</body>
</html>`;
fs.writeFileSync(path.join(ROOT, 'index.html'), indexHtml, 'utf8');

console.log(`\nDone: ${ok} OK, ${fail} failed`);
console.log(`Open: wedbyvaleri.ru/${HTML_NAME}`);
