import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

// Vercel Node function. All uploads go into a private Supabase Storage bucket.
// A shared booth passphrase is basic protection for a private party, not a public
// user-auth system. Never expose the Supabase service role key to the browser.
export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Method not allowed' }); }
  const expected = process.env.BOOTH_UPLOAD_KEY;
  const submitted = req.headers['x-booth-key'];
  if (!expected) return res.status(503).json({ error: 'Server missing BOOTH_UPLOAD_KEY' });
  if (typeof submitted !== 'string' || Buffer.byteLength(submitted) !== Buffer.byteLength(expected) ||
    !crypto.timingSafeEqual(Buffer.from(submitted), Buffer.from(expected))) {
    return res.status(401).json({ error: 'Incorrect upload passphrase' });
  }
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(503).json({ error: 'Supabase server settings are missing' });
  }
  if (!req.headers['content-type']?.startsWith('image/jpeg')) return res.status(415).json({ error: 'JPEG images only' });
  // 3 MB max. Avoid unnecessarily large requests to serverless functions.
  const chunks = []; let total = 0;
  try {
    for await (const chunk of req) {
      total += chunk.length;
      if (total > 3_000_000) return res.status(413).json({ error: 'Image is too large (max 3 MB)' });
      chunks.push(chunk);
    }
    const bytes = Buffer.concat(chunks);
    if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[bytes.length-2] !== 0xff || bytes[bytes.length-1] !== 0xd9)
      return res.status(400).json({ error: 'Invalid JPEG data' });
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const filename = `strips/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.jpg`;
    const { error } = await supabase.storage.from('photo-strips').upload(filename, bytes, { contentType: 'image/jpeg', upsert: false });
    if (error) throw error;
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Upload error:', err);
    return res.status(500).json({ error: 'Unable to save photo. Please retry.' });
  }
}
