// Gera skill-do-caos-ao-metodo.pdf a partir de pdf.html (+ SKILL.md e score.js de referência)
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..', '..');
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const skill = fs.readFileSync(path.join(root, 'guia-motion/skill/motion-do-caos-ao-metodo/SKILL.md'), 'utf8');
const score = fs.readFileSync(path.join(root, 'explainer-claude-criativo/score.js'), 'utf8');
const fontDir = 'file://' + path.join(root, 'explainer-claude-criativo/assets/');
const img = (f) => 'file://' + path.join(root, f);
let html = fs.readFileSync(path.join(__dirname, 'pdf.html'), 'utf8')
  .replace(/\{\{FONTS\}\}/g, fontDir)
  .replace('{{SKILL}}', esc(skill))
  .replace('{{SCORE}}', esc(score))
  .replace(/\{\{IMG:([^}]+)\}\}/g, (_, f) => img(f));
const tmp = path.join(__dirname, '_render.html');
fs.writeFileSync(tmp, html);
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto('file://' + tmp, { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  const over = await p.evaluate(() => [...document.querySelectorAll('.pg:not(.flow)')].map((e, i) => [i + 1, e.scrollHeight - e.clientHeight]).filter((x) => x[1] > 1));
  console.log('overflow', JSON.stringify(over));
  await p.pdf({ path: path.join(__dirname, 'skill-do-caos-ao-metodo.pdf'), format: 'A4', printBackground: true, preferCSSPageSize: true });
  await b.close();
  fs.unlinkSync(tmp);
  console.log('ok');
})();
