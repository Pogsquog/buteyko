/**
 * Renders public/icon.svg to the PNG sizes the web app manifest points at.
 *
 * Run with `node scripts/generate-icons.mjs` after editing the SVG. sharp comes
 * in with Next, so there is nothing extra to install; if that ever stops being
 * true, any SVG-to-PNG tool will do — the PNGs are what ship.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const publicDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const source = await readFile(join(publicDir, 'icon.svg'));

for (const size of [192, 512]) {
  const png = await sharp(source, { density: 384 }).resize(size, size).png().toBuffer();
  await writeFile(join(publicDir, `icon-${size}x${size}.png`), png);
  console.log(`wrote icon-${size}x${size}.png (${png.length} bytes)`);
}

// Apple's home-screen icon has no transparency and no rounding of its own.
const appleTouch = await sharp(source, { density: 384 })
  .resize(180, 180)
  .flatten({ background: '#2563eb' })
  .png()
  .toBuffer();
await writeFile(join(publicDir, 'apple-touch-icon.png'), appleTouch);
console.log(`wrote apple-touch-icon.png (${appleTouch.length} bytes)`);
