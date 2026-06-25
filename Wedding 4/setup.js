const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = __dirname;
const SITE = path.join(ROOT, 'wedbyvaleri.ru');
const WEDDING1_SITE = path.join(ROOT, '..', 'Wedding 1', 'wedbyvaleri.ru');
const PAGE_ID = '126738156';
const HTML_NAME = 'maket-silk-brown.html';

const MEDIA = {
  audio: {
    local: 'audio/background.mp3',
    match: (url) => url.includes('dropbox') && url.includes('.mp3'),
  },
  video: {
    local: 'video/intro.mp4',
    match: (url) =>
      url.includes('kinescopecdn.net') ||
      (url.includes('dropbox') && url.includes('.mp4')) ||
      url.includes('dropboxusercontent.com') && url.includes('.mp4'),
  },
};

function curl(url, dest) {
  const dir = path.dirname(dest);
  fs.mkdirSync(dir, { recursive: true });
  if (fs.existsSync(dest) && fs.statSync(dest).size > 0) return true;
  try {
    execSync(`curl.exe -sL --fail "${url}" -o "${dest}"`, { stdio: 'pipe', maxBuffer: 50 * 1024 * 1024 });
    return fs.existsSync(dest) && fs.statSync(dest).size > 0;
  } catch {
    return false;
  }
}

function urlToLocal(url) {
  url = url.replace(/&amp;/g, '&');
  const clean = url.split('?')[0];
  if (MEDIA.audio.match(url)) return MEDIA.audio.local;
  if (MEDIA.video.match(url)) return MEDIA.video.local;
  if (clean.startsWith('https://static.tildacdn.com/css/')) return 'css/' + path.basename(clean);
  if (clean.startsWith('https://static.tildacdn.com/js/')) return 'js/' + path.basename(clean);
  if (clean.startsWith('https://static.tildacdn.com/ws/')) return clean.replace('https://static.tildacdn.com/', '');
  if (clean.startsWith('https://static.tildacdn.com/')) return clean.replace('https://static.tildacdn.com/', '');
  if (clean.startsWith('https://neo.tildacdn.com/js/')) return 'js/' + path.basename(clean);
  if (url.includes('cdn.postnikovmd.com/tilda')) return 'tilda@1.5/mods.min.js';
  if (url.startsWith('https://thb.tildacdn.com/')) {
    const m = url.match(/thb\.tildacdn\.com\/(tild[^/]+)\/-\/resize\/\d+x\/(.+?)(?:\?|$)/);
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

console.log('Building Wedding 4 site...');
fs.mkdirSync(SITE, { recursive: true });

const sourceHtml = fs.readFileSync(path.join(ROOT, 'source.html'), 'utf8');
let allUrls = [...sourceHtml.matchAll(/https?:\/\/[^"'\s<>)]+/g)].map((m) => m[0].replace(/&amp;/g, '&'));

const pageCssMatch = sourceHtml.match(/https:\/\/static\.tildacdn\.com\/ws\/project15229836\/tilda-blocks-page\d+\.min\.css\?t=\d+/);
const pageJsMatch = sourceHtml.match(/https:\/\/static\.tildacdn\.com\/ws\/project15229836\/tilda-blocks-page\d+\.min\.js\?t=\d+/);
const pageCssLocal = `ws/project15229836/tilda-blocks-page${PAGE_ID}.min.css`;
const pageJsLocal = `ws/project15229836/tilda-blocks-page${PAGE_ID}.min.js`;

curl(pageCssMatch[0].split('?')[0], path.join(SITE, pageCssLocal));
curl(pageJsMatch[0].split('?')[0], path.join(SITE, pageJsLocal));

let pageCss = fs.readFileSync(path.join(SITE, pageCssLocal), 'utf8');
allUrls = [...new Set([...allUrls, ...[...pageCss.matchAll(/https?:\/\/[^"'\s)]+/g)].map((m) => m[0])])];

const skipPatterns = [
  'mc.yandex',
  'fonts.googleapis',
  'fonts.gstatic',
  'wedbyvaleri.ru',
  'yandex.com/maps',
  '2gis.ru',
  'ws.tildacdn.com',
  'postnikovmd.com/mods',
  'wa.me',
  't.me',
  'tel:',
];

const downloads = new Map();
for (const url of allUrls) {
  if (skipPatterns.some((p) => url.includes(p)) || url === 'https://static.tildacdn.com') continue;

  if (MEDIA.audio.match(url)) {
    downloads.set(MEDIA.audio.local, url);
    continue;
  }
  if (MEDIA.video.match(url) && !downloads.has(MEDIA.video.local)) {
    const kinescope = allUrls.find((u) => u.includes('kinescopecdn.net'));
    const dropbox = allUrls.find((u) => u.includes('dropbox') && u.includes('.mp4'));
    downloads.set(MEDIA.video.local, kinescope || dropbox || url);
    continue;
  }
  if (MEDIA.video.match(url)) continue;

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
    if (local.includes('video')) console.log(`  Video: ${(fs.statSync(dest).size / 1024 / 1024).toFixed(1)} MB`);
  } else {
    fail++;
    console.log('  FAIL:', local, url.slice(0, 80));
  }
}

for (const url of [...pageCss.matchAll(/https:\/\/static\.tildacdn\.com\/([^'"]+)/g)].map((m) => m[0])) {
  pageCss = pageCss.split(url).join(url.replace('https://static.tildacdn.com/', ''));
}
pageCss = pageCss.replace(/url\('tild/g, "url('../../tild");
fs.writeFileSync(path.join(SITE, pageCssLocal), pageCss, 'utf8');

let html = sourceHtml;
const replacements = new Map();

for (const url of allUrls) {
  const local = urlToLocal(url);
  if (local) replacements.set(url, local);
  const noQuery = url.split('?')[0];
  if (local && noQuery !== url) replacements.set(noQuery, local);
}

replacements.set(pageCssMatch[0], pageCssLocal);
replacements.set(pageJsMatch[0], pageJsLocal);
replacements.set('https://cdn.postnikovmd.com/tilda@1.5/mods.min.js', 'tilda@1.5/mods.min.js');
replacements.set('https://neo.tildacdn.com/js/tilda-fallback-1.0.min.js', 'js/tilda-fallback-1.0.min.js');

for (const [from, to] of [...replacements.entries()].sort((a, b) => b[0].length - a[0].length)) {
  html = html.split(from).join(to);
}

html = html.replace(/video\/intro\.mp4\?[^"']+/g, 'video/intro.mp4');

const thumbPatterns = [...html.matchAll(/tild[a-f0-9-]+\/-\/resize\/\d+x\/[^"'\s]+/g)].map((m) => m[0]);
for (const thumb of [...new Set(thumbPatterns)]) {
  const m = thumb.match(/(tild[^/]+)\/-\/resize\/\d+x\/(.+)/);
  if (m) html = html.split(thumb).join(`${m[1]}/${m[2]}`);
}

html = html.replace(/<script>\s*document\.addEventListener\('keydown'[\s\S]*?<\/script>/, '');
html = html.replace(/<div style="display:none!important;color:#FFFFFF!important[\s\S]*?<\/body>/, '</body>');
html = html.replace(/<!-- Stat -->[\s\S]*?<\/html>/, '</html>');
html = html.replace('data-tilda-lazy="yes"', 'data-tilda-lazy="no"');
html = html.replace(/<title>\s*Макет Коричневый шелк<\/title>/, '<title>Приглашение на свадьбу — Шёлк</title>');

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
