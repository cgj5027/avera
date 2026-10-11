// Limit bytes while reading, before JSON.parse; never trust Content-Length alone.
export class RequestFailure extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export async function readJsonLimited(req: Request, maxBytes = 16384, timeoutMs = 10000) {
  const length = req.headers.get('content-length');
  if (length && (!/^\d+$/.test(length) || Number(length) > maxBytes)) {
    throw new RequestFailure(413, 'Request is too large.');
  }
  const reader = req.body?.getReader();
  if (!reader) throw new RequestFailure(400, 'Send a JSON object.');
  const chunks: Uint8Array[] = []; let size = 0;
  const deadline = Date.now() + timeoutMs;
  try {
    while (true) {
      const remaining = deadline - Date.now();
      if (remaining <= 0) throw new RequestFailure(408, 'Request body timed out.');
      let timer;
      let result;
      try {
        result = await Promise.race([
          reader.read(),
          new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new RequestFailure(408, 'Request body timed out.')), remaining); }),
        ]);
      } finally { clearTimeout(timer); }
      const { value, done } = result;
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes || chunks.length >= 4096) {
        throw new RequestFailure(413, 'Request is too large.');
      }
      chunks.push(value);
    }
  } catch (error) {
    void reader.cancel().catch(() => {});
    throw error;
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try {
    const body = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error();
    return body;
  } catch { throw new RequestFailure(400, 'Send a valid JSON object.'); }
}
export function requestFailureResponse(error: unknown) {
  return error instanceof RequestFailure
    ? Response.json({ error: error.message }, { status: error.status,
        ...(error.status === 429 ? { headers: { 'Retry-After': '60' } } : {}) }) : null;
}
