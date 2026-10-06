// 산책 안 응가(walk.stools) → 독립 응가 기록(baechoo_stools) 이관 규칙 (2026-10-06 재헌 지시).
// 이관 스크립트(scratchpad/migrate-walk-stools.mjs)가 Node로 이 파일을 직접 불러 쓴다 —
// 그래서 값 import 없이(type import만) 자급한다. 원본 walk.stools는 지우지 않고 화면만 안 읽는다.
import type { BaechooStool, BaechooWalk } from "./types";

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const hm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

function addDay(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return ymd(new Date(y, m - 1, d + 1));
}

export function walkStoolsToRecords(walks: BaechooWalk[]): BaechooStool[] {
  const out: BaechooStool[] = [];
  for (const w of walks) {
    const start = w.startTime ? new Date(w.startTime) : null;
    const date = start ? ymd(start) : w.date;
    const startHm = start ? hm(start) : null;
    w.stools.forEach((s, i) => {
      const time = s.time ?? startHm;
      // 시작보다 이른 시각은 자정을 넘긴 것(1분 여유는 같은 분 기록용) — 이벤트 모델의 옛 규칙과 같다
      const crossed =
        startHm != null && time != null && toMin(time) < toMin(startHm) - 1;
      out.push({
        id: `ws-${w.id}-${i}`,
        date: crossed ? addDay(date) : date,
        time,
        state: s.state,
        memo: null,
      });
    });
  }
  return out;
}

function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}
