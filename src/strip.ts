
export async function createStrip(shots: string[]): Promise<Blob> {
  if (shots.length !== 4) {
    throw new Error('Four photos are required.');
  }

  // Classic vintage photobooth dimensions
  const width = 680;
  const margin = 24;
  const gap = 10;
  const photoWidth = width - margin * 2;
  const photoHeight = 760;
  const footerHeight = 275;
  const height = margin * 2 + photoHeight * 4 + gap * 3 + footerHeight;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');

  // Classic black photobooth strip background
  ctx.fillStyle = '#171717';
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

    // Center-crop each photo without stretching it
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

    // Safari-compatible black-and-white film processing
    const imageData = ctx.getImageData(
      x, y, photoWidth, photoHeight
    );
    const pixels = imageData.data;

    for (let p = 0; p < pixels.length; p += 4) {
      const r = pixels[p];
      const g = pixels[p + 1];
      const b = pixels[p + 2];

      // Convert to black and white
      let gray = 0.299 * r + 0.587 * g + 0.114 * b;

      // Vintage contrast with gently lifted shadows
      gray = (gray - 128) * 1.22 + 134;
      gray = Math.max(8, Math.min(250, gray));

      // Fine analog-style film grain
      const grain = (Math.random() - 0.5) * 13;
      gray = Math.max(0, Math.min(255, gray + grain));

      pixels[p] = gray;
      pixels[p + 1] = gray;
      pixels[p + 2] = gray;
    }

    ctx.putImageData(imageData, x, y);

    // Subtle darkroom vignette around the edges
    const vignette = ctx.createRadialGradient(
      x + photoWidth / 2,
      y + photoHeight / 2,
      photoWidth * 0.1,
      x + photoWidth / 2,
      y + photoHeight / 2,
      photoWidth * 0.78
    );

    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.22)');

    ctx.fillStyle = vignette;
    ctx.fillRect(x, y, photoWidth, photoHeight);
  }

  // Footer
  const footerTop = margin + photoHeight * 4 + gap * 3;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f0e9df';

  // Thin antique-style separator
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

  // Export the completed photo strip
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => blob
        ? resolve(blob)
        : reject(new Error('Image export failed')),
      'image/jpeg',
      0.88
    );
  });
}
