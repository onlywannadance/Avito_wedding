const fs = require('fs');
const path = require('path');

const demos = JSON.parse(fs.readFileSync('catalog/data/demos.json', 'utf8'));
const root = process.cwd();

function pickPreview(html, dir) {
  const imgs = [...html.matchAll(/src=['"]([^'"]+\.(?:jpg|jpeg|png|webp))['"]/gi)].map((m) => m[1]);
  const svgs = [...html.matchAll(/src=['"]([^'"]+\.svg)['"]/gi)].map((m) => m[1]);
  const bgs = [...html.matchAll(/background-image:\s*url\(['"]?([^'")]+)/gi)]
    .map((m) => m[1])
    .filter((u) => /\.(jpg|jpeg|png|webp)/i.test(u));

  const candidate = imgs.find((u) => !/favicon|icon/i.test(u))
    || bgs[0]
    || svgs.find((u) => !/favicon|icon|arrow|vector/i.test(u))
    || svgs[0];

  if (!candidate) return null;
  if (candidate.startsWith('http')) return candidate;
  return dir + '/' + candidate.replace(/^\.\//, '');
}

const updated = demos.map((d) => {
  const htmlPath = path.join(root, ...d.path.split('/'));
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dir = path.dirname(d.path);
  return { ...d, preview: pickPreview(html, dir) || d.preview };
});

fs.writeFileSync('catalog/data/demos.json', JSON.stringify(updated, null, 2) + '\n');
updated.forEach((d) => console.log(d.id, d.preview));
