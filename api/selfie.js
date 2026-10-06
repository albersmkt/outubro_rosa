import { put, get, list, del } from '@vercel/blob';
import { createSelfieHandler } from '../server/selfie-handler.js';

export const config = { api: { bodyParser: false } };
export default createSelfieHandler({ storage: { put, get, list, del } });
