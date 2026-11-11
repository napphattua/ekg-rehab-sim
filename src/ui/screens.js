import { ACTIONS, REASONS } from '../cases/options.js';
import { drawStrip } from './strip.js';

const TIER = {
  best: { label: 'ดีที่สุด', cls: 'best' },
  ok: { label: 'ยอมรับได้', cls: 'ok' },
  bad: { label: 'ไม่ปลอดภัย / ไม่เหมาะสม', cls: 'bad' },
};
const actionLabel = (id) => ACTIONS.find((a) => a.id === id).label;
const reasonLabel = (id) => REASONS.find((r) => r.id === id).label;
const overlay = () => document.getElementById('overlay');

// 'center' = full-screen modal, 'sheet' = panel over the 3D scene only (monitor stays visible)
function open(html, mode) {
  const el = overlay();
  el.className = mode;
  el.innerHTML = html;
  el.hidden = false;
  return el;
}

export function close() {
  overlay().hidden = true;
  overlay().innerHTML = '';
}

export function showMenu(cases, done, onPick) {
  const el = open(
    `<div class="card menu">
      <h1>Rehab Monitor Sim</h1>
      <p class="draft">ร่าง — ยังไม่ได้รีวิวโดยผู้เชี่ยวชาญ · ใช้ฝึกเท่านั้น ห้ามใช้ตัดสินใจกับผู้ป่วยจริง</p>
      <p>ฝึกตัดสินใจระหว่าง exercise ใน cardiac rehab phase II: ดูคลื่นหัวใจ สัญญาณชีพ และตัวคนไข้ แล้วเลือกว่าจะไปต่อ เพิ่ม ลด หรือหยุด</p>
      <ol class="cases">${cases
        .map((c) => `<li><button data-id="${c.id}">${c.title}</button>${done.has(c.id) ? ' <span class="tick">✓</span>' : ''}</li>`)
        .join('')}</ol>
      <p class="hint">เปิดเสียงด้วย — เสียงบี๊บและ alarm เป็นส่วนหนึ่งของเคส · กดวัด BP / ถาม RPE / ถามอาการ ได้ตลอด</p>
    </div>`,
    'center',
  );
  el.querySelectorAll('button[data-id]').forEach((b) => b.addEventListener('click', () => onPick(b.dataset.id)));
}

export function showChart(c, onStart) {
  const ch = c.chart;
  const el = open(
    `<div class="card chart">
      <h2>${c.title}</h2>
      <dl>
        <dt>ผู้ป่วย</dt><dd>${ch.name} · ${ch.sex} ${ch.age} ปี</dd>
        <dt>Dx</dt><dd>${ch.dx}</dd>
        <dt>หลังทำหัตถการ</dt><dd>${ch.postOp}</dd>
        <dt>ยา</dt><dd>${ch.meds.join('<br>')}</dd>
        <dt>ขณะพัก</dt><dd>${ch.rest}</dd>
        <dt>เป้าหมาย</dt><dd>${ch.target}</dd>
        <dt>หมายเหตุ</dt><dd>${ch.notes}</dd>
      </dl>
      <button class="primary" id="start">เริ่ม session</button>
    </div>`,
    'center',
  );
  el.querySelector('#start').addEventListener('click', onStart);
}

export function showDecision(step, onSubmit) {
  const el = open(
    `<button class="peek" id="peek">👁 ดูคนไข้ / กลับมาตอบ</button>
    <div class="card decision">
      <h3>${step.question}</h3>
      <div class="actions">${ACTIONS.map((a) => `<label><input type="radio" name="action" value="${a.id}"> ${a.label}</label>`).join('')}</div>
      <p class="sub">เหตุผล — ติ๊กสัญญาณที่ใช้ตัดสินใจ</p>
      <div class="reasons">${REASONS.map((r) => `<label><input type="checkbox" value="${r.id}"> ${r.label}</label>`).join('')}</div>
      <button class="primary" id="submit" disabled>ส่งคำตอบ</button>
    </div>`,
    'sheet',
  );
  // the sheet covers the patient, whose look is part of the assessment
  el.querySelector('#peek').addEventListener('click', () => el.classList.toggle('peeking'));
  const submit = el.querySelector('#submit');
  el.querySelectorAll('input[name=action]').forEach((i) => i.addEventListener('change', () => (submit.disabled = false)));
  submit.addEventListener('click', () => {
    const action = el.querySelector('input[name=action]:checked').value;
    const reasons = [...el.querySelectorAll('.reasons input:checked')].map((i) => i.value);
    onSubmit({ action, reasons });
  });
}

export function showFeedback(step, result, snap, onNext) {
  const tier = TIER[result.tier];
  const next = result.best === 'stop' ? 'จบเคส' : `ต่อ — ครูพี่เลี้ยงปรับเป็น "${actionLabel(result.best)}"`;
  const el = open(
    `<div class="card feedback">
      <span class="tier ${tier.cls}">${tier.label}</span>
      <p>คุณเลือก <b>${actionLabel(result.choice.action)}</b> · คำตอบที่ดีที่สุด <b>${actionLabel(result.best)}</b></p>
      <figure><canvas id="strip"></canvas><figcaption>${step.highlight ? step.highlight.label : ''}</figcaption></figure>
      <p>${step.explain}</p>
      ${result.missed.length ? `<p class="missed">ควรใช้แต่ไม่ได้ติ๊ก: ${result.missed.map(reasonLabel).join(', ')}</p>` : ''}
      ${result.extra.length ? `<p class="extra">ติ๊กเกินมา: ${result.extra.map(reasonLabel).join(', ')}</p>` : ''}
      <p class="ref">อ้างอิง: ${step.ref}</p>
      <button class="primary" id="next">${next}</button>
    </div>`,
    'sheet',
  );
  drawStrip(el.querySelector('#strip'), snap, step.highlight);
  el.querySelector('#next').addEventListener('click', onNext);
}

export function showSummary(c, results, { allDone, formUrl, onMenu, onReplay }) {
  const max = c.steps.length * 3;
  const points = results.reduce((s, r) => s + r.points, 0);
  const rows = c.steps
    .map((s, i) => {
      const r = results[i];
      if (!r) return '';
      const missed = r.missed.length ? ` · พลาด: ${r.missed.map(reasonLabel).join(', ')}` : '';
      return `<li><span class="tier ${TIER[r.tier].cls}">${TIER[r.tier].label}</span> ${s.question}
        <br><small>เลือก ${actionLabel(r.choice.action)} · ดีที่สุด ${actionLabel(r.best)}${missed}</small></li>`;
    })
    .join('');
  const form = allDone && formUrl ? `<a class="button primary" href="${formUrl}" target="_blank" rel="noopener">ให้ feedback (2 นาที)</a>` : '';
  const el = open(
    `<div class="card summary">
      <h2>สรุป — ${c.title}</h2>
      <p class="score">${points.toFixed(1)} / ${max} คะแนน</p>
      <ol>${rows}</ol>
      <div class="row">
        <button id="replay">เล่นเคสนี้อีกครั้ง</button>
        <button class="primary" id="menu">เลือกเคสอื่น</button>
        ${form}
      </div>
    </div>`,
    'center',
  );
  el.querySelector('#replay').addEventListener('click', onReplay);
  el.querySelector('#menu').addEventListener('click', onMenu);
}
