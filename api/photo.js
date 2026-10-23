import { createClient } from '@supabase/supabase-js';
import { checkGalleryKey } from './_galleryAuth.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).json({ error: 'Method not allowed' }); }
  if (!process.env.GALLERY_ACCESS_KEY) return res.status(503).json({ error: 'Missing GALLERY_ACCESS_KEY' });
  if (!checkGalleryKey(req)) return res.status(401).json({ error: 'Incorrect gallery passphrase' });
  const { path } = req.query;
  if (typeof path !== 'string' || !/^strips\/\d{4}-\d{2}-\d{2}\/[a-f0-9-]+\.jpg$/i.test(path))
    return res.status(400).json({ error: 'Invalid photo path' });
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY)
    return res.status(503).json({ error: 'Missing Supabase configuration' });
  try {
    const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const { data, error } = await db.storage.from('photo-strips').download(path);
    if (error || !data) return res.status(404).json({ error: 'Photo not found' });
    const buffer = Buffer.from(await data.arrayBuffer());
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Content-Disposition', 'inline; filename="' + path.split('/').pop() + '"');
    return res.status(200).send(buffer);
  } catch (error) {
    console.error('Photo download error', error);
    return res.status(500).json({ error: 'Unable to retrieve image' });
  }
}
