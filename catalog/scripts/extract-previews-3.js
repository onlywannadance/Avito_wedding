const fs = require('fs');
const path = require('path');

const demos = JSON.parse(fs.readFileSync('catalog/data/demos.json', 'utf8'));
const root = process.cwd();

function normalizeAsset(url, dir, allowSvg) {
  if (!url || url.startsWith('http') || url.includes('gradient')) return null;
  const clean = url.replace(/^\.\//, '').split('?')[0];
  const isRaster = /\.(jpg|jpeg|png|webp)$/i.test(clean);
  const isSvg = allowSvg && /\.svg$/i.test(clean);
  if (!isRaster && !isSvg) return null;
  if (/favicon|icon|arrow|vector|logo|sprite|blank/i.test(clean)) return null;
  return dir + '/' + clean;
}

function extractImages(html, dir) {
  const found = [];
  const seen = new Set();
  let allowSvg = false;

  function add(url, svgOk) {
    const normalized = normalizeAsset(url, dir, svgOk || allowSvg);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    found.push(normalized);
  }

  for (const m of html.matchAll(/background-image:\s*url\(['"]?([^'")]+)/gi)) add(m[1]);
  for (const m of html.matchAll(/src=['"]([^'"]+\.(?:jpg|jpeg|png|webp|svg))['"]/gi)) add(m[1]);
  for (const m of html.matchAll(/data-original=['"]([^'"]+\.(?:jpg|jpeg|png|webp))['"]/gi)) add(m[1]);

  if (found.length === 0) {
    allowSvg = true;
    for (const m of html.matchAll(/src=['"]([^'"]+\.svg)['"]/gi)) add(m[1], true);
  }

  return found;
}

function pickThree(images, fallback) {
  if (images.length === 0) return fallback ? [fallback, fallback, fallback] : [];
  if (images.length === 1) return [images[0], images[0], images[0]];
  if (images.length === 2) return [images[0], images[1], images[1]];
  const first = images[0];
  const mid = images[Math.floor(images.length / 2)];
  const last = images[images.length - 1];
  return [first, mid, last];
}

const updated = demos.map((d) => {
  const htmlPath = path.join(root, ...d.path.split('/'));
  let previews = [];
  if (fs.existsSync(htmlPath)) {
    const html = fs.readFileSync(htmlPath, 'utf8');
    const dir = path.dirname(d.path);
    const images = extractImages(html, dir);
    previews = pickThree(images, d.preview);
  } else {
    previews = d.preview ? [d.preview, d.preview, d.preview] : [];
  }
  return { ...d, previews };
});

fs.writeFileSync('catalog/data/demos.json', JSON.stringify(updated, null, 2) + '\n');
updated.forEach((d) => console.log(d.id, d.previews.length, d.previews[0]));
console.log('Done:', updated.length, 'demos');
