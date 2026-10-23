
export async function createStrip(shots: string[]): Promise<Blob> {
  if (shots.length !== 4) {
    throw new Error('Four photos are required.');
  }

  // Classic vintage photobooth dimensions
  const width = 780;
  const margin = 34;
  const gap = 10;
  const photoWidth = width - margin * 2;
  const photoHeight = 900;
  const footerHeight = 275;

  const height =
    margin * 2 +
    photoHeight * 4 +
    gap * 3 +
    footerHeight;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');

  // Vintage black strip
  ctx.fillStyle = '#171515';
  ctx.fillRect(0, 0, width, height);

  // Film settings
  const contrast = 1.3;
  const warmth = 0.12;
  const grainAmount = 9;

  function clamp(value: number): number {
    return Math.max(0, Math.min(255, value));
  }

  // Smooth film-style S-curve with soft highlights
  function filmCurve(value: number): number {
    const normalized = value / 255;

    const curved =
      normalized * normalized *
      (3 - 2 * normalized);

    const blended =
      normalized * 0.45 + curved * 0.55;

    return clamp(
      (blended * 255 - 128) * contrast + 132
    );
  }

  for (let i = 0; i < shots.length; i++) {
    const img = await new Promise<HTMLImageElement>(
      (resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = shots[i];
      }
    );

    const x = margin;
    const y = margin + i * (photoHeight + gap);

    // Center-crop photo into a portrait frame
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

    ctx.drawImage(
      img,
      sx, sy, sw, sh,
      x, y, photoWidth, photoHeight
    );

    // Process pixels directly for older Safari compatibility
    const imageData = ctx.getImageData(
      x, y, photoWidth, photoHeight
    );

    const pixels = imageData.data;

    for (let p = 0; p < pixels.length; p += 4) {
      const r = pixels[p];
      const g = pixels[p + 1];
      const b = pixels[p + 2];

      // Convert to luminance-based monochrome
      const luminance =
        0.299 * r +
        0.587 * g +
        0.114 * b;

      // Analog-inspired tonal curve
      const tone = filmCurve(luminance);

      // Subtle shared grain (not colored RGB noise)
      const grain = (Math.random() - 0.5) * grainAmount;

      const gray = clamp(tone + grain);

      // Slight warm silver-gelatin print tone
      pixels[p] = clamp(gray + warmth * 16);
      pixels[p + 1] = clamp(gray + warmth * 6);
      pixels[p + 2] = clamp(gray - warmth * 12);
    }

    ctx.putImageData(imageData, x, y);

    // Soft vignette around each frame
    const vignette = ctx.createRadialGradient(
      x + photoWidth / 2,
      y + photoHeight / 2,
      photoWidth * 0.12,
      x + photoWidth / 2,
      y + photoHeight / 2,
      photoWidth * 0.82
    );

    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.18)');

    ctx.fillStyle = vignette;
    ctx.fillRect(x, y, photoWidth, photoHeight);
  }

  // Gothic footer
  const footerTop =
    margin + photoHeight * 4 + gap * 3;

  ctx.textAlign = 'center';
  ctx.fillStyle = '#eee4d7';

  // Antique separator
  ctx.strokeStyle = '#a99b8c';
  ctx.lineWidth = 1;

  ctx.beginPath();
  ctx.moveTo(115, footerTop + 37);
  ctx.lineTo(width - 115, footerTop + 37);
  ctx.stroke();

  ctx.font = 'bold 49px Georgia, serif';
  ctx.fillText(
    'ALL HALLOWS’ EVE',
    width / 2,
    footerTop + 100
  );

  ctx.font = '25px Georgia, serif';
  ctx.fillText(
    'A NIGHT OF FRIGHTS',
    width / 2,
    footerTop + 145
  );

  ctx.font = '19px Georgia, serif';
  ctx.fillText(
    'CURATED BY VIMMI · MADELINE · KATHERINE',
    width / 2,
    footerTop + 184
  );

  ctx.font = '19px Georgia, serif';
  ctx.fillText(
    '✦  OCTOBER 24, 2026  ✦',
    width / 2,
    footerTop + 221
  );

  // Export completed strip
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob =>
        blob
          ? resolve(blob)
          : reject(new Error('Image export failed')),
      'image/jpeg',
      0.88
    );
  });
}
