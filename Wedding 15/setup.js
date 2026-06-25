const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = __dirname;
const SITE = path.join(ROOT, 'wedbyvaleri.ru');
const WEDDING1_SITE = path.join(ROOT, '..', 'Wedding 1', 'wedbyvaleri.ru');
const PROJECT_ID = '15229836';
const PAGE_ID = '80415216';
const HTML_NAME = 'maket-polaroid2.html';
const SOURCE_URL = 'https://wedbyvaleri.ru/maket-polaroid2';
const TITLE_FROM = 'Макет Полароид 2';
const TITLE_TO = 'Приглашение на свадьбу — Полароид 2';

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
  url = url.replace(/&amp;/g, '&');
  const clean = url.split('?')[0];
  if (url.includes('dropbox') && url.includes('.mp3')) return 'audio/background.mp3';
  if (url.includes('dropbox') && url.includes('.mp4')) return 'video/intro.mp4';
  if (url.includes('kinescopecdn.net') && url.includes('.mp4')) return 'video/intro.mp4';
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
  for (const m of text.matchAll(/https:\/\/thb\.tildacdn\.com\/[^\s<>"']+/gi)) {
    urls.add(cleanUrl(m[0]));
  }
  for (const m of text.matchAll(/https?:\/\/[^\s<>"']*dropbox[^\s<>"']+/gi)) {
    urls.add(cleanUrl(m[0]));
  }
  for (const m of text.matchAll(/https?:\/\/[^\s<>"']*kinescopecdn[^\s<>"']+/gi)) {
    urls.add(cleanUrl(m[0]));
  }
  for (const m of text.matchAll(/https:\/\/cdn\.postnikovmd\.com\/[^\s<>"']+/gi)) {
    urls.add(cleanUrl(m[0]));
  }
  for (const m of text.matchAll(/https:\/\/neo\.tildacdn\.com\/[^\s<>"']+/gi)) {
    urls.add(cleanUrl(m[0]));
  }
  return [...urls];
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

function fetchText(url) {
  return execSync(`curl.exe -sL --fail "${url}"`, { encoding: 'utf8', stdio: 'pipe' });
}

function collectWoffDownloads(text) {
  const map = new Map();
  for (const m of text.matchAll(/https:\/\/static\.tildacdn\.com\/(tild[^)"'\s]+\.woff2?)/g)) {
    map.set(m[1], `https://static.tildacdn.com/${m[1]}`);
  }
  for (const m of text.matchAll(/\.\.\/\.\.\/(tild[^)"'\s]+\.woff2?)/g)) {
    map.set(m[1], `https://static.tildacdn.com/${m[1]}`);
  }
  return map;
}

function localizeGoogleFonts(html) {
  const links = [
    ...new Set([
      ...[...html.matchAll(/href="(https:\/\/fonts\.googleapis\.com\/[^"]+)"/g)].map((m) => m[1]),
      ...[...html.matchAll(/href='(https:\/\/fonts\.googleapis\.com\/[^']+)'/g)].map((m) => m[1]),
    ]),
  ];
  if (!links.length) return html;

  console.log(`Localizing ${links.length} Google Font stylesheets...`);
  let combinedCss = '';
  const fontFiles = new Map();

  for (const link of links) {
    const css = fetchText(link);
    for (const m of css.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g)) {
      const url = m[1].replace(/['"]/g, '');
      const filename = decodeURIComponent(path.basename(url.split('?')[0]));
      const local = `fonts/${filename}`;
      if (!fontFiles.has(local)) fontFiles.set(local, url);
    }
    combinedCss += css + '\n';
  }

  for (const [local, url] of fontFiles) {
    const dest = path.join(SITE, local);
    if (!curl(url, dest)) console.log('  FAIL font:', local);
    else ok++;
  }

  let localCss = combinedCss;
  for (const [local, url] of fontFiles) {
    const bare = url.split('?')[0];
    localCss = localCss.split(url).join(`../${local}`);
    localCss = localCss.split(bare).join(`../${local}`);
  }

  fs.mkdirSync(path.join(SITE, 'css'), { recursive: true });
  fs.mkdirSync(path.join(SITE, 'fonts'), { recursive: true });
  fs.writeFileSync(path.join(SITE, 'css', 'google-fonts.css'), localCss, 'utf8');

  html = html.replace(/<link rel="preconnect" href="https:\/\/fonts\.gstatic\.com">\s*/g, '');
  html = html.replace(/<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com">\s*/g, '');
  for (const link of links) {
    html = html.split(`href="${link}"`).join('href="css/google-fonts.css"');
    html = html.split(`href='${link}'`).join('href="css/google-fonts.css"');
  }
  while (html.includes('css/google-fonts.css" type="text/css">\n<link rel="stylesheet" href="css/google-fonts.css"')) {
    html = html.replace(
      '<link rel="stylesheet" href="css/google-fonts.css" type="text/css">\n<link rel="stylesheet" href="css/google-fonts.css"',
      '<link rel="stylesheet" href="css/google-fonts.css"'
    );
  }
  html = html.replace(
    /(<link rel="stylesheet" href="css\/google-fonts\.css"[^>]*>\s*){2,}/g,
    '<link rel="stylesheet" href="css/google-fonts.css" type="text/css">\n'
  );

  return html;
}

function fixLocalHtml(html) {
  html = html.replace(
    /<script type="text\/javascript">\(function\(\) \{if\(\(\/bot[\s\S]*?<\/script>/,
    ''
  );

  html = html.replace(
    /\.t674__cover-carrier \{opacity:0;\}/g,
    '.t674__cover-carrier {opacity:1;}'
  );
  html = html.replace(
    'class="t674__cover-carrier t-bgimg"',
    'class="t674__cover-carrier t-bgimg loaded"'
  );

  html = html.replace(/url\((tild[a-f0-9-]+\/[^)'"]+)\)/g, "url('$1')");
  html = html.replace(/background-image:url\((tild[^)]+)\)/g, "background-image:url('$1')");

  html = html.replace(/\.t396__elem--anim-hidden\[data-elem-id="[^"]+"\]\{opacity:0;\}/g, '');

  if (!html.includes('css/local-fix.css')) {
    html = html.replace('</head>', '  <link rel="stylesheet" href="css/local-fix.css" type="text/css">\n</head>');
  }
  if (!html.includes('js/local-init.js')) {
    html = html.replace(/<\/body>\s*<\/html>/i, '  <script src="js/local-init.js"></script>\n</body></html>');
  }

  return html;
}

const localFixCss = `.t-records {
  opacity: 1 !important;
}

.t674__cover-carrier {
  opacity: 1 !important;
}
`;

const localInitJs = `(function () {
  function boot() {
    document.querySelectorAll('.t-records').forEach(function (el) {
      el.classList.add('t-records_visible');
      el.style.opacity = '1';
    });
    document.querySelectorAll('.t674__cover-carrier').forEach(function (el) {
      el.classList.add('loaded');
    });
    window.dispatchEvent(new Event('resize'));
  }

  function showHiddenFallback() {
    if (typeof window.t396_init === 'function' && typeof window.t_animationSBS__init !== 'undefined') return;
    document.querySelectorAll('.t396__artboard').forEach(function (board) {
      var hiddenImgs = board.querySelectorAll('.t396__elem--anim-hidden[data-elem-type="image"]');
      if (hiddenImgs.length) {
        var anyVisible = false;
        hiddenImgs.forEach(function (el) {
          if (parseFloat(window.getComputedStyle(el).opacity) > 0.01) anyVisible = true;
        });
        if (!anyVisible) hiddenImgs[0].style.setProperty('opacity', '1', 'important');
      }
      board.querySelectorAll('.t396__elem--anim-hidden').forEach(function (el) {
        if (el.getAttribute('data-elem-type') === 'image') return;
        if (parseFloat(window.getComputedStyle(el).opacity) < 0.01) {
          el.style.setProperty('opacity', '1', 'important');
        }
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.addEventListener('load', function () {
    setTimeout(showHiddenFallback, 3000);
  });
})();`;

console.log('Building Wedding 15 site...');
fs.mkdirSync(SITE, { recursive: true });

curl(SOURCE_URL, path.join(ROOT, 'source.html'));

const sourceHtml = fs.readFileSync(path.join(ROOT, 'source.html'), 'utf8');
let allUrls = extractUrls(sourceHtml);

const pageCssRe = new RegExp(`https://static\\.tildacdn\\.com/ws/project${PROJECT_ID}/tilda-blocks-page\\d+\\.min\\.css\\?t=\\d+`);
const pageJsRe = new RegExp(`https://static\\.tildacdn\\.com/ws/project${PROJECT_ID}/tilda-blocks-page\\d+\\.min\\.js\\?t=\\d+`);
const pageCssMatch = sourceHtml.match(pageCssRe);
const pageJsMatch = sourceHtml.match(pageJsRe);
if (!pageCssMatch || !pageJsMatch) {
  console.error('Page CSS/JS URLs not found in source.html');
  process.exit(1);
}

const pageCssLocal = `ws/project${PROJECT_ID}/tilda-blocks-page${PAGE_ID}.min.css`;
const pageJsLocal = `ws/project${PROJECT_ID}/tilda-blocks-page${PAGE_ID}.min.js`;

const pageCssDest = path.join(SITE, pageCssLocal);
if (fs.existsSync(pageCssDest)) fs.unlinkSync(pageCssDest);
curl(pageCssMatch[0].split('?')[0], pageCssDest);
curl(pageJsMatch[0].split('?')[0], path.join(SITE, pageJsLocal));

let pageCss = fs.readFileSync(pageCssDest, 'utf8');
allUrls = [...new Set([...allUrls, ...extractUrls(pageCss)])];

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
  if (url.includes('dropbox') && url.includes('.mp3')) {
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
    if (!downloads.has(local)) downloads.set(local, downloadUrl);
  }
}

for (const [local, url] of collectWoffDownloads(pageCss)) {
  if (!downloads.has(local)) downloads.set(local, url);
}

const sharedPrefixes = ['css/tilda-', 'js/tilda-', 'js/uploadcare'];
console.log(`Downloading ${downloads.size} assets...`);
let ok = 0;
let fail = 0;
const failed = [];
for (const [local, url] of downloads) {
  const dest = path.join(SITE, local);
  const isShared = sharedPrefixes.some((p) => local.startsWith(p));
  if (isShared && copyFromWedding1(local)) {
    ok++;
    continue;
  }
  if (curl(url, dest)) ok++;
  else {
    fail++;
    failed.push({ local, url });
    console.log('  FAIL:', local);
  }
}

if (failed.length) {
  for (const { local, url } of failed) {
    const dest = path.join(SITE, local);
    if (fs.existsSync(dest)) fs.unlinkSync(dest);
    if (curl(url, dest)) {
      ok++;
      fail--;
      console.log('  RETRY OK:', local);
    }
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
replacements.set(pageCssMatch[0].split('?')[0], pageCssLocal);
replacements.set(pageJsMatch[0].split('?')[0], pageJsLocal);
replacements.set('https://cdn.postnikovmd.com/tilda@1.5/mods.min.js', 'tilda@1.5/mods.min.js');
replacements.set('https://neo.tildacdn.com/js/tilda-fallback-1.0.min.js', 'js/tilda-fallback-1.0.min.js');

for (const [from, to] of [...replacements.entries()].sort((a, b) => b[0].length - a[0].length)) {
  html = html.split(from).join(to);
}

const thumbPatterns = [...html.matchAll(/tild[a-f0-9-]+\/-\/resize\/\d+x\/[^"'\s]+/g)].map((m) => m[0]);
for (const thumb of [...new Set(thumbPatterns)]) {
  const m = thumb.match(/(tild[^/]+)\/-\/resize\/\d+x\/(.+)/);
  if (m) html = html.split(thumb).join(`${m[1]}/${m[2]}`);
}

html = html.replace(/<script>\s*document\.addEventListener\('keydown'[\s\S]*?<\/script>/, '');
html = html.replace(/<div style="display:none!important;color:#FFFFFF!important[\s\S]*?<\/body>/, '</body>');
html = html.replace(/<!-- Stat -->[\s\S]*?<\/body>\s*<\/html>/i, '</body></html>');
html = html.replace(/<script type="text\/javascript">if\(!window\.mainTracker\)[\s\S]*?<\/body>\s*<\/html>/i, '</body></html>');
html = html.replace('data-tilda-lazy="yes"', 'data-tilda-lazy="no"');
html = html.replace(`<title>${TITLE_FROM}</title>`, `<title>${TITLE_TO}</title>`);

for (const m of [...html.matchAll(/src="\/\/megatimer\.ru\/get\/([^"]+\.js)"/g)]) {
  const remote = `https://megatimer.ru/get/${m[1]}`;
  const local = `js/megatimer-${m[1].replace('.js', '')}.js`;
  curl(remote, path.join(SITE, local));
  html = html.split(`//megatimer.ru/get/${m[1]}`).join(local);
  ok++;
}

html = fixLocalHtml(html);
html = localizeGoogleFonts(html);

fs.writeFileSync(path.join(SITE, 'css', 'local-fix.css'), localFixCss, 'utf8');
fs.writeFileSync(path.join(SITE, 'js', 'local-init.js'), localInitJs, 'utf8');

fs.writeFileSync(path.join(SITE, HTML_NAME), html, 'utf8');

fs.writeFileSync(
  path.join(ROOT, 'index.html'),
  `<!DOCTYPE html>
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
</html>`,
  'utf8'
);

console.log(`\nDone: ${ok} OK, ${fail} failed`);
console.log(`Open: wedbyvaleri.ru/${HTML_NAME}`);
