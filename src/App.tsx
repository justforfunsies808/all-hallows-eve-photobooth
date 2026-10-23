import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, RefreshCcw, CheckCircle2, Download, AlertCircle, ArrowRight } from 'lucide-react';
import { createStrip } from './strip';

type Phase = 'welcome' | 'camera' | 'processing' | 'finished';
type Upload = 'idle' | 'uploading' | 'saved' | 'failed';
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export default function App() {
  const [phase, setPhase] = useState<Phase>('welcome');
  const [count, setCount] = useState<number | null>(null);
  const [shotNumber, setShotNumber] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [upload, setUpload] = useState<Upload>('idle');
  const [uploadKey, setUploadKey] = useState(() => sessionStorage.getItem('boothUploadKey') || '');
  const [inputKey, setInputKey] = useState(uploadKey);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cancelled = useRef(false);
  const busyRef = useRef(false);
  const blobRef = useRef<Blob | null>(null);
  const objectUrlRef = useRef('');

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(() => () => {
    cancelled.current = true;
    stopCamera();
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
  }, [stopCamera]);

  async function openCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Camera is not supported in this browser. Use Safari over HTTPS.');
      return;
    }
    setError('');
    setShotNumber(0);
    setCount(null);
    cancelled.current = false;
    setPhase('camera');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } },
      });
      if (cancelled.current) {
        stream.getTracks().forEach(t => t.stop());
        return;
      }
      streamRef.current = stream;
      for (let i = 0; i < 15 && !videoRef.current; i++) await sleep(30);
      if (!videoRef.current) throw new Error('Camera preview unavailable');
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
    } catch (err) {
      stopCamera();
      setError(err instanceof Error ? err.message : 'Unable to start camera');
      setPhase('welcome');
    }
  }

  async function uploadStrip(blob: Blob) {
    setUpload('uploading');
    setError('');
    try {
      if (!uploadKey.trim()) throw new Error('Set an upload passphrase before starting (Admin settings).');
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'image/jpeg', 'X-Booth-Key': uploadKey },
        body: blob,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || `Upload failed (${response.status})`);
      setUpload('saved');
    } catch (err) {
      setUpload('failed');
      setError(err instanceof Error ? err.message : 'Upload failed');
    }
  }

  async function takePhotos() {
    if (busyRef.current || !videoRef.current || !streamRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError('');
    const photos: string[] = [];
    try {
      for (let i = 0; i < 4; i++) {
        if (cancelled.current) return;
        for (let sec = 3; sec >= 1; sec--) {
          setCount(sec);
          await sleep(1000);
          if (cancelled.current) return;
        }
        setCount(null);
        const video = videoRef.current;
        if (!video || !video.videoWidth) throw new Error('Camera not ready. Try again.');
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas unavailable');
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        photos.push(canvas.toDataURL('image/jpeg', 0.9));
        setShotNumber(i + 1);
        if (i < 3) await sleep(550);
      }
      setPhase('processing');
      stopCamera();
      const blob = await createStrip(photos);
      blobRef.current = blob;
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = URL.createObjectURL(blob);
      setImageUrl(objectUrlRef.current);
      setPhase('finished');
      await uploadStrip(blob);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setPhase('welcome');
      stopCamera();
    } finally {
      busyRef.current = false;
      setBusy(false);
      setCount(null);
    }
  }

  function reset() {
    cancelled.current = true;
    stopCamera();
    setPhase('welcome');
    setShotNumber(0);
    setCount(null);
    setUpload('idle');
    setError('');
    blobRef.current = null;
    setImageUrl('');
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = '';
  }

  return (
    <main className="app">
      <header className="top">
        <span className="brand">✦ ALL HALLOWS’ EVE ✦</span>
        <span>HAUNTED PORTRAITS · OCTOBER 24, 2026</span>
      </header>

      <section className="stage">
        {phase === 'welcome' && (
          <div className="welcome">
            <div className="ornament">☾ <span>✦</span> ☽</div>
            <p className="eyebrow">YOU ARE CORDIALLY SUMMONED</p>
            <h1>
              All Hallows’<br />
              <em>Eve</em>
            </h1>
            <p className="subtitle">
              Four spectral portraits. One bewitched keepsake. Step into the gloom,
              strike a pose, and leave with a relic from the night.
            </p>
            <p className="hostLine">
              A NIGHT OF FRIGHTS, CURATED BY
              <strong>VIMMI · MADELINE · KATHERINE</strong>
            </p>
            <button className="primary" onClick={openCamera}>
              <Camera size={21} /> ENTER THE BOOTH <ArrowRight size={20} />
            </button>
            {error && (
              <p className="error">
                <AlertCircle size={17} />
                {error}
              </p>
            )}

            <p className="galleryInvitation"><a href="/gallery">✦ VIEW THE HAUNTED ARCHIVES ✦</a></p>
            <div className="admin">
              <details>
                <summary>Admin settings</summary>
                <label htmlFor="boothKey">Upload passphrase</label>
                <input
                  id="boothKey"
                  type="password"
                  value={inputKey}
                  placeholder="Same as BOOTH_UPLOAD_KEY on Vercel"
                  onChange={e => setInputKey(e.target.value)}
                />
                <button
                  className="secondary"
                  onClick={() => {
                    setUploadKey(inputKey);
                    sessionStorage.setItem('boothUploadKey', inputKey);
                  }}
                >
                  Save passphrase for this tab
                </button>
                <p className="tiny">
                  Never put the Supabase service-role key here. This is a separate,
                  limited booth passphrase.
                </p>
              </details>
            </div>
          </div>
        )}

        {phase === 'camera' && (
          <div className="cameraScreen">
            <div className="cameraTop">
              <p className="eyebrow">THE VEIL GROWS THIN ✦</p>
              <p className="eyebrow">{shotNumber} / 4 CAPTURED</p>
            </div>
            <div className="cameraFrame">
              <video ref={videoRef} autoPlay playsInline muted />
              {count !== null && <div className="countdown">{count}</div>}
            </div>
            <p className="cameraHint">
              {busy ? (count ? 'HOLD YOUR GAZE...' : 'THE SHUTTER FALLS.') : 'READY TO BE IMMORTALIZED?'}
            </p>
            {!busy && (
              <div className="actions">
                <button className="primary" onClick={takePhotos}>
                  <Camera size={21} /> SUMMON FOUR PORTRAITS
                </button>
                <button className="secondary" onClick={reset}>BACK</button>
              </div>
            )}
          </div>
        )}

        {phase === 'processing' && (
          <div className="message">
            <div className="loader" />
            <h2>Conjuring your portraits...</h2>
            <p>The darkroom hums. Your keepsake is taking shape.</p>
          </div>
        )}

        {phase === 'finished' && (
          <div className="result">
            <div className="resultText">
              <p className="eyebrow">A TOKEN FROM THE SHADOWED HOURS</p>
              <h2>
                A haunted<br />
                <em>keepsake.</em>
              </h2>

              {upload === 'uploading' && <p className="status">☁ Uploading your strip...</p>}
              {upload === 'saved' && (
                <p className="status saved">
                  <CheckCircle2 size={19} /> Uploaded successfully!
                </p>
              )}
              {upload === 'failed' && (
                <>
                  <p className="error">
                    <AlertCircle size={17} />
                    {error}
                  </p>
                  <button className="secondary" onClick={() => blobRef.current && uploadStrip(blobRef.current)}>
                    RETRY UPLOAD
                  </button>
                </>
              )}

              <p className="tiny">
                Photos are saved in your private party storage. Start a new session
                only after upload succeeds, or download the strip first.
              </p>
              <div className="actions">
                <a className="secondary download" href={imageUrl} download="halloween-photo-strip.jpg">
                  <Download size={18} /> SAVE THIS STRIP
                </a>
                <button className="primary" onClick={reset} disabled={upload === 'uploading'}>
                  <RefreshCcw size={18} /> NEXT GUEST
                </button>
              </div>
            </div>
            <img className="stripPreview" src={imageUrl} alt="Your vintage four-photo strip" />
          </div>
        )}
      </section>

      <footer>
        ALL HALLOWS’ EVE <span>✦</span> A NIGHT OF FRIGHTS, CURATED BY VIMMIE · MADELINE · KATHERINE
      </footer>
    </main>
  );
}
