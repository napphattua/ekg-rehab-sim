import './style.css';
import { CASES } from './cases/index.js';
import { FEEDBACK_FORM_URL } from './config.js';
import { createEngine } from './game/engine.js';
import { createEcg } from './ecg/generator.js';
import { createMonitor } from './ui/monitor.js';
import { createBeeper } from './audio/beeper.js';
import { createScene } from './scene/runner.js';
import * as screens from './ui/screens.js';

const FS = 250;
// 1 real second = 6 session seconds (30-min session ≈ 5 min); ?speed=60 fast-forwards for reviewers
const SIM_SPEED = Number(new URLSearchParams(location.search).get('speed')) || 6;
const IDLE_ECG = { hr: 72, rhythm: 'sinus', stMm: 0, pvcEvery: 0, artifact: 0, noise: 0.02 };

const $ = (id) => document.getElementById(id);
const monitor = createMonitor($('ecg'), { fs: FS });
const scene = createScene($('scene'));
const beeper = createBeeper();
const ecg = createEcg({ fs: FS, seed: 7 }); // one continuous signal, so monitor time never resets
const done = new Set();

let engine = null;
let shownFor = null; // engine status the overlay currently shows
let lastSymptom = null;
let speechTimer = 0;
let carry = 0;

const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

function say(text) {
  const el = $('speech');
  el.textContent = `“${text}”`;
  el.hidden = false;
  clearTimeout(speechTimer);
  speechTimer = setTimeout(() => (el.hidden = true), 6000);
}

function menu() {
  engine = null;
  shownFor = null;
  beeper.setAlarm(false);
  $('speech').hidden = true;
  screens.showMenu(CASES, done, (id) => pick(CASES.find((c) => c.id === id)));
}

function pick(c) {
  beeper.unlock(); // inside a click: browsers allow audio from here on
  screens.showChart(c, () => {
    screens.close();
    engine = createEngine(c);
    shownFor = 'running';
    lastSymptom = null;
    $('bp').textContent = '--/--';
    $('rpe').textContent = '--';
    $('speech').hidden = true;
  });
}

function updateHud(v) {
  const tm = engine.treadmill;
  $('hr').textContent = v.monitorHr;
  $('pr').textContent = v.pr;
  $('spo2').textContent = v.spo2;
  $('speed').textContent = tm.speed.toFixed(1);
  $('grade').textContent = tm.grade.toFixed(1);
  $('mets').textContent = tm.mets.toFixed(1);
  $('clock').textContent = fmt(engine.t);
  const alarm = v.monitorHr > 150 || v.monitorHr < 40;
  $('hr-box').classList.toggle('alarm', alarm);
  beeper.setAlarm(alarm && (engine.status === 'running' || engine.status === 'deciding'));
  if (v.symptom && v.symptom !== lastSymptom) say(v.symptom);
  lastSymptom = v.symptom;
}

function handleStatus() {
  const s = engine.status;
  if (s === shownFor) return;
  shownFor = s;
  if (s === 'running') screens.close();
  if (s === 'deciding') {
    screens.showDecision(engine.step, (choice) => {
      const result = engine.answer(choice);
      screens.showFeedback(engine.step, result, monitor.snapshot(6), () => engine.proceed());
    });
  }
  if (s === 'done') {
    beeper.setAlarm(false);
    const c = engine.caseDef;
    done.add(c.id);
    screens.showSummary(c, engine.results, {
      allDone: done.size === CASES.length,
      formUrl: FEEDBACK_FORM_URL,
      onMenu: menu,
      onReplay: () => pick(c),
    });
  }
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (engine) engine.tick(dt * SIM_SPEED);
  const v = engine ? engine.vitals() : null;
  ecg.setParams(engine ? engine.ecgParams() : IDLE_ECG);

  carry += dt * FS;
  for (; carry >= 1; carry -= 1) monitor.push(ecg.sample());
  for (const b of ecg.drainBeats()) {
    monitor.addBeat(b);
    if (engine && engine.status !== 'done') beeper.beat(v.spo2);
  }

  if (engine) {
    updateHud(v);
    handleStatus();
  }
  const speed = engine && engine.status !== 'done' ? engine.treadmill.speed : 0;
  scene.update(dt, { speed, cues: v ? v.cues : [] });
  monitor.draw();
  scene.render();
  requestAnimationFrame(frame);
}

$('btn-bp').addEventListener('click', () => {
  if (!engine) return;
  $('bp').textContent = 'วัด…';
  setTimeout(() => {
    if (!engine) return;
    const v = engine.vitals();
    $('bp').textContent = `${v.sbp}/${v.dbp}`;
  }, 3000); // a cuff reading takes time
});
$('btn-rpe').addEventListener('click', () => {
  if (!engine) return;
  const v = engine.vitals();
  $('rpe').textContent = v.rpe;
  say(`เหนื่อยประมาณ ${v.rpe} ${engine.caseDef.chart.ending}`);
});
$('btn-sym').addEventListener('click', () => {
  if (!engine) return;
  say(engine.vitals().symptom ?? engine.caseDef.chart.fine);
});
$('mute').addEventListener('click', () => {
  beeper.setMuted(!beeper.muted);
  $('mute').textContent = beeper.muted ? '🔇 เสียงปิด' : '🔊 เสียงเปิด';
});

menu();
requestAnimationFrame(frame);
