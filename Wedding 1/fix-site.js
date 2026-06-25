const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = __dirname;
const SITE = path.join(ROOT, 'wedbyvaleri.ru');

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

// --- 1. Download missing PNG images ---
const images = [
  ['tild6164-3162-4665-b264-633732393030/noroot.png', 'https://static.tildacdn.com/tild6164-3162-4665-b264-633732393030/noroot.png'],
  ['tild3837-3736-4063-b234-383239643833/Group_248_1.png', 'https://static.tildacdn.com/tild3837-3736-4063-b234-383239643833/Group_248_1.png'],
  ['tild6163-3366-4162-b131-616162626235/Group_28.png', 'https://static.tildacdn.com/tild6163-3366-4162-b131-616162626235/Group_28.png'],
  ['tild3762-3266-4264-a538-313938383962/_7_1.png', 'https://static.tildacdn.com/tild3762-3266-4264-a538-313938383962/_7_1.png'],
  ['tild6435-3366-4764-b666-393965323037/favicon_1.png', 'https://static.tildacdn.com/tild6435-3366-4764-b666-393965323037/favicon_1.png'],
  ['tild3165-6561-4636-a437-393833346565/favicon.png', 'https://static.tildacdn.com/tild3165-6561-4636-a437-393833346565/favicon.png'],
  ['tild3932-3863-4662-b565-623364653061/favicon_1.png', 'https://static.tildacdn.com/tild3932-3863-4662-b565-623364653061/favicon_1.png'],
];

console.log('Downloading missing images...');
for (const [rel, url] of images) {
  const dest = path.join(SITE, rel);
  const ok = curl(url, dest);
  console.log(ok ? `  OK ${rel}` : `  FAIL ${rel}`);
}

// --- 2. Download fonts and localize in page CSS ---
const cssPath = path.join(SITE, 'ws/project15229836/tilda-blocks-page143665736.min.css');
let css = fs.readFileSync(cssPath, 'utf8');
const fontUrls = [...new Set([...css.matchAll(/https:\/\/static\.tildacdn\.com\/([^'"]+\.woff)/g)].map((m) => m[0]))];

console.log(`Downloading ${fontUrls.length} fonts...`);
for (const url of fontUrls) {
  const rel = url.replace('https://static.tildacdn.com/', '');
  const dest = path.join(SITE, rel);
  curl(url, dest);
  css = css.split(url).join(rel.replace(/\\/g, '/'));
}
css = css.replace(/url\('tild/g, "url('../../tild");
fs.writeFileSync(cssPath, css, 'utf8');

// --- 3. Copy form-related assets from assets/ if missing ---
const formAssets = [
  ['css/tilda-zero-form-errorbox.min.css', 'assets/css/tilda-zero-form-errorbox.min.css'],
  ['css/tilda-zero-form-horizontal.min.css', 'assets/css/tilda-zero-form-horizontal.min.css'],
  ['css/tilda-date-picker-1.0.min.css', 'assets/css/tilda-date-picker-1.0.min.css'],
  ['css/tilda-range-1.0.min.css', 'assets/css/tilda-range-1.0.min.css'],
  ['css/tilda-img-select-1.0.min.css', 'assets/css/tilda-img-select-1.0.min.css'],
  ['js/tilda-phone-mask-1.1.min.js', 'assets/js/tilda-phone-mask-1.1.min.js'],
  ['js/tilda-date-picker-1.0.min.js', 'assets/js/tilda-date-picker-1.0.min.js'],
  ['js/tilda-calc-1.0.min.js', 'assets/js/tilda-calc-1.0.min.js'],
  ['js/tilda-upwidget-1.1.min.js', 'assets/js/tilda-upwidget-1.1.min.js'],
  ['js/uploadcare-3.x.full.min.js', 'assets/js/uploadcare-3.x.full.min.js'],
  ['js/uploadcare-3.x.min.js', 'assets/js/uploadcare-3.x.min.js'],
  ['js/tilda-range-1.0.min.js', 'assets/js/tilda-range-1.0.min.js'],
  ['js/tilda-img-select-1.0.min.js', 'assets/js/tilda-img-select-1.0.min.js'],
];

for (const [dest, src] of formAssets) {
  const destPath = path.join(SITE, dest);
  const srcPath = path.join(ROOT, src);
  if (!fs.existsSync(destPath) && fs.existsSync(srcPath)) {
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.copyFileSync(srcPath, destPath);
    console.log(`Copied ${dest}`);
  }
}

// --- 4. Download audio ---
const audioDest = path.join(SITE, 'audio/background.mp3');
const audioUrl = 'https://www.dropbox.com/scl/fi/pw2qzjc6mlw15zb975izh/Sleeping_At_Last_-_Turning_Page_48331714.mp3?rlkey=dxcxxea64nhcbknpsmgfd89iv&st=qn3zeyn4&raw=1';
if (!fs.existsSync(audioDest) && fs.existsSync(path.join(ROOT, 'assets/audio/background.mp3'))) {
  fs.mkdirSync(path.dirname(audioDest), { recursive: true });
  fs.copyFileSync(path.join(ROOT, 'assets/audio/background.mp3'), audioDest);
} else {
  curl(audioUrl, audioDest);
}
console.log('Audio:', fs.existsSync(audioDest) ? 'OK' : 'FAIL');

// --- 5. Fix HTML ---
const htmlPath = path.join(SITE, 'maket-etude.html');
let html = fs.readFileSync(htmlPath, 'utf8');

// Fix thumbnail paths -> full images
const thumbFixes = {
  'tild6164-3162-4665-b264-633732393030/-/resize/20x/noroot.png': 'tild6164-3162-4665-b264-633732393030/noroot.png',
  'tild3837-3736-4063-b234-383239643833/-/resize/20x/Group_248_1.png': 'tild3837-3736-4063-b234-383239643833/Group_248_1.png',
  'tild6163-3366-4162-b131-616162626235/-/resize/20x/Group_28.png': 'tild6163-3366-4162-b131-616162626235/Group_28.png',
  'tild3762-3266-4264-a538-313938383962/-/resize/20x/_7_1.png': 'tild3762-3266-4264-a538-313938383962/_7_1.png',
};
for (const [from, to] of Object.entries(thumbFixes)) {
  html = html.split(from).join(to);
}

// Fix audio
html = html.replace(
  'src="scl/fi/pw2qzjc6mlw15zb975izh/Sleeping_At_Last_-_Turning_Page_48331714.mp3"',
  'src="audio/background.mp3"'
);

// Fix external static.tildacdn form assets -> local
const staticReplacements = {
  'https://static.tildacdn.com/css/tilda-zero-form-errorbox.min.css': 'css/tilda-zero-form-errorbox.min.css',
  'https://static.tildacdn.com/css/tilda-zero-form-horizontal.min.css': 'css/tilda-zero-form-horizontal.min.css',
  'https://static.tildacdn.com/js/tilda-phone-mask-1.1.min.js': 'js/tilda-phone-mask-1.1.min.js',
  'https://static.tildacdn.com/css/tilda-date-picker-1.0.min.css': 'css/tilda-date-picker-1.0.min.css',
  'https://static.tildacdn.com/js/tilda-date-picker-1.0.min.js': 'js/tilda-date-picker-1.0.min.js',
  'https://static.tildacdn.com/js/tilda-calc-1.0.min.js': 'js/tilda-calc-1.0.min.js',
  'https://static.tildacdn.com/js/tilda-upwidget-1.1.min.js': 'js/tilda-upwidget-1.1.min.js',
  'https://static.tildacdn.com/js/uploadcare-3.x.full.min.js': 'js/uploadcare-3.x.full.min.js',
  'https://static.tildacdn.com/js/uploadcare-3.x.min.js': 'js/uploadcare-3.x.min.js',
  'https://static.tildacdn.com/js/tilda-range-1.0.min.js': 'js/tilda-range-1.0.min.js',
  'https://static.tildacdn.com/css/tilda-range-1.0.min.css': 'css/tilda-range-1.0.min.css',
  'https://static.tildacdn.com/js/tilda-img-select-1.0.min.js': 'js/tilda-img-select-1.0.min.js',
  'https://static.tildacdn.com/css/tilda-img-select-1.0.min.css': 'css/tilda-img-select-1.0.min.css',
};
for (const [from, to] of Object.entries(staticReplacements)) {
  html = html.split(from).join(to);
}

// Disable lazy load for local
html = html.replace('data-tilda-lazy="yes"', 'data-tilda-lazy="no"');

// Remove copy protection keydown blocker
html = html.replace(/<script>\s*document\.addEventListener\('keydown'[\s\S]*?<\/script>/, '');

// Remove SiteCopy hidden footer
html = html.replace(/<div style="display:none!important;color:#FFFFFF!important[\s\S]*?<\/div>\s*<\/body>/, '</body>');

// Remove yandex metrika pixel
html = html.replace(/<img[^>]*mc\.yandex\.ru[^>]*>/g, '');

fs.writeFileSync(htmlPath, html, 'utf8');
console.log('Fixed maket-etude.html');

// --- 6. Create root index.html pointing to wedbyvaleri.ru ---
const indexHtml = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta http-equiv="refresh" content="0; url=wedbyvaleri.ru/maket-etude.html">
  <title>Приглашение на свадьбу</title>
  <script>location.replace('wedbyvaleri.ru/maket-etude.html');</script>
</head>
<body>
  <p><a href="wedbyvaleri.ru/maket-etude.html">Открыть приглашение</a></p>
</body>
</html>`;
fs.writeFileSync(path.join(ROOT, 'index.html'), indexHtml, 'utf8');
console.log('Created root index.html redirect');

console.log('\nDone! Open: wedbyvaleri.ru/maket-etude.html');
