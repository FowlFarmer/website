import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

// Local-only sink for window.__bakeCalligraphy() (src/components/calligraphyPetals.js): saves a
// baked petal variant to public/calligraphy/petals-<variant>.json. Only variants 0-2; no
// filesystem paths come from requests.
export function calligraphyBakePlugin() {
  return {
    name: 'calligraphy-bake',
    configureServer(server) {
      server.middlewares.use('/__calligraphy-bake', async (req, res) => {
        const variant = new URL(req.url, 'http://localhost').searchParams.get('variant');
        if (req.method !== 'POST' || !['0', '1', '2'].includes(variant) ||
            !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress) ||
            (req.headers.origin && new URL(req.headers.origin).host !== req.headers.host)) {
          res.statusCode = 403; res.end(); return;
        }
        try {
          const chunks = []; let size = 0;
          for await (const chunk of req) {
            size += chunk.length;
            if (size > 4 * 1024 * 1024) throw new Error('Bake too large');
            chunks.push(chunk);
          }
          const baked = JSON.parse(Buffer.concat(chunks).toString('utf8'));
          if (typeof baked.fingerprint !== 'string' || !Array.isArray(baked.glyphs) || !Array.isArray(baked.nav)) throw new Error('Not a bake');
          const directory = path.join(server.config.root, 'public/calligraphy');
          await mkdir(directory, { recursive: true });
          await writeFile(path.join(directory, `petals-${variant}.json`), JSON.stringify(baked));
          res.end('Saved');
        } catch { res.statusCode = 400; res.end('Bake failed'); }
      });
    },
  };
}
