const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'src');
const distDir = path.join(__dirname, '..', 'dist');

const templatesSrc = path.join(srcDir, 'email', 'templates');
const templatesDest = path.join(distDir, 'email', 'templates');

if (fs.existsSync(templatesSrc)) {
  fs.mkdirSync(templatesDest, { recursive: true });
  for (const file of fs.readdirSync(templatesSrc)) {
    fs.copyFileSync(path.join(templatesSrc, file), path.join(templatesDest, file));
  }
  console.log('[copy-assets] Copied email templates');
}
