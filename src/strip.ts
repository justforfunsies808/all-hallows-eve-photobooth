// Four landscape photos become one vertical, vintage monochrome photo strip.
export async function createStrip(shots: string[]): Promise<Blob> {
  if (shots.length !== 4) throw new Error('Four photos are required.');

  const width = 900;
  const margin = 62;
  const gap = 22;
  const photoWidth = width - margin * 2;
  const photoHeight = 480;
  const footerHeight = 300;
  const height = margin * 2 + photoHeight * 4 + gap * 3 + footerHeight;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');

  ctx.fillStyle = '#e7dfd2';
  ctx.fillRect(0, 0, width, height);

  for (let i = 0; i < shots.length; i++) {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = shots[i];
    });

    const x = margin;
    const y = margin + i * (photoHeight + gap);
    const srcAspect = img.width / img.height;
    const destAspect = photoWidth / photoHeight;
    let sx = 0;
    let sy = 0;
    let sw = img.width;
    let sh = img.height;

    if (srcAspect > destAspect) {
      sw = img.height * destAspect;
      sx = (img.width - sw) / 2;
    } else {
      sh = img.width / destAspect;
      sy = (img.height - sh) / 2;
    }

    ctx.save();
    ctx.filter = 'grayscale(100%) contrast(118%) brightness(97%)';
    ctx.drawImage(img, sx, sy, sw, sh, x, y, photoWidth, photoHeight);
    ctx.restore();

    const vignette = ctx.createRadialGradient(
      x + photoWidth / 2,
      y + photoHeight / 2,
      photoWidth * 0.08,
      x + photoWidth / 2,
      y + photoHeight / 2,
      photoWidth * 0.78,
    );
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.2)');
    ctx.fillStyle = vignette;
    ctx.fillRect(x, y, photoWidth, photoHeight);
  }

  const footerTop = margin + photoHeight * 4 + gap * 3 + 70;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#241d1d';

  ctx.font = 'normal 56px "Times New Roman", Georgia, serif';
  ctx.fillText('ALL HALLOWS’ EVE', width / 2, footerTop);

  ctx.font = 'normal 26px Georgia, serif';
  ctx.fillText('A NIGHT OF FRIGHTS', width / 2, footerTop + 42);

  ctx.font = 'normal 20px Georgia, serif';
  ctx.fillText('CURATED BY VIMMIE · MADELINE · KATHERINE', width / 2, footerTop + 78);

  ctx.font = 'normal 18px Georgia, serif';
  ctx.fillText('✦   OCTOBER 24, 2026   ✦', width / 2, footerTop + 115);

  const dots = 8000;
  ctx.fillStyle = 'rgba(0,0,0,0.038)';
  for (let i = 0; i < dots; i++) {
    ctx.fillRect(Math.random() * width, Math.random() * height, 1, 1);
  }

  return new Promise((resolve, reject) =>
    canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('Image export failed'))), 'image/jpeg', 0.88),
  );
}
