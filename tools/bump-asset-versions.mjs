#!/usr/bin/env node
/*
 * Refreshes the ?v=<hash> tag on every css/, js/ and data.js reference in the site's HTML pages.
 *
 *   node tools/bump-asset-versions.mjs
 *
 * CSS and JavaScript are cached by browsers for a year (see vercel.json). The tag is what makes visitors
 * download a changed file, so run this after editing any file in css/ or js/, or data.js, then commit
 * the changed pages together with the file you edited.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pages = [];
for (const f of fs.readdirSync(ROOT)) if (f.endsWith('.html')) pages.push(path.join(ROOT, f));
const ex = path.join(ROOT, 'exhibitions');
if (fs.existsSync(ex)) for (const f of fs.readdirSync(ex)) if (f.endsWith('.html')) pages.push(path.join(ex, f));

// line endings are ignored, so Windows and Linux agree on the same hash
const hash = file => crypto.createHash('md5').update(fs.readFileSync(file, 'utf8').split('\r\n').join('\n')).digest('hex').slice(0, 8);
const re = /(href|src)="\/?((?:css\/[a-z0-9-]+\.css)|(?:js\/[a-z0-9-]+\.js)|(?:data\.js))(?:\?v=[a-f0-9]+)?"/g;
let changed = 0;
for (const page of pages) {
  const before = fs.readFileSync(page, 'utf8');
  const after = before.replace(re, (m, attr, rel) => {
    const file = path.join(ROOT, rel);
    if (!fs.existsSync(file)) return m;
    const lead = m.includes(`="/${rel}`) ? '/' : '';
    return `${attr}="${lead}${rel}?v=${hash(file)}"`;
  });
  if (after !== before) { fs.writeFileSync(page, after); changed++; console.log('updated', path.relative(ROOT, page)); }
}
console.log(changed ? `${changed} page(s) updated` : 'all asset versions are current');
