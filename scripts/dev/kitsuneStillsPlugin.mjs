import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

// Local-only sink for window.__bakeKitsuneStills() (src/components/experience/bakeKitsuneStills.js):
// saves the 3D-off kitsune stills to public/kitsune-stills/. Only the fixed file names below; no
// filesystem paths come from requests.
const STATES = ['rest', ...Array.from({ length: 6 }, (_, tail) => `tail-${tail}`)];
const NAMES = new Set([
  ...STATES.flatMap((state) => [`${state}-shade.webp`, `${state}-light.webp`]),
  'hover-map.png',
  'layout.json',
]);
const looksRight = (name, bytes) => {
  if (name.endsWith('.webp')) return bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
  if (name.endsWith('.png')) return bytes.subarray(1, 4).toString('ascii') === 'PNG';
  try { JSON.parse(bytes.toString('utf8')); return true; } catch { return false; }
};

export function kitsuneStillsPlugin() {
  return {
    name: 'kitsune-stills',
    configureServer(server) {
      server.middlewares.use('/__kitsune-still', async (req, res) => {
        const name = new URL(req.url, 'http://localhost').searchParams.get('name');
        if (req.method !== 'POST' || !NAMES.has(name) ||
            !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress) ||
            (req.headers.origin && new URL(req.headers.origin).host !== req.headers.host)) {
          res.statusCode = 403; res.end(); return;
        }
        try {
          const chunks = []; let size = 0;
          for await (const chunk of req) {
            size += chunk.length;
            if (size > 16 * 1024 * 1024) throw new Error('Still too large');
            chunks.push(chunk);
          }
          const bytes = Buffer.concat(chunks);
          if (!looksRight(name, bytes)) throw new Error('Unexpected file');
          const directory = path.join(server.config.root, 'public/kitsune-stills');
          await mkdir(directory, { recursive: true });
          await writeFile(path.join(directory, name), bytes);
          res.end('Saved');
        } catch { res.statusCode = 400; res.end('Save failed'); }
      });
    },
  };
}
