import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { createSelfieHandler, PHOTO_TTL_MS, MAX_PHOTO_BYTES } from '../server/selfie-handler.js';

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0xff, 0xd9]);
const timestamp = 1791300000000;
const uuid = 'b094498d-4b4e-48ec-8c3b-a7a2c96a3f72';
function fixture(token = 'test-only-token') {
  let time = timestamp;
  const files = new Map();
  function checkCredentials(options) {
    if (typeof token === 'string') assert.equal(options.token, token);
    else {
      assert.equal(options.storeId, token.storeId);
      assert.equal(options.oidcToken, token.oidcToken);
    }
  }
  const storage = {
    async put(path, bytes, options) { checkCredentials(options); assert.equal(options.access, 'private'); files.set(path, bytes); },
    async get(path, options) { checkCredentials(options); assert.equal(options.access, 'private'); const bytes = files.get(path); return bytes ? { stream: new ReadableStream({ start(c) { c.enqueue(bytes); c.close(); } }) } : null; },
    async list(options) { checkCredentials(options); return { blobs: [...files.keys()].map(pathname => ({ pathname })), hasMore: false }; },
    async del(paths, options) { checkCredentials(options); for (const path of Array.isArray(paths) ? paths : [paths]) files.delete(path); },
  };
  const handler = createSelfieHandler({ storage, token: () => token, now: () => time, uuid: () => uuid });
  async function call(method, url = '/api/selfie', body = JPEG, extraHeaders = {}, parsed = false) {
    const req = Readable.from([body]);
    Object.assign(req, { method, url, headers: { host: 'totem.example', origin: 'https://totem.example', 'content-type': 'image/jpeg', ...extraHeaders } });
    if (parsed) req.body = body;
    const res = { headers: {}, setHeader(k,v) { this.headers[k]=v; }, end(value) { this.body = value; } };
    await handler(req, res);
    return res;
  }
  return { call, files, setTime: value => time = value };
}

test('upload privado gera link; outra requisição baixa os mesmos bytes como anexo', async () => {
  const f = fixture();
  const upload = await f.call('POST');
  assert.equal(upload.statusCode, 201);
  const { id } = JSON.parse(upload.body);
  const download = await f.call('GET', `/api/selfie?id=${id}&download=1`);
  assert.equal(download.statusCode, 200);
  assert.deepEqual(download.body, JPEG);
  assert.match(download.headers['Content-Disposition'], /^attachment/);
  assert.match(download.headers['Cache-Control'], /no-store/);
});

test('link expirado é bloqueado e foto removida', async () => {
  const f = fixture();
  const { id } = JSON.parse((await f.call('POST')).body);
  f.setTime(timestamp + PHOTO_TTL_MS);
  assert.equal((await f.call('GET', `/api/selfie?id=${id}`)).statusCode, 410);
  assert.equal(f.files.size, 0);
});

test('aceita body binário já interpretado pelo runtime Vercel e verifica seu tamanho', async () => {
  const f = fixture();
  assert.equal((await f.call('POST', undefined, JPEG, {}, true)).statusCode, 201);
  assert.equal((await f.call('POST', undefined, Buffer.alloc(MAX_PHOTO_BYTES + 1), {}, true)).statusCode, 413);
});

test('novo upload elimina fotos antigas e mantém a foto nova', async () => {
  const f = fixture();
  await f.call('POST');
  f.setTime(timestamp + PHOTO_TTL_MS + 1);
  await f.call('POST');
  assert.equal(f.files.size, 1);
  assert.ok([...f.files.keys()][0].includes(String(timestamp + PHOTO_TTL_MS + 1)));
});

test('recusa uploads externos, arquivos inválidos e imagens grandes', async () => {
  const f = fixture();
  assert.equal((await f.call('POST', undefined, JPEG, { origin: 'https://other.example' })).statusCode, 403);
  assert.equal((await f.call('POST', undefined, Buffer.from('not a photo'))).statusCode, 415);
  assert.equal((await f.call('POST', undefined, Buffer.alloc(MAX_PHOTO_BYTES + 1))).statusCode, 413);
  assert.equal((await f.call('POST', undefined, JPEG, { 'content-type': 'text/plain' })).statusCode, 415);
  assert.equal(f.files.size, 0);
});

test('não aceita IDs com outros caminhos nem timestamps no futuro', async () => {
  const f = fixture();
  assert.equal((await f.call('GET', '/api/selfie?id=../../other.jpg')).statusCode, 400);
  assert.equal((await f.call('GET', `/api/selfie?id=${timestamp + 1}-${uuid}`)).statusCode, 400);
  assert.equal((await f.call('GET', `/api/selfie?id=${timestamp}-${uuid}`)).statusCode, 404);
});

test('armazenamento ausente tem erro explícito e métodos inesperados são recusados', async () => {
  const f = fixture(undefined);
  // Use null because an omitted fixture argument intentionally uses its default.
  assert.equal((await fixture(null).call('POST')).statusCode, 503);
  assert.equal((await f.call('DELETE')).statusCode, 405);
});

test('diagnóstico informa apenas presença da configuração, sem divulgar credenciais', async () => {
  const missing = await fixture(null).call('GET', '/api/selfie?status=1');
  assert.equal(missing.statusCode, 200);
  assert.equal(JSON.parse(missing.body).configured, false);
  const configured = await fixture().call('GET', '/api/selfie?status=1');
  assert.equal(JSON.parse(configured.body).authentication, 'token');
  assert.ok(!configured.body.includes('test-only-token'));
});

test('aceita autenticação OIDC já vinculada ao armazenamento', async () => {
  const f = fixture({ storeId: 'test-store', oidcToken: 'test-only-oidc' });
  const upload = await f.call('POST');
  assert.equal(upload.statusCode, 201);
  const { id } = JSON.parse(upload.body);
  assert.equal((await f.call('GET', `/api/selfie?id=${id}`)).statusCode, 200);
  const diagnostic = await f.call('GET', '/api/selfie?status=1');
  assert.equal(JSON.parse(diagnostic.body).authentication, 'oidc');
  assert.ok(!diagnostic.body.includes('test-only-oidc'));
});

test('upload e download usam OIDC automático sem exigir token de ambiente', async () => {
  const f = fixture({ storeId: 'test-store' });
  const upload = await f.call('POST');
  assert.equal(upload.statusCode, 201);
  const { id } = JSON.parse(upload.body);
  assert.equal((await f.call('GET', `/api/selfie?id=${id}`)).statusCode, 200);
  const diagnostic = JSON.parse((await f.call('GET', '/api/selfie?status=1')).body);
  assert.equal(diagnostic.configured, true);
  assert.equal(diagnostic.authentication, 'oidc');
});
