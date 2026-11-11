// ACSM metabolic equations. speed in km/h, grade in %.
// Walking: VO2 = 0.1·S + 1.8·S·G + 3.5 ; Running (> 8 km/h): VO2 = 0.2·S + 0.9·S·G + 3.5
export function metsFor(speedKmh, gradePct) {
  const S = (speedKmh * 1000) / 60; // m/min
  const G = gradePct / 100;
  const vo2 = speedKmh > 8 ? 0.2 * S + 0.9 * S * G + 3.5 : 0.1 * S + 1.8 * S * G + 3.5;
  return vo2 / 3.5;
}

const MAX_GRADE = 15;
const MIN_SPEED = 1.5;
const round1 = (x) => Math.round(x * 10) / 10;

// dir +1 = เพิ่ม ~1 MET, -1 = ลด ~1 MET. Grade moves first so the gait stays the same.
export function stepWorkload({ speed, grade }, dir) {
  const S = (speed * 1000) / 60;
  const dG = Math.max(0.5, Math.round((3.5 / (1.8 * S)) * 100 * 2) / 2);
  if (dir > 0) {
    if (grade + dG <= MAX_GRADE) return { speed, grade: grade + dG };
    return { speed: round1(speed + 0.5), grade };
  }
  if (grade > 0) return { speed, grade: Math.max(0, grade - dG) };
  return { speed: Math.max(MIN_SPEED, round1(speed - 1)), grade: 0 };
}
