import crypto from 'node:crypto';
export function checkGalleryKey(req) {
  const expected = process.env.GALLERY_ACCESS_KEY;
  const received = req.headers['x-gallery-key'];
  if (!expected || typeof received !== 'string') return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
