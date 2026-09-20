// Shrink page images that are shipped far larger than they are displayed.
// Usage: node scripts/assets/optimize-images.mjs [--min-kb 300] [--max-edge 1920] [--dry-run]
//
// Every raster under public/ above the size threshold that src/ references is
// re-encoded as WebP no larger than --max-edge on its long side. Animated GIFs
// become MP4 (browsers decode GIFs on the CPU every frame they are visible).
// References in src/ are rewritten and the originals removed; git history
// keeps the full-resolution files.
import sharp from 'sharp';
import { spawnSync } from 'node:child_process';
import { readdir, readFile, writeFile, stat, unlink } from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index === -1 ? fallback : Number(args[index + 1]);
};
const MIN_KB = option('min-kb', 300);
const MAX_EDGE = option('max-edge', 1920);
const DRY_RUN = args.includes('--dry-run');
const WEBP_QUALITY = 82;
const PUBLIC = path.resolve('public');
const SRC = path.resolve('src');
// Not page imagery: downloads, 3D assets, the scene backdrops, and game files.
const SKIP_DIRS = new Set(['downloads', 'models', 'images', 'waterloo_roulette', 'draco']);
const RASTER = /\.(png|jpe?g|gif)$/i;

async function walk(dir, skipTopLevel = false) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (skipTopLevel && entry.isDirectory() && SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(full));
    else files.push(full);
  }
  return files;
}

const sources = new Map();
for (const file of await walk(SRC)) {
  if (/\.(jsx?|tsx?|css)$/.test(file)) sources.set(file, await readFile(file, 'utf8'));
}
const referenced = (publicPath) => [...sources.values()].some((text) => text.includes(publicPath));

const report = [];
for (const file of await walk(PUBLIC, true)) {
  if (!RASTER.test(file)) continue;
  const size = (await stat(file)).size;
  if (size < MIN_KB * 1024) continue;
  const publicPath = `/${path.relative(PUBLIC, file).split(path.sep).join('/')}`;
  if (!referenced(publicPath)) {
    report.push({ file: publicPath, kb: Math.round(size / 1024), action: 'skipped (unreferenced)' });
    continue;
  }

  const meta = await sharp(file, { animated: true }).metadata();
  const animated = (meta.pages || 1) > 1;
  const outputExt = animated ? '.mp4' : '.webp';
  const output = file.replace(RASTER, outputExt);
  const outputPath = publicPath.replace(RASTER, outputExt);

  if (!DRY_RUN) {
    if (animated) {
      // yuv420p needs even dimensions; faststart lets playback begin before download ends.
      const result = spawnSync('ffmpeg', [
        '-y', '-loglevel', 'error', '-i', file,
        '-vf', `scale='min(${MAX_EDGE},iw)':-2:flags=lanczos,pad=ceil(iw/2)*2:ceil(ih/2)*2`,
        '-movflags', '+faststart', '-pix_fmt', 'yuv420p', '-c:v', 'libx264', '-crf', '26', '-an', output,
      ], { stdio: 'inherit' });
      if (result.status !== 0) throw new Error(`ffmpeg failed for ${publicPath}`);
    } else {
      await sharp(file).rotate()
        .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY, effort: 5 })
        .toFile(output);
    }
    for (const [sourceFile, text] of sources) {
      if (!text.includes(publicPath)) continue;
      sources.set(sourceFile, text.split(publicPath).join(outputPath));
    }
    await unlink(file);
  }
  const outputSize = DRY_RUN ? null : (await stat(output)).size;
  report.push({
    file: publicPath, kb: Math.round(size / 1024), dimensions: `${meta.width}x${meta.pageHeight || meta.height}`,
    action: `${animated ? 'mp4' : 'webp'} -> ${outputPath}`, outKb: outputSize && Math.round(outputSize / 1024),
  });
}

if (!DRY_RUN) {
  for (const [file, text] of sources) {
    if (text !== await readFile(file, 'utf8')) await writeFile(file, text);
  }
}

const converted = report.filter((row) => row.outKb != null);
console.table(report);
console.log(`${converted.length} files: ${Math.round(converted.reduce((s, r) => s + r.kb, 0) / 1024)} MB -> ${Math.round(converted.reduce((s, r) => s + r.outKb, 0) / 1024 * 10) / 10} MB${DRY_RUN ? ' (dry run)' : ''}`);
