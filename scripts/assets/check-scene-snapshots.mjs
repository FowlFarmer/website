import sharp from 'sharp';

// Public URLs bypass Vite's import validation. Check both variants before a
// production build so a missing portrait image cannot ship unnoticed.
for (const kind of ['desktop', 'mobile']) {
  const file = new URL(`../../public/images/scene/snapshot-${kind}.webp`, import.meta.url);
  try {
    const image = sharp(file.pathname);
    const { format, width, height } = await image.metadata();
    if (format !== 'webp' || !width || !height || (kind === 'mobile' ? width >= height : width <= height)) {
      throw new Error('Expected a valid WebP with the correct orientation');
    }
    await image.stats(); // Decode the pixels, not just the header.
    console.log(`Scene snapshot OK: ${kind} (${width}×${height})`);
  } catch (error) {
    throw new Error(`Missing or invalid scene snapshot: ${file.pathname}`, { cause: error });
  }
}
