import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveBlobCredentials } from '../server/blob-credentials.js';

test('prefere a variável padrão quando há mais de um armazenamento', () => {
  const result = resolveBlobCredentials({ BLOB_READ_WRITE_TOKEN: 'default-test', CAMPAIGN_BLOB_READ_WRITE_TOKEN: 'other-test' });
  assert.equal(result.credentials, 'default-test');
});

test('reutiliza a conexão do Blob com prefixo personalizado', () => {
  const result = resolveBlobCredentials({ ROSA_BLOB_READ_WRITE_TOKEN: 'test-only-token' });
  assert.equal(result.variable, 'ROSA_BLOB_READ_WRITE_TOKEN');
  assert.equal(result.credentials, 'test-only-token');
});

test('identifica um token Vercel Blob quando o prefixo substitui BLOB', () => {
  const result = resolveBlobCredentials({ ROSA_READ_WRITE_TOKEN: 'vercel_blob_rw_test-only' });
  assert.equal(result.variable, 'ROSA_READ_WRITE_TOKEN');
});

test('não envia tokens de outros serviços ao Blob', () => {
  const result = resolveBlobCredentials({ OTHER_READ_WRITE_TOKEN: 'unrelated-token', GITHUB_TOKEN: 'github-test' });
  assert.equal(result.credentials, null);
  assert.equal(result.issue, 'MISSING_BLOB_BINDING');
});

test('não escolhe arbitrariamente entre duas conexões de Blob', () => {
  const result = resolveBlobCredentials({ A_BLOB_READ_WRITE_TOKEN: 'a-test', B_BLOB_READ_WRITE_TOKEN: 'b-test' });
  assert.equal(result.credentials, null);
  assert.equal(result.issue, 'MULTIPLE_BLOB_BINDINGS');
  assert.deepEqual(result.candidateNames, ['A_BLOB_READ_WRITE_TOKEN', 'B_BLOB_READ_WRITE_TOKEN']);
});

test('reutiliza a autenticação OIDC fornecida pelo Vercel', () => {
  const result = resolveBlobCredentials({ BLOB_STORE_ID: 'store-test', VERCEL_OIDC_TOKEN: 'oidc-test' });
  assert.deepEqual(result.credentials, { storeId: 'store-test', oidcToken: 'oidc-test' });
});
