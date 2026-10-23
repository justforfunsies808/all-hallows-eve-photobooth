import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, RefreshCcw, ArrowLeft } from 'lucide-react';

type Photo = { path: string; createdAt: string };
type Tile = Photo & { url: string };

export default function Gallery() {
  const [photos, setPhotos] = useState<Tile[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const mountedUrls = useRef<string[]>([]);
  const loadId = useRef(0);

  const load = useCallback(async () => {
    const thisLoad = ++loadId.current;
    setStatus('loading');
    setError('');
    try {
      const response = await fetch('/api/gallery', { cache: 'no-store' });
      if (!response.ok) throw new Error('Unable to load gallery. Please try again.');
      const data: { photos: Photo[] } = await response.json();
      const tileResults: Tile[] = [];
      const items = data.photos || [];
      // Keep a small concurrent batch to avoid overwhelming mobile browsers.
      for (let start = 0; start < items.length; start += 6) {
        const batch = await Promise.all(items.slice(start, start + 6).map(async photo => {
          const res = await fetch('/api/photo?path=' + encodeURIComponent(photo.path), { cache: 'no-store' });
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
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    void load();
    return () => {
      loadId.current++;
      for (const url of mountedUrls.current) URL.revokeObjectURL(url);
      mountedUrls.current = [];
    };
  }, [load]);

  return <main className="app">
    <header className="top"><span className="brand">✦ ALL HALLOWS’ EVE ✦</span><span>OCTOBER 24, 2026</span></header>
    <section className="stage"><div className="galleryShell">
      <div className="galleryHeading"><div className="ornament">☾ ✦ ☽</div>
        <p className="eyebrow">THE HAUNTED ARCHIVES</p>
        <h1>All Hallows’ Eve</h1>
        <p>A Night of Frights, Curated by Vimmie · Madeline · Katherine</p>
        <p>Find your spectral portraits and save a keepsake from the night.</p>
      </div>
      {status === 'loading' && <div className="message"><div className="loader"/><p>Opening the archives...</p></div>}
      {status === 'error' && <div className="message"><p className="error">{error}</p><button className="secondary" onClick={() => void load()}>TRY AGAIN</button></div>}
      {status === 'ready' && <>
        <div className="galleryNav"><button className="secondary" onClick={() => void load()}><RefreshCcw size={17}/> REFRESH PHOTOS</button></div>
        <p className="galleryNote">{photos.length ? `${photos.length} portraits · Tap Download to save a strip` : 'No portraits uploaded yet. Check back after the first session.'}</p>
        <div className="galleryGrid">{photos.map(photo => <article className="galleryTile" key={photo.path}>
          <img src={photo.url} alt="Vintage four-photo strip from All Hallows’ Eve" loading="lazy"/>
          <a href={photo.url} download={'all-hallows-eve-' + photo.path.split('/').pop()}><Download size={14} style={{ verticalAlign: 'middle' }}/> DOWNLOAD</a>
        </article>)}</div>
        <p className="galleryNote">Showing the 60 newest strips. Anyone who opens this gallery can view and download these pictures.</p>
      </>}
      <div className="galleryNav"><a href="/" className="secondary"><ArrowLeft size={16}/> BACK TO PHOTOBOOTH</a></div>
    </div></section>
    <footer>ALL HALLOWS’ EVE <span>✦</span> VIMMIE · MADELINE · KATHERINE</footer>
  </main>;
}
