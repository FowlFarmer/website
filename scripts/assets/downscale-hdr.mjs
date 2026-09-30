// Halve a Radiance .hdr (RGBE) environment map: average each 2x2 block in linear light and
// re-encode it run-length compressed. The scene's lighting environment only lights the store at
// low strength, and the PMREM blur it goes through keeps the half-size map's reflections close.
//   node scripts/assets/downscale-hdr.mjs <in.hdr> <out.hdr>
import { readFile, writeFile } from 'node:fs/promises';

const [input, output] = process.argv.slice(2);
const bytes = await readFile(input);

// Header: text lines up to a blank line, then the resolution line.
let offset = 0;
const line = () => {
  const end = bytes.indexOf(10, offset);
  const text = bytes.toString('latin1', offset, end);
  offset = end + 1;
  return text;
};
const header = [];
for (let text = line(); text !== ''; text = line()) header.push(text);
const [, height, , width] = line().split(' ').map((value) => Number(value) || value);

// Pixels as linear floats.
const pixels = new Float32Array(width * height * 3);
const scan = new Uint8Array(width * 4);
for (let y = 0; y < height; y += 1) {
  if (bytes[offset] !== 2 || bytes[offset + 1] !== 2) throw new Error('Only run-length encoded scanlines are supported');
  offset += 4;
  for (let channel = 0; channel < 4; channel += 1) {
    for (let x = 0; x < width;) {
      let count = bytes[offset++];
      if (count > 128) {
        count -= 128;
        const value = bytes[offset++];
        for (let i = 0; i < count; i += 1) scan[(x++) * 4 + channel] = value;
      } else {
        for (let i = 0; i < count; i += 1) scan[(x++) * 4 + channel] = bytes[offset++];
      }
    }
  }
  for (let x = 0; x < width; x += 1) {
    const exponent = scan[x * 4 + 3];
    const scale = exponent ? 2 ** (exponent - 136) : 0;
    for (let c = 0; c < 3; c += 1) pixels[(y * width + x) * 3 + c] = scan[x * 4 + c] * scale;
  }
}

// Average 2x2 blocks.
const w = width / 2;
const h = height / 2;
const half = new Float32Array(w * h * 3);
for (let y = 0; y < h; y += 1) {
  for (let x = 0; x < w; x += 1) {
    for (let c = 0; c < 3; c += 1) {
      const at = (yy, xx) => pixels[((y * 2 + yy) * width + (x * 2 + xx)) * 3 + c];
      half[(y * w + x) * 3 + c] = (at(0, 0) + at(0, 1) + at(1, 0) + at(1, 1)) / 4;
    }
  }
}

// Re-encode: RGBE per pixel, each channel of a scanline run-length compressed.
const chunks = [Buffer.from(`${header.join('\n')}\n\n-Y ${h} +X ${w}\n`, 'latin1')];
const row = new Uint8Array(w * 4);
for (let y = 0; y < h; y += 1) {
  for (let x = 0; x < w; x += 1) {
    const [r, g, b] = [0, 1, 2].map((c) => half[(y * w + x) * 3 + c]);
    const max = Math.max(r, g, b);
    if (max < 1e-32) { row.fill(0, x * 4, x * 4 + 4); continue; }
    const exponent = Math.ceil(Math.log2(max + 1e-38)) + (max === 2 ** Math.ceil(Math.log2(max)) ? 1 : 0);
    const scale = 256 / 2 ** exponent;
    row[x * 4] = Math.min(255, Math.floor(r * scale));
    row[x * 4 + 1] = Math.min(255, Math.floor(g * scale));
    row[x * 4 + 2] = Math.min(255, Math.floor(b * scale));
    row[x * 4 + 3] = exponent + 128;
  }
  const out = [2, 2, w >> 8, w & 255];
  for (let channel = 0; channel < 4; channel += 1) {
    const values = Array.from({ length: w }, (_, x) => row[x * 4 + channel]);
    for (let x = 0; x < w;) {
      let run = 1;
      while (x + run < w && run < 127 && values[x + run] === values[x]) run += 1;
      if (run >= 3) { out.push(128 + run, values[x]); x += run; continue; }
      const start = x;
      while (x < w && x - start < 128 && !(x + 2 < w && values[x] === values[x + 1] && values[x] === values[x + 2])) x += 1;
      out.push(x - start, ...values.slice(start, x));
    }
  }
  chunks.push(Buffer.from(out));
}
await writeFile(output, Buffer.concat(chunks));
console.log(`${width}x${height} -> ${w}x${h}: ${(bytes.length / 1024).toFixed(0)} KB -> ${(Buffer.concat(chunks).length / 1024).toFixed(0)} KB`);
