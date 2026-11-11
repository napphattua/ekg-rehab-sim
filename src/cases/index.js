// Clinical content — DRAFT, not yet reviewed by a specialist.
// Times (`at`, `ramp`, `endAt`) are seconds of session time (the game runs 6× faster).
// `check` = vital-sign ranges at the decision point; they must match the numbers in `explain`.
// Reviewers: pin the edition and page for every `ref`.

const ACSM = 'ACSM’s Guidelines for Exercise Testing and Prescription';
const AACVPR = 'AACVPR Guidelines for Cardiac Rehabilitation Programs';

export const CASES = [
  {
    id: 'cabg-artifact',
    title: 'เคส 1 — หลัง CABG: เดินเบาไป แล้วจอขึ้นคลื่นแปลก',
    chart: {
      name: 'คุณสมชาย', age: 62, sex: 'ชาย', ending: 'ครับ', fine: 'ยังไหวครับ เดินสบายๆ',
      dx: 'CABG ×3 (LIMA-LAD, SVG-OM, SVG-RCA)',
      postOp: '6 สัปดาห์',
      meds: ['Metoprolol 25 mg bid', 'Aspirin 81 mg', 'Atorvastatin 40 mg'],
      rest: 'HR 64 · BP 122/76 · SpO₂ 97%',
      target: 'RPE 11–14 (ได้ beta-blocker → ใช้ RPE เป็นหลัก) · HR ไม่เกิน rest + 30',
      notes: 'แผลกระดูกอกหายดี ไม่มีอาการเจ็บอกตั้งแต่ผ่าตัด',
    },
    patient: { restHR: 64, hrPerMet: 5, restSBP: 122, restDBP: 76, sbpPerMet: 8, spo2: 97, rpeBase: 7, rpePerMet: 1.8 },
    treadmill: { speed: 3.2, grade: 0 },
    endAt: 900,
    events: [
      { at: 480, set: { artifact: 1, monitorHr: 176 } },
      { at: 660, set: { artifact: 0, monitorHr: null } },
    ],
    steps: [
      {
        id: 'c1-s1',
        at: 240,
        question: 'ผ่าน warm-up มา 4 นาที คนไข้เดินสบาย จะทำอย่างไรต่อ?',
        grades: { continue: 'ok', increase: 'best', decrease: 'bad', stop: 'bad' },
        reasons: ['rpe', 'target', 'meds'],
        check: { rpe: [9, 10], hr: [68, 75] },
        highlight: { label: 'Sinus rhythm ปกติ ไม่มี ST change', from: -0.22, to: 0.4 },
        explain:
          'RPE ~10 ยังต่ำกว่าเป้า 11–14 และไม่มีอาการผิดปกติ HR ขึ้นน้อย (~72) เพราะ metoprolol กดการตอบสนองของ HR จึงใช้ HR เป็นเป้าไม่ได้ ต้องดู RPE แทน — เพิ่มความหนักขึ้นหนึ่งขั้นได้อย่างปลอดภัย',
        ref: `${ACSM} — exercise prescription ในผู้ป่วยที่ได้ beta-blocker (ใช้ RPE) · ${AACVPR}`,
      },
      {
        id: 'c1-s2',
        at: 560,
        question: 'จอขึ้นคลื่นถี่ยุ่งเหยิง HR บนจอ 176 และ alarm ดัง จะทำอย่างไร?',
        grades: { continue: 'best', increase: 'bad', decrease: 'ok', stop: 'ok' },
        reasons: ['artifact', 'symptom', 'hr'],
        check: { monitorHr: [170, 180], pr: [72, 82], rpe: [11, 13] },
        highlight: { label: 'QRS จริงยังเดินสม่ำเสมอทะลุคลื่นรบกวน', from: -0.05, to: 0.06 },
        explain:
          'คลื่นที่ดูคล้าย VT เป็น motion artifact: ยังเห็น QRS ปกติเดินเป็นจังหวะเดิมทะลุคลื่นรบกวน, PR จาก SpO₂ ~76 ไม่ใช่ 176 และคนไข้คุยได้ปกติ ไม่มีอาการ — ไปต่อได้ แต่ต้องดูคนไข้ คลำชีพจร และเช็ก electrode/สายที่หลวมทันที ถ้ายังไม่แน่ใจ การลดความหนักหรือหยุดสั้นๆ เพื่อเช็กสายถือว่ายอมรับได้ แต่ไม่ควรเพิ่มความหนักขณะที่ยังอ่านคลื่นไม่ได้',
        ref: `${AACVPR} — ECG monitoring ระหว่าง cardiac rehab · หลัก “treat the patient, not the monitor”`,
      },
    ],
  },

  {
    id: 'pci-st',
    title: 'เคส 2 — หลัง PCI: ST ค่อยๆ เปลี่ยน',
    chart: {
      name: 'คุณวิไล', age: 58, sex: 'หญิง', ending: 'ค่ะ', fine: 'ยังไหวค่ะ',
      dx: 'NSTEMI → PCI + DES ที่ LAD (RCA ตีบ 50–60% ยังไม่ได้ทำ)',
      postOp: '4 สัปดาห์',
      meds: ['Aspirin 81 mg', 'Clopidogrel 75 mg', 'Bisoprolol 2.5 mg', 'Atorvastatin 80 mg', 'ISDN 5 mg SL prn'],
      rest: 'HR 70 · BP 128/80 · SpO₂ 98%',
      target: 'RPE 11–13 · HR ไม่เกิน 105 (ต่ำกว่า ischemic threshold ≥ 10 bpm)',
      notes: 'Exercise test ก่อนเข้าโปรแกรม: ST ↓ 1 mm ที่ HR 115 ไม่มีอาการ',
    },
    patient: { restHR: 70, hrPerMet: 8, restSBP: 128, restDBP: 80, sbpPerMet: 9, spo2: 98, rpeBase: 7, rpePerMet: 1.6 },
    treadmill: { speed: 3.5, grade: 2 },
    endAt: 700,
    events: [
      { at: 120, ramp: 120, set: { stMm: 0.5 } },
      { at: 380, ramp: 120, set: { stMm: 2.5, hrAdd: 10, sbpAdd: -6 } },
      { at: 440, set: { symptom: 'แน่นๆ ตรงกลางหน้าอกนิดนึงค่ะ' } },
      { at: 470, set: { cues: ['sweat', 'chestClutch'] } },
    ],
    steps: [
      {
        id: 'c2-s1',
        at: 300,
        question: 'เดินช่วงคงที่มา 5 นาที คลื่นเป็นแบบที่เห็นบนจอ จะทำอย่างไร?',
        grades: { continue: 'best', increase: 'ok', decrease: 'ok', stop: 'bad' },
        reasons: ['st', 'rpe', 'symptom'],
        check: { hr: [84, 92], rpe: [10, 12] },
        highlight: { label: 'ST ต่ำลงเล็กน้อย ~0.5 mm (ไม่ถึง 1 mm)', from: 0.04, to: 0.2 },
        explain:
          'ST ต่ำลง ~0.5 mm ยังไม่ถึงเกณฑ์ที่มีนัยสำคัญ (≥ 1 mm แบบ horizontal/downsloping) RPE ~11 อยู่ในเป้า HR ~88 ต่ำกว่า limit 105 และไม่มีอาการ — ไปต่อที่ความหนักเดิมได้ แต่เฝ้าดู ST ใกล้ชิดเพราะรู้ ischemic threshold อยู่แล้ว การเพิ่มความหนักเล็กน้อยพอยอมรับได้ถ้า HR ไม่เกิน 105',
        ref: `${ACSM} — ตั้ง HR เป้าหมายให้ต่ำกว่า ischemic threshold ≥ 10 bpm`,
      },
      {
        id: 'c2-s2',
        at: 500,
        question: 'ST เปลี่ยนชัดขึ้น คนไข้บอกว่าแน่นหน้าอก จะทำอย่างไร?',
        grades: { continue: 'bad', increase: 'bad', decrease: 'ok', stop: 'best' },
        reasons: ['st', 'symptom', 'signs'],
        check: { hr: [92, 100] },
        highlight: { label: 'ST ต่ำลงแบบ horizontal ~2.5 mm', from: 0.04, to: 0.2 },
        explain:
          'ST ต่ำลงแบบ horizontal > 2 mm ร่วมกับแน่นหน้าอกและเหงื่อออก = สัญญาณ myocardial ischemia — หยุดออกกำลังกาย ให้นั่งพัก monitor EKG และวัด BP ต่อ ประเมินอาการ ให้ ISDN ตาม order ถ้าอาการไม่หาย และแจ้งแพทย์ สังเกตว่า ischemia เกิดที่ HR ~95 ต่ำกว่า threshold เดิม (115) อาจบ่งว่าโรคดำเนินไปหรือมี restenosis การลดความหนักช่วยลด demand ได้จึงพอยอมรับ แต่เมื่อมีอาการร่วมด้วยควรหยุดก่อน',
        ref: `${ACSM} — indications for terminating exercise (ST ↓ > 2 mm horizontal/downsloping, angina) · ${AACVPR}`,
      },
    ],
  },

  {
    id: 'cabg-af',
    title: 'เคส 3 — หลัง CABG: จังหวะเปลี่ยนกลางทาง',
    chart: {
      name: 'คุณประเสริฐ', age: 70, sex: 'ชาย', ending: 'ครับ', fine: 'ยังไหวครับ',
      dx: 'CABG ×2 (LIMA-LAD, SVG-PDA)',
      postOp: '3 สัปดาห์',
      meds: ['Aspirin 81 mg', 'Atorvastatin 40 mg', 'Enalapril 5 mg bid'],
      rest: 'HR 78 · BP 118/72 · SpO₂ 96%',
      target: 'RPE 11–13 · HR ไม่เกิน rest + 30 (≈ 108)',
      notes: 'ยังไม่เริ่ม beta-blocker เพราะ BP ต่ำช่วงหลังผ่าตัด · มี PVC ประปรายตั้งแต่หลังผ่าตัด',
    },
    patient: { restHR: 78, hrPerMet: 10, restSBP: 118, restDBP: 72, sbpPerMet: 8, spo2: 96, rpeBase: 9, rpePerMet: 1.8 },
    treadmill: { speed: 2.7, grade: 0 },
    endAt: 700,
    events: [
      { at: 0, set: { pvcEvery: 8 } },
      { at: 400, set: { rhythm: 'af', pvcEvery: 0 } },
      { at: 400, ramp: 40, set: { hrAdd: 62, sbpAdd: -14, rpeAdd: 3 } },
      { at: 430, set: { symptom: 'ใจสั่นๆ เหนื่อยขึ้นเยอะเลยครับ' } },
      { at: 450, set: { cues: ['sweat', 'grabRail'] } },
    ],
    steps: [
      {
        id: 'c3-s1',
        at: 240,
        question: 'มี beat หน้าตาแปลกแทรกเป็นระยะ คนไข้ไม่มีอาการ จะทำอย่างไร?',
        grades: { continue: 'best', increase: 'ok', decrease: 'ok', stop: 'bad' },
        reasons: ['rhythm', 'rpe', 'symptom'],
        check: { hr: [87, 94], rpe: [11, 12] },
        highlight: { label: 'PVC เดี่ยว: QRS กว้าง ไม่มี P นำ ตามด้วย compensatory pause', from: -0.1, to: 0.45, beatType: 'pvc' },
        explain:
          'PVC เดี่ยวรูปแบบเดียว (unifocal) ~10 ครั้ง/นาที ไม่มี couplet/triplet ไม่มีอาการ RPE ~11 อยู่ในเป้า และเป็น pattern เดิมตั้งแต่หลังผ่าตัด — ไปต่อได้พร้อมเฝ้าดู ถ้าเริ่มเป็นคู่ (couplet) หลายรูปแบบ (multifocal) หรือถี่ขึ้นตามความหนัก ให้ลดหรือหยุด',
        ref: `${ACSM} — indications for terminating exercise (multifocal PVCs, PVC triplets, VT)`,
      },
      {
        id: 'c3-s2',
        at: 480,
        question: 'จังหวะบนจอเปลี่ยนไป HR พุ่ง คนไข้บอกใจสั่น จะทำอย่างไร?',
        grades: { continue: 'bad', increase: 'bad', decrease: 'ok', stop: 'best' },
        reasons: ['rhythm', 'hr', 'symptom', 'bp'],
        check: { hr: [138, 150], sbp: [112, 120], rpe: [14, 15] },
        highlight: { label: 'ไม่มี P wave · RR ไม่สม่ำเสมอ (irregularly irregular)', from: -0.3, to: 0.05 },
        explain:
          'AF เกิดใหม่ร่วมกับ rapid ventricular response (HR ~140+) ใจสั่น เหนื่อยมากขึ้น (RPE ~14) และ SBP ลดจาก ~128 เหลือ ~116 ทั้งที่ความหนักเท่าเดิม — หยุดออกกำลังกาย ให้นั่งพัก monitor ต่อ วัด BP ประเมินอาการ (เวียนหัว เจ็บอก หายใจลำบาก) และแจ้งแพทย์ AF หลัง CABG พบบ่อยในช่วงสัปดาห์แรกๆ การลดความหนักทันทีระหว่างเตรียมหยุดยอมรับได้ แต่ไม่ควรให้ออกกำลังกายต่อจนกว่าแพทย์จะประเมิน',
        ref: `${ACSM} — indications for terminating exercise (arrhythmia ที่มีอาการ/ระบบไหลเวียนเปลี่ยน, SBP ลดลง) · ${AACVPR}`,
      },
    ],
  },
];
