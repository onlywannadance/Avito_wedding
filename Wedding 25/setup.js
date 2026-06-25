const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = __dirname;
const SITE = path.join(ROOT, 'weddingbyvaleri.ru');
const BASE = 'https://weddingbyvaleri.ru';
const HTML_NAME = 'maket-ampire.html';
const SOURCE_URL = `${BASE}/maket-ampire`;

// Desktop gate / QR overlay (hidden on mobile in original CSS)
const GATE_DESKTOP_ONLY_IDS = [
  'n-45d606f9-d15a-4f1a-b91e-7130fd40792d',
  'n-8ce22d27-fc27-4963-a7de-75ba35852364',
  'n-e0c56a8e-54ef-4052-9210-0bb1a80e6726',
];

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

function selcdnToLocal(url) {
  const m = url.match(/selcdn\.ru\/[^/]+\/(uploads\/[^?"'\s)]+)/);
  return m ? m[1] : null;
}

function craftumToLocal(url) {
  const m = url.match(/\/uploads\/\d+\/[^?"'\s)]+/);
  return m ? m[0].slice(1) : null;
}

function urlToLocal(url) {
  url = url.replace(/&amp;/g, '&');
  const craftum = craftumToLocal(url);
  if (craftum) return craftum;
  const selcdn = selcdnToLocal(url);
  if (selcdn) return selcdn;
  if (url.startsWith(`${BASE}/uploads/`)) return url.slice(BASE.length + 1);
  if (url.startsWith(`${BASE}/static/`)) return 'static/' + path.basename(url.split('?')[0]);
  return null;
}

function fixCraftumContent(text, { stripResponsiveImg = false } = {}) {
  let out = text.replace(/https:\/\/static\.craftum\.com\/[^"'\s)]+/g, (url) => {
    const local = urlToLocal(cleanUrl(url));
    return local || url;
  });
  if (stripResponsiveImg) {
    out = out.replace(/\s+srcset="[^"]*"/gi, '');
    out = out.replace(/\s+sizes="[^"]*"/gi, '');
    out = out.replace(/\s+data-system-sizes="[^"]*"/gi, '');
    out = out.replace(/\s+data-multitype="[^"]*"/gi, '');
    out = out.replace(/\s+data-system-bg-sizes="[^"]*"/gi, '');
    out = out.replace(/\s+data-system-bg-url(?:="[^"]*")?/gi, '');
  }
  return out;
}

function fixBackgroundVars(css) {
  return css.replace(
    /background-image:var\(--bg-\d+, var\(--background-image\)\)/g,
    'background-image:none;background-color:rgba(255,255,255,1)'
  );
}

function cleanUrl(url) {
  url = url.replace(/&amp;/g, '&');
  for (const s of ['&quot;', '"', "'", '<', '>', ' ', ')', '\\', '{', '}']) {
    const i = url.indexOf(s);
    if (i !== -1) url = url.slice(0, i);
  }
  return url.replace(/[),;]+$/, '');
}

function extractUrls(text) {
  const urls = new Set();
  const exts = 'jpg|jpeg|png|gif|webp|svg|woff2?|mp3|mp4|css|js';
  for (const m of text.matchAll(new RegExp(`https?://[^\\s<>"']+?\\.(?:${exts})`, 'gi'))) {
    urls.add(cleanUrl(m[0]));
  }
  for (const m of text.matchAll(/https?:\/\/[^\s<>"']*selcdn[^\s<>"']+/gi)) {
    urls.add(cleanUrl(m[0]));
  }
  for (const m of text.matchAll(/https?:\/\/static\.craftum\.com\/[^\s<>"']+/gi)) {
    urls.add(cleanUrl(m[0]));
  }
  return [...urls];
}

function extractMobileBlock(css) {
  const marker = '@media screen and (max-width: 666px){';
  const parts = [];
  let i = 0;
  while ((i = css.indexOf(marker, i)) !== -1) {
    let start = i + marker.length;
    let depth = 1;
    let j = start;
    while (j < css.length && depth > 0) {
      if (css[j] === '{') depth++;
      else if (css[j] === '}') depth--;
      j++;
    }
    parts.push(css.slice(start, j - 1));
    i = j;
  }
  return parts.join('');
}

function localizeText(text) {
  let out = text;
  const replacements = new Map();

  for (const url of extractUrls(text)) {
    const local = urlToLocal(url);
    if (local) replacements.set(url, local);
  }

  for (const url of [...text.matchAll(/https:\/\/[^/]+\.selcdn\.ru\/[^"'\s)]+/g)].map((m) => m[0])) {
    const local = urlToLocal(url);
    if (local) replacements.set(url, local);
  }

  for (const [from, to] of [...replacements.entries()].sort((a, b) => b[0].length - a[0].length)) {
    out = out.split(from).join(to);
  }
  return out;
}

function extractStaticFiles(html) {
  const files = [...html.matchAll(/href="\/static\/([^"]+)"/g)].map((m) => m[1]);
  if (!files.includes('common.js')) files.push('common.js');
  return [...new Set(files)];
}

console.log('Building Wedding 25 site (Ampire)...');
fs.mkdirSync(path.join(SITE, 'static'), { recursive: true });

if (!fs.existsSync(path.join(ROOT, 'source.html'))) {
  curl(SOURCE_URL, path.join(ROOT, 'source.html'));
}

const sourceHtml = fs.readFileSync(path.join(ROOT, 'source.html'), 'utf8');
const STATIC_FILES = extractStaticFiles(sourceHtml);
console.log(`Static files: ${STATIC_FILES.length}`);

let ok = 0;
let fail = 0;
for (const file of STATIC_FILES) {
  const dest = path.join(SITE, 'static', file);
  if (curl(`${BASE}/static/${file}`, dest)) ok++;
  else {
    fail++;
    console.log('  FAIL static:', file);
  }
}

let allUrls = extractUrls(sourceHtml);
for (const file of STATIC_FILES.filter((f) => f.endsWith('.css'))) {
  const cssPath = path.join(SITE, 'static', file);
  if (fs.existsSync(cssPath)) {
    allUrls = [...new Set([...allUrls, ...extractUrls(fs.readFileSync(cssPath, 'utf8'))])];
  }
}

const downloads = new Map();
for (const url of allUrls) {
  const local = urlToLocal(url);
  if (local && !downloads.has(local)) {
    let downloadUrl = url;
    if (url.includes('static.craftum.com')) {
      const localPath = craftumToLocal(url);
      if (localPath) downloadUrl = `${BASE}/${localPath}`;
      else {
        const m = url.match(/https:\/\/[^/]+\.selcdn\.ru\/[^/]+\/(uploads\/[^"')\s]+)/);
        if (m) downloadUrl = m[0];
        else continue;
      }
    }
    downloads.set(local, downloadUrl.split('?')[0]);
  }
}

console.log(`Downloading ${downloads.size} media assets...`);
for (const [local, url] of downloads) {
  const dest = path.join(SITE, local);
  if (curl(url, dest)) ok++;
  else {
    fail++;
    console.log('  FAIL:', local);
  }
}

let mobileRules = '';
for (const file of STATIC_FILES.filter((f) => f.endsWith('.css'))) {
  const cssPath = path.join(SITE, 'static', file);
  if (!fs.existsSync(cssPath)) continue;
  let css = fixBackgroundVars(fixCraftumContent(localizeText(fs.readFileSync(cssPath, 'utf8'))));
  mobileRules += extractMobileBlock(css);
  fs.writeFileSync(cssPath, css, 'utf8');
}

const commonJsPath = path.join(SITE, 'static', 'common.js');
if (fs.existsSync(commonJsPath)) {
  fs.writeFileSync(commonJsPath, fixCraftumContent(localizeText(fs.readFileSync(commonJsPath, 'utf8'))), 'utf8');
}

mobileRules = fixBackgroundVars(fixCraftumContent(mobileRules));

const desktopCss = `/* Craftum mobile layout — applied on all screen sizes */
.craftum-label {
  display: none !important;
}

${GATE_DESKTOP_ONLY_IDS.map((id) => `#${id}`).join(',\n')} {
  display: none !important;
}

body.th1 {
  margin: 0;
  background: #ffffff;
}

[data-blocks-wrapper] {
  max-width: 430px;
  width: 100%;
  margin: 0 auto;
  background: #ffffff;
  overflow-x: hidden;
  position: relative;
}

[data-blocks-wrapper] > .cli-block[data-converted="true"] {
  width: 100% !important;
  max-width: 361px !important;
  margin-left: auto !important;
  margin-right: auto !important;
  overflow: hidden !important;
  position: relative !important;
}

[data-blocks-wrapper] > .cli-block[data-converted="true"] .cli-block__content {
  max-width: 361px !important;
  width: 100% !important;
  margin-left: auto !important;
  margin-right: auto !important;
  position: relative !important;
}

.cli-block__content.cli-grid {
  position: relative !important;
}

.cli-image {
  object-fit: cover;
}

.cli-popup {
  display: none;
}

.cli-popup.active {
  display: block;
}

${mobileRules}

@media screen and (min-width: 667px) {
  body.th1 {
    background: #e8e4df;
    min-height: 100vh;
  }
  [data-blocks-wrapper] {
    box-shadow: 0 12px 48px rgba(0, 0, 0, 0.14);
  }
}
`;
fs.writeFileSync(path.join(SITE, 'static', 'desktop-adaptation.css'), desktopCss, 'utf8');

let html = fixCraftumContent(localizeText(sourceHtml), { stripResponsiveImg: true });
html = html.replace(/href="\/static\//g, 'href="static/');
html = html.replace(/src="\/static\//g, 'src="static/');
html = html.replace(/href="\/uploads\//g, 'href="uploads/');
html = html.replace(/src="\/uploads\//g, 'src="uploads/');

if (!html.includes('<title>')) {
  html = html.replace(
    '<meta charset="utf-8"/>',
    '<meta charset="utf-8"/>\n        <title>Приглашение на свадьбу — Ampire</title>'
  );
} else {
  html = html.replace(/<title>[^<]*<\/title>/, '<title>Приглашение на свадьбу — Ampire</title>');
}

html = html.replace(/<link rel="stylesheet" href="static\/desktop-adaptation\.css"\/>/, '');
html = html.replace(
  '</head>',
  '                <link rel="stylesheet" href="static/desktop-adaptation.css"/>\n    </head>'
);

html = html.replace(/<meta name="robots" content="noindex, nofollow">/, '<meta name="robots" content="noindex">');

fs.writeFileSync(path.join(SITE, HTML_NAME), html, 'utf8');

fs.writeFileSync(
  path.join(ROOT, 'index.html'),
  `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta http-equiv="refresh" content="0; url=weddingbyvaleri.ru/${HTML_NAME}">
  <title>Приглашение на свадьбу</title>
  <script>location.replace('weddingbyvaleri.ru/${HTML_NAME}');</script>
</head>
<body>
  <p><a href="weddingbyvaleri.ru/${HTML_NAME}">Открыть приглашение</a></p>
</body>
</html>`,
  'utf8'
);

console.log(`\nDone: ${ok} OK, ${fail} failed`);
console.log(`Desktop CSS mobile rules: ${mobileRules.length} chars`);
console.log(`Open: weddingbyvaleri.ru/${HTML_NAME}`);
