const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = __dirname;
const SITE = path.join(ROOT, 'weddingbyvaleri.ru');
const BASE = 'https://weddingbyvaleri.ru';
const HTML_NAME = 'maket-ruby.html';
const GATE_SECTION_ID = 'n-a807a9a3-de76-4e1f-9e1d-95ad7d3e90d0';
const GATE_CSS = '17a0e601-82f5-4f18-9c58-4151a3f5165f.css';
const GATE_DESKTOP_ONLY_IDS = [
  'n-e36ed595-6a78-4423-91ec-78558f40a03c',
  'n-fda4d35d-1a93-4116-ba66-8f13ccdecf3e',
  'n-4e2acce5-7f1b-419a-acac-13b06a6c156d',
  'n-9a188af3-dba2-4eae-85d5-b4bea69c7d73',
  'n-a76e2e0c-0212-4732-92e1-c6351c684d66',
];

const STATIC_FILES = [
  'a-common-styles.css', 'b-themes-styles.css', 'c-animation-styles.css',
  'd-simple-styles.css', 'e-complex-styles.css', 'f-blocks-styles.css',
  'g-libraries-styles.css', '17a0e601-82f5-4f18-9c58-4151a3f5165f.css',
  '1bd4a680-1396-4372-9d3c-29b1c58ee20d.css', '1da82e78-9f1f-4a60-9e3f-0cfa50e0d260.css',
  '30729c98-bfb0-40c6-a72c-133f6c8089bc.css', '31810f53-c213-48bb-b038-03cb26978ade.css',
  '50915480-1401-474b-94c4-51dfb2c2f1d1.css', '8da76c79-2c38-48e3-a07b-d5154dd08b3f.css',
  'a5e1d553-bb92-460a-94a4-251da19723cc.css', 'b34f77e8-01c8-4606-9875-d93bd839c712.css',
  'c60327a7-4de6-4606-8ccd-d3218bb87da7.css', 'fb9b311a-e84e-4996-8627-94f2996a097c.css',
  'common.js',
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
    'background-image:none;background-color:rgba(130,2,1,1)'
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

console.log('Building Wedding 11 site...');
fs.mkdirSync(path.join(SITE, 'static'), { recursive: true });

if (!fs.existsSync(path.join(ROOT, 'source.html'))) {
  curl(`${BASE}/maket-ruby`, path.join(ROOT, 'source.html'));
}

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

const sourceHtml = fs.readFileSync(path.join(ROOT, 'source.html'), 'utf8');
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
  html = html.replace('<meta charset="utf-8"/>', '<meta charset="utf-8"/>\n        <title>Приглашение на свадьбу — Рубин</title>');
} else {
  html = html.replace(/<title>[^<]*<\/title>/, '<title>Приглашение на свадьбу — Рубин</title>');
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
