import { RequestFailure } from './requestSafety.ts';
export const MAX_RESUME_BYTES = 5 * 1024 * 1024;
export const MAX_RESUME_REQUEST_BYTES = 4 * Math.ceil(MAX_RESUME_BYTES / 3) + 4096;
const TYPES = { pdf: 'application/pdf', doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', txt: 'text/plain' };
function invalid() { throw new RequestFailure(400, 'The file content does not match a supported resume format.'); }
function docxDirectory(bytes: Uint8Array) {
  // Inspect the central directory without decompressing caller-controlled ZIPs.
  // Reject encryption, ZIP64, traversal, duplicate names and oversized expanded data.
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (view.getUint32(i, true) === 0x06054b50 && i + 22 + view.getUint16(i + 20, true) === bytes.length) { end = i; break; }
  }
  if (end < 0 || view.getUint16(end + 4, true) || view.getUint16(end + 6, true)) invalid();
  const count = view.getUint16(end + 10, true), size = view.getUint32(end + 12, true);
  let at = view.getUint32(end + 16, true), expanded = 0;
  const start = at, names = new Set<string>();
  if (!count || count > 2000 || view.getUint16(end + 8, true) !== count || at + size !== end) invalid();
  for (let n = 0; n < count; n++) {
    if (at + 46 > end || view.getUint32(at, true) !== 0x02014b50) invalid();
    const flags = view.getUint16(at + 8, true), method = view.getUint16(at + 10, true);
    const compressed = view.getUint32(at + 20, true), uncompressed = view.getUint32(at + 24, true);
    const nameLength = view.getUint16(at + 28, true), extraLength = view.getUint16(at + 30, true), commentLength = view.getUint16(at + 32, true);
    const local = view.getUint32(at + 42, true);
    if (flags & 1 || ![0, 8].includes(method) || at + 46 + nameLength + extraLength + commentLength > end || local + 30 > start) invalid();
    const name = new TextDecoder('utf-8', { fatal: true }).decode(bytes.slice(at + 46, at + 46 + nameLength));
    if (!name || name.startsWith('/') || name.includes('\\') || name.split('/').includes('..') || name.includes('\0') || names.has(name)) invalid();
    if (view.getUint32(local, true) !== 0x04034b50 || view.getUint16(local + 6, true) !== flags || view.getUint16(local + 8, true) !== method) invalid();
    const localNameLength = view.getUint16(local + 26, true), localExtraLength = view.getUint16(local + 28, true);
    if (local + 30 + localNameLength + localExtraLength + compressed > start) invalid();
    const localName = new TextDecoder('utf-8', { fatal: true }).decode(bytes.slice(local + 30, local + 30 + localNameLength));
    if (localName !== name) invalid();
    names.add(name); expanded += uncompressed;
    if (expanded > 20 * 1024 * 1024 || name.toLowerCase().endsWith('vbaproject.bin')) invalid();
    at += 46 + nameLength + extraLength + commentLength;
  }
  if (at !== end || !names.has('[Content_Types].xml') || !names.has('word/document.xml')) invalid();
}
export function validateResume(body) {
  if (body.file_uri !== undefined) throw new RequestFailure(400, 'Upload a resume file instead.');
  if (body.consent !== true) throw new RequestFailure(400, 'Confirm AI processing before uploading.');
  const original = typeof body.file_name === 'string' ? body.file_name.trim() : '';
  const encoded = typeof body.file_base64 === 'string' ? body.file_base64 : '';
  if (!original || original.length > 255 || /[\x00-\x1f\x7f/\\]/.test(original)) throw new RequestFailure(400, 'Use a valid resume filename.');
  const extension = (original.split('.').pop() || '').toLowerCase();
  if (!Object.hasOwn(TYPES, extension)) throw new RequestFailure(400, 'Use a PDF, Word, or UTF-8 text file.');
  if (encoded.length > 4 * Math.ceil(MAX_RESUME_BYTES / 3)) throw new RequestFailure(413, 'That file is larger than 5 MB.');
  const firstPadding = encoded.indexOf('=');
  if (!encoded || encoded.length % 4 !== 0 || /[^A-Za-z0-9+/=]/.test(encoded) ||
      (firstPadding !== -1 && (firstPadding < encoded.length - 2 || !/^={1,2}$/.test(encoded.slice(firstPadding))))) {
    throw new RequestFailure(400, 'Invalid file encoding.');
  }
  const decodedSize = encoded.length / 4 * 3 - (firstPadding < 0 ? 0 : encoded.length - firstPadding);
  if (decodedSize > MAX_RESUME_BYTES) throw new RequestFailure(413, 'That file is larger than 5 MB.');
  let binary: string;
  try { binary = atob(encoded); } catch { throw new RequestFailure(400, 'Invalid file encoding.'); }
  if (btoa(binary) !== encoded) throw new RequestFailure(400, 'Invalid file encoding.');
  const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
  if (!bytes.length || bytes.length > MAX_RESUME_BYTES) throw new RequestFailure(413, 'Use a nonempty file up to 5 MB.');
  let text: string | undefined;
  try {
    if (extension === 'pdf') {
      if (!/^%PDF-(?:1\.[0-7]|2\.0)/.test(new TextDecoder().decode(bytes.slice(0, 8))) || !/%%EOF\s*$/.test(new TextDecoder().decode(bytes.slice(-1024)))) invalid();
    } else if (extension === 'doc') {
      const magic = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
      if (bytes.length < 512 || !magic.every((v, i) => bytes[i] === v) || !new TextDecoder('utf-16le').decode(bytes).includes('WordDocument')) invalid();
    } else if (extension === 'docx') { docxDirectory(bytes); }
    else {
      if (bytes.length > 60000) throw new RequestFailure(413, 'Use a text resume up to 60 KB.');
      text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      if (!text.trim() || /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(text)) invalid();
    }
  } catch (error) { if (error instanceof RequestFailure) throw error; invalid(); }
  // Use a generated name in storage; never persist the user's original filename.
  return { bytes, text, fileName: `resume.${extension}`, mimeType: TYPES[extension] };
}
