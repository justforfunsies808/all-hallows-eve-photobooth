import { createClient } from '@supabase/supabase-js';
import { checkGalleryKey } from './_galleryAuth.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).json({ error: 'Method not allowed' }); }
  if (!process.env.GALLERY_ACCESS_KEY) return res.status(503).json({ error: 'Missing GALLERY_ACCESS_KEY' });
  if (!checkGalleryKey(req)) return res.status(401).json({ error: 'Incorrect gallery passphrase' });
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY)
    return res.status(503).json({ error: 'Missing Supabase configuration' });
  try {
    const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const { data: dates, error: datesError } = await db.storage.from('photo-strips').list('strips', { limit: 1000 });
    if (datesError) throw datesError;
    const folders = (dates || []).filter(item => /^\d{4}-\d{2}-\d{2}$/.test(item.name)).map(item => item.name).sort().reverse();
    const photos = [];
    for (const date of folders) {
      const { data, error } = await db.storage.from('photo-strips').list(`strips/${date}`, { limit: 1000, sortBy: { column: 'created_at', order: 'desc' } });
      if (error) throw error;
      for (const file of data || []) {
        if (!/^[a-f0-9-]+\.jpg$/i.test(file.name)) continue;
        photos.push({ path: `strips/${date}/${file.name}`, createdAt: file.created_at || '' });
      }
      if (photos.length >= 60) break;
    }
    photos.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return res.status(200).json({ photos: photos.slice(0, 60) });
  } catch (error) {
    console.error('Gallery error', error);
    return res.status(500).json({ error: 'Unable to load gallery' });
  }
}
