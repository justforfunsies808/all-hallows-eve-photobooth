import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, RefreshCcw, ArrowLeft, LockKeyhole } from 'lucide-react';

type Photo = { path: string; createdAt: string };
type Tile = Photo & { url: string };

export default function Gallery() {
  const [key, setKey] = useState(() => sessionStorage.getItem('galleryKey') || '');
  const [entry, setEntry] = useState(key);
  const [photos, setPhotos] = useState<Tile[]>([]);
  const [status, setStatus] = useState<'locked' | 'loading' | 'ready'>('locked');
  const [error, setError] = useState('');
  const mountedUrls = useRef<string[]>([]);
  const loadId = useRef(0);

  const load = useCallback(async (passphrase: string) => {
    const thisLoad = ++loadId.current;
    setStatus('loading'); setError('');
    try {
      const response = await fetch('/api/gallery', {
        headers: { 'X-Gallery-Key': passphrase }, cache: 'no-store'
      });
      if (!response.ok) {
        if (response.status === 401) throw new Error('Incorrect gallery passphrase.');
        throw new Error('Unable to load gallery. Please try again.');
      }
      const data: { photos: Photo[] } = await response.json();
      // Load thumbnails from the protected endpoint. Use object URLs so secret keys never enter URLs.
      const tileResults: Tile[] = [];
      const items = data.photos || [];
      for (let start = 0; start < items.length; start += 6) {
        const batch = await Promise.all(items.slice(start, start + 6).map(async photo => {
          const res = await fetch('/api/photo?path=' + encodeURIComponent(photo.path), {
            headers: { 'X-Gallery-Key': passphrase }, cache: 'no-store'
          });
          if (!res.ok) return null;
          const blob = await res.blob();
          return { ...photo, url: URL.createObjectURL(blob) };
        }));
        for (const tile of batch) if (tile) tileResults.push(tile);
        if (thisLoad !== loadId.current) {
          for (const tile of tileResults) URL.revokeObjectURL(tile.url);
          return;
        }
      }
      for (const url of mountedUrls.current) URL.revokeObjectURL(url);
      mountedUrls.current = tileResults.map(tile => tile.url);
      setPhotos(tileResults);
      setStatus('ready');
    } catch (err) {
      if (thisLoad !== loadId.current) return;
      setError(err instanceof Error ? err.message : 'Could not load gallery');
      setStatus('locked');
    }
  }, []);

  useEffect(() => {
    if (key) void load(key);
    return () => {
      loadId.current++;
      for (const url of mountedUrls.current) URL.revokeObjectURL(url);
      mountedUrls.current = [];
    };
  }, [key, load]);

  function unlock(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = entry.trim();
    if (!trimmed) return;
    if (trimmed === key) void load(trimmed);
    else { sessionStorage.setItem('galleryKey', trimmed); setKey(trimmed); }
  }

  return <main className="app">
    <header className="top"><span className="brand">✦ ALL HALLOWS’ EVE ✦</span><span>OCTOBER 24, 2026</span></header>
    <section className="stage"><div className="galleryShell">
      <div className="galleryHeading"><div className="ornament">☾ ✦ ☽</div>
        <p className="eyebrow">THE HAUNTED ARCHIVES</p>
        <h1>All Hallows’ Eve</h1>
        <p>A Night of Frights, Curated by Vimmie · Madeline · Katherine</p>
        <p>Find your spectral portraits and save a keepsake from the night.</p>
      </div>
      {status === 'locked' && <form className="galleryLock" onSubmit={unlock}>
        <LockKeyhole size={25} style={{ marginBottom: 10 }}/>
        <label htmlFor="galleryKey">ENTER THE GALLERY PASSPHRASE</label>
        <input id="galleryKey" type="password" value={entry} onChange={e => setEntry(e.target.value)} autoComplete="off" required />
        <button className="primary" type="submit">UNLOCK THE ARCHIVES</button>
        {error && <p className="error">{error}</p>}
      </form>}
      {status === 'loading' && <div className="message"><div className="loader"/><p>Opening the archives...</p></div>}
      {status === 'ready' && <>
        <div className="galleryNav"><button className="secondary" onClick={() => void load(key)}><RefreshCcw size={17}/> REFRESH PHOTOS</button>
        <button className="secondary" onClick={() => { loadId.current++; sessionStorage.removeItem('galleryKey'); setKey(''); setEntry(''); setStatus('locked'); }}><LockKeyhole size={17}/> LOCK GALLERY</button></div>
        <p className="galleryNote">{photos.length ? `${photos.length} portraits · Tap Download to save a strip` : 'No portraits uploaded yet. Check back after the first session.'}</p>
        <div className="galleryGrid">{photos.map(photo => <article className="galleryTile" key={photo.path}>
          <img src={photo.url} alt="Vintage four-photo strip from All Hallows’ Eve" loading="lazy"/>
          <a href={photo.url} download={'all-hallows-eve-' + photo.path.split('/').pop()}><Download size={14} style={{ verticalAlign: 'middle' }}/> DOWNLOAD</a>
        </article>)}</div>
        <p className="galleryNote">Showing the 60 newest strips. Refresh to see recent uploads. Please share this private gallery only with party guests.</p>
      </>}
      <div className="galleryNav"><a href="/" className="secondary"><ArrowLeft size={16}/> BACK TO PHOTOBOOTH</a></div>
    </div></section>
    <footer>ALL HALLOWS’ EVE <span>✦</span> VIMMIE · MADELINE · KATHERINE</footer>
  </main>;
}
