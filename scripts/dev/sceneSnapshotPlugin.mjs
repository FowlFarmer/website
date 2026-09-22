import { writeFile } from 'node:fs/promises';
import path from 'node:path';

// Local-only capture sink for the dev scene's “Save background snapshot” tool.
// It accepts two fixed WebP asset names; no filesystem paths come from requests.
export function sceneSnapshotPlugin() {
  return {
    name: 'scene-snapshot',
    configureServer(server) {
      server.middlewares.use('/__scene-snapshot', async (req, res) => {
        const kind = new URL(req.url, 'http://localhost').searchParams.get('kind');
        if (req.method !== 'POST' || !['desktop', 'mobile'].includes(kind) ||
            !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress) ||
            (req.headers.origin && new URL(req.headers.origin).host !== req.headers.host)) {
          res.statusCode = 403; res.end(); return;
        }
        try {
          const chunks = []; let size = 0;
          for await (const chunk of req) {
            size += chunk.length;
            if (size > 8 * 1024 * 1024) throw new Error('Snapshot too large');
            chunks.push(chunk);
          }
          const bytes = Buffer.concat(chunks);
          if (bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WEBP') throw new Error('Expected WebP');
          await writeFile(path.join(server.config.root, `public/images/scene/snapshot-${kind}.webp`), bytes);
          res.end('Saved');
        } catch { res.statusCode = 400; res.end('Snapshot failed'); }
      });
    },
  };
}
