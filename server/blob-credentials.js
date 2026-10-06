// Vercel allows a custom prefix when connecting a Blob store to a project.
// Reuse the binding that was actually injected; never print credential values.
export function resolveBlobCredentials(variables = process.env) {
  if (variables.BLOB_READ_WRITE_TOKEN) {
    return { credentials: variables.BLOB_READ_WRITE_TOKEN, variable: 'BLOB_READ_WRITE_TOKEN' };
  }
  if (variables.BLOB_STORE_ID && variables.VERCEL_OIDC_TOKEN) {
    return { credentials: { storeId: variables.BLOB_STORE_ID, oidcToken: variables.VERCEL_OIDC_TOKEN }, variable: 'BLOB_STORE_ID + VERCEL_OIDC_TOKEN' };
  }
  const candidates = Object.keys(variables).filter(name => {
    if (!/(?:^|_)READ_WRITE_TOKEN$/.test(name) || !variables[name]) return false;
    return /(?:^|_)BLOB_READ_WRITE_TOKEN$/.test(name) || variables[name].startsWith('vercel_blob_rw_');
  });
  if (candidates.length === 1) return { credentials: variables[candidates[0]], variable: candidates[0] };
  return { credentials: null, variable: null, issue: candidates.length > 1 ? 'MULTIPLE_BLOB_BINDINGS' : 'MISSING_BLOB_BINDING', candidateNames: candidates };
}
