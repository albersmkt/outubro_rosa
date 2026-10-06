import { randomUUID } from 'node:crypto';

export const PHOTO_TTL_MS = 15 * 60 * 1000;
export const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
const PREFIX = 'outubro-rosa-selfies/';
const VALID_ID = /^(\d{13})-([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/;

export function createSelfieHandler({ storage, token = () => process.env.BLOB_READ_WRITE_TOKEN, now = Date.now, uuid = randomUUID }) {
  function json(res, status, body) {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(body));
  }

  async function cleanup(auth) {
    let cursor;
    do {
      const page = await storage.list({ prefix: PREFIX, limit: 1000, cursor, token: auth });
      const expired = page.blobs.filter(blob => {
        const id = blob.pathname.slice(PREFIX.length).replace(/\.jpg$/, '');
        return VALID_ID.test(id) && now() - Number(id.split('-')[0]) >= PHOTO_TTL_MS;
      });
      if (expired.length) await storage.del(expired.map(blob => blob.pathname), { token: auth });
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
  }

  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    const auth = token();
    if (!['GET', 'POST'].includes(req.method)) {
      res.setHeader('Allow', 'GET, POST');
      return json(res, 405, { error: 'Método não permitido.' });
    }
    if (!auth) return json(res, 503, { error: 'Conecte um Vercel Blob privado ao projeto.' });
    try {
      if (req.method === 'POST') {
        // Accept only browser uploads originating from this deployment.
        let origin;
        try { origin = new URL(req.headers.origin); } catch { /* rejected below */ }
        if (!origin || origin.host !== req.headers.host) return json(res, 403, { error: 'Origem não permitida.' });
        if (req.headers['content-type']?.split(';')[0] !== 'image/jpeg') return json(res, 415, { error: 'Envie uma imagem JPEG.' });
        if (Number(req.headers['content-length']) > MAX_PHOTO_BYTES) return json(res, 413, { error: 'Imagem muito grande.' });
        let body;
        // Vercel may expose a parsed binary body; also support a raw Node stream.
        if (Buffer.isBuffer(req.body)) {
          body = req.body;
        } else {
          const chunks = [];
          let size = 0;
          for await (const chunk of req) {
            const bytes = Buffer.from(chunk);
            size += bytes.length;
            if (size > MAX_PHOTO_BYTES) return json(res, 413, { error: 'Imagem muito grande.' });
            chunks.push(bytes);
          }
          body = Buffer.concat(chunks);
        }
        if (body.length > MAX_PHOTO_BYTES) return json(res, 413, { error: 'Imagem muito grande.' });
        if (body.length < 4 || body[0] !== 0xff || body[1] !== 0xd8 || body[2] !== 0xff || body.at(-2) !== 0xff || body.at(-1) !== 0xd9) return json(res, 415, { error: 'JPEG inválido.' });
        // Old photos are removed on the next upload, as well as on an expired read.
        await cleanup(auth);
        const id = `${now()}-${uuid()}`;
        await storage.put(`${PREFIX}${id}.jpg`, body, { access: 'private', contentType: 'image/jpeg', addRandomSuffix: false, token: auth });
        return json(res, 201, { id, expiresAt: now() + PHOTO_TTL_MS });
      }

      const url = new URL(req.url, 'https://selfie.local');
      const id = url.searchParams.get('id') || '';
      if (!VALID_ID.test(id)) return json(res, 400, { error: 'Link inválido.' });
      const createdAt = Number(id.split('-')[0]);
      if (createdAt > now()) return json(res, 400, { error: 'Link inválido.' });
      const pathname = `${PREFIX}${id}.jpg`;
      if (now() - createdAt >= PHOTO_TTL_MS) {
        try { await storage.del(pathname, { token: auth }); } catch { /* Link stays expired even if deletion must be retried later. */ }
        return json(res, 410, { error: 'Este link expirou.' });
      }
      const result = await storage.get(pathname, { access: 'private', useCache: false, token: auth });
      if (!result || !result.stream) return json(res, 404, { error: 'Foto não encontrada.' });
      res.statusCode = 200;
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Content-Disposition', `${url.searchParams.get('download') === '1' ? 'attachment' : 'inline'}; filename="outubro-rosa-selfie.jpg"`);
      res.end(Buffer.from(await new Response(result.stream).arrayBuffer()));
    } catch {
      return json(res, 502, { error: 'Não foi possível acessar o armazenamento. Tente novamente.' });
    }
  };
}
