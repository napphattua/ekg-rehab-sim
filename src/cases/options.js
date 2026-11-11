export const ACTIONS = [
  { id: 'continue', label: 'ไปต่อ' },
  { id: 'increase', label: 'เพิ่มความหนัก' },
  { id: 'decrease', label: 'ลดความหนัก' },
  { id: 'stop', label: 'หยุด' },
];

export const REASONS = [
  { id: 'hr', label: 'HR / การตอบสนองของ HR' },
  { id: 'rhythm', label: 'จังหวะการเต้น (rhythm)' },
  { id: 'st', label: 'ST segment' },
  { id: 'artifact', label: 'คลื่นรบกวน (artifact) — QRS จริงยังเดินสม่ำเสมอ' },
  { id: 'bp', label: 'BP' },
  { id: 'spo2', label: 'SpO₂' },
  { id: 'rpe', label: 'RPE' },
  { id: 'symptom', label: 'อาการที่คนไข้บอก' },
  { id: 'signs', label: 'อาการแสดงที่เห็น (เหงื่อ ซีด กุมอก จับราว)' },
  { id: 'target', label: 'เทียบกับเป้าหมายการฝึก' },
  { id: 'meds', label: 'ผลของยา (เช่น beta-blocker)' },
];
