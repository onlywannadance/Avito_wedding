const fs = require('fs');
const path = require('path');

const demos = JSON.parse(fs.readFileSync('catalog/data/demos.json', 'utf8'));
const root = process.cwd();

demos.forEach((d) => {
  const htmlPath = path.join(root, ...d.path.split('/'));
  if (!fs.existsSync(htmlPath)) {
    console.log(d.id, 'MISSING');
    return;
  }
  const html = fs.readFileSync(htmlPath, 'utf8');
  let preview = null;
  const bg = html.match(/background-image:\s*url\(['"]?([^'")]+)/i);
  if (bg && !bg[1].includes('gradient')) preview = bg[1];
  if (!preview) {
    const img = html.match(/src=['"]([^'"]+\.(?:jpg|jpeg|png|webp|svg))['"]/i);
    if (img) preview = img[1];
  }
  const dir = path.dirname(d.path);
  if (preview && !preview.startsWith('http')) {
    preview = dir + '/' + preview.replace(/^\.\//, '');
  }
  console.log(JSON.stringify({ id: d.id, preview: preview || null }));
});
