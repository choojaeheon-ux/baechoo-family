// 통화 · 날짜 포맷 유틸

export function won(n: number): string {
  const sign = n < 0 ? "-" : "";
  return `${sign}₩${Math.abs(Math.round(n)).toLocaleString("ko-KR")}`;
}

// 축약 (분석 차트 축 등): 1.2만, 340만, 1.5억
export function wonShort(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1e8) return `${sign}${(abs / 1e8).toFixed(abs % 1e8 === 0 ? 0 : 1)}억`;
  if (abs >= 1e4) return `${sign}${Math.round(abs / 1e4).toLocaleString("ko-KR")}만`;
  return `${sign}${abs.toLocaleString("ko-KR")}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function currentYearMonth(): string {
  return todayISO().slice(0, 7);
}

export function yearMonthOf(isoDate: string): string {
  return isoDate.slice(0, 7);
}

// "2026-06" -> "2026년 6월"
export function ymLabel(ym: string): string {
  const [y, m] = ym.split("-");
  return `${y}년 ${Number(m)}월`;
}

export function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function daysInMonth(ym: string): number {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

// 해당 월에서 출금일(dayOfMonth)을 실제 날짜로 보정 (말일 초과 시 말일)
export function resolveDueDate(ym: string, dayOfMonth: number): string {
  const dim = daysInMonth(ym);
  const day = Math.min(dayOfMonth, dim);
  return `${ym}-${String(day).padStart(2, "0")}`;
}

// D-day: 양수=남음, 0=오늘, 음수=지남
export function dday(isoDate: string): number {
  const today = new Date(todayISO());
  const target = new Date(isoDate);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export function ddayLabel(isoDate: string): string {
  const d = dday(isoDate);
  if (d === 0) return "오늘";
  if (d > 0) return `D-${d}`;
  return `D+${-d}`;
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
export function weekdayKo(isoDate: string): string {
  return WEEKDAYS[new Date(isoDate).getDay()];
}
