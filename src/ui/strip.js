// ECG paper (25 mm/s, 10 mm/mV) with highlight boxes on each matching beat.
// highlight = { from, to, beatType? } in seconds relative to the R peak.
export function drawStrip(canvas, snap, highlight) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(canvas.clientWidth * dpr);
  canvas.height = Math.round(canvas.clientHeight * dpr);
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const secs = snap.samples.length / snap.fs;
  const mm = W / (secs * 25); // px per mm

  ctx.fillStyle = '#fff7f7';
  ctx.fillRect(0, 0, W, H);
  const gridLine = (x0, y0, x1, y1, major) => {
    ctx.strokeStyle = major ? '#e9a3a3' : '#f7d4d4';
    ctx.lineWidth = major ? 1.2 : 0.6;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  };
  for (let i = 0; i * mm <= W; i++) gridLine(i * mm, 0, i * mm, H, i % 5 === 0);
  for (let i = 0; i * mm <= H; i++) gridLine(0, i * mm, W, i * mm, i % 5 === 0);

  if (highlight) {
    ctx.fillStyle = 'rgba(255, 196, 0, 0.3)';
    for (const b of snap.beats) {
      if (highlight.beatType && b.type !== highlight.beatType) continue;
      const x0 = (b.time + highlight.from) * 25 * mm;
      const x1 = (b.time + highlight.to) * 25 * mm;
      ctx.fillRect(x0, 0, x1 - x0, H);
    }
  }

  const mid = H * 0.55;
  ctx.strokeStyle = '#111';
  ctx.lineWidth = 1.6 * dpr;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  snap.samples.forEach((v, i) => {
    const x = (i / snap.fs) * 25 * mm;
    const y = mid - v * 10 * mm;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
}
