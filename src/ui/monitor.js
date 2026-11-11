// Bedside-style sweep display for one lead, plus a 10 s history for the feedback strip.
// Sample k (counting from the first push) is at ECG time k / fs.
export function createMonitor(canvas, { fs = 250, seconds = 6, historySeconds = 10 } = {}) {
  const ctx = canvas.getContext('2d');
  const n = fs * seconds;
  const sweep = new Float32Array(n);
  const hist = new Float32Array(fs * historySeconds);
  const gap = Math.round(0.12 * fs); // erase bar ahead of the write head
  let total = 0;
  let beats = [];

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(canvas.clientWidth * dpr);
    canvas.height = Math.round(canvas.clientHeight * dpr);
  }
  resize();
  window.addEventListener('resize', resize);

  return {
    push(v) {
      sweep[total % n] = v;
      hist[total % hist.length] = v;
      total += 1;
    },

    addBeat(b) {
      beats.push(b);
      const cutoff = total / fs - historySeconds;
      while (beats.length && beats[0].time < cutoff) beats.shift();
    },

    // last `secs` seconds as { fs, samples, beats } with beat times relative to the strip start
    snapshot(secs = seconds) {
      const count = Math.min(secs * fs, total, hist.length);
      const start = total - count;
      const samples = new Float32Array(count);
      for (let i = 0; i < count; i++) samples[i] = hist[(start + i) % hist.length];
      const t0 = start / fs;
      return { fs, samples, beats: beats.filter((b) => b.time >= t0).map((b) => ({ ...b, time: b.time - t0 })) };
    },

    draw() {
      const W = canvas.width;
      const H = canvas.height;
      const pxPerMv = H / 3.2;
      ctx.fillStyle = '#05080a';
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = '#0d2416';
      ctx.lineWidth = 1;
      for (let s = 0; s <= seconds; s += 0.2) {
        const x = (s / seconds) * W;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }
      ctx.strokeStyle = '#3cff6e';
      ctx.lineWidth = 2 * Math.min(window.devicePixelRatio || 1, 2);
      ctx.lineJoin = 'round';
      ctx.beginPath();
      const head = total % n;
      let pen = false;
      for (let i = 0; i < n; i++) {
        const ahead = (i - head + n) % n;
        const unwritten = total < n && i >= head;
        if (ahead < gap || unwritten) {
          pen = false;
          continue;
        }
        const x = (i / n) * W;
        const y = H / 2 - sweep[i] * pxPerMv;
        if (pen) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
        pen = true;
      }
      ctx.stroke();
    },
  };
}
