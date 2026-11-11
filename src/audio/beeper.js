// QRS beep (pitch falls with SpO₂, like bedside oximeters) and a two-tone alarm. No audio files.
export function createBeeper() {
  let ctx = null;
  let muted = false;
  let alarmTimer = null;

  function tone(freq, dur, vol = 0.08, delay = 0) {
    if (muted || !ctx) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = freq;
    const t0 = ctx.currentTime + delay;
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(ctx.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  return {
    // browsers only allow audio after a user gesture: call from a click handler
    unlock() {
      if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
    },
    beat(spo2) {
      tone(400 + (spo2 - 85) * 25, 0.08);
    },
    setAlarm(on) {
      if (on && !alarmTimer) {
        alarmTimer = setInterval(() => {
          tone(960, 0.15, 0.06);
          tone(760, 0.15, 0.06, 0.2);
        }, 1200);
      } else if (!on && alarmTimer) {
        clearInterval(alarmTimer);
        alarmTimer = null;
      }
    },
    setMuted(m) {
      muted = m;
    },
    get muted() {
      return muted;
    },
  };
}
