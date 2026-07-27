// 손익 페이지의 어느 서브탭으로 열지 다른 라우트에서 예약해 두는 자리.
// (가계부 대시보드 → 손익 「예산·목표」처럼 라우트를 건너뛰는 이동에 쓴다)
// SPA 내 이동이라 모듈 상태가 그대로 유지되고, 새로고침으로 들어오면 null이라 기본 탭이 열린다.
export type PnlSub = "dashboard" | "year" | "analysis" | "budget" | "manual";

let pending: PnlSub | null = null;

export function setPendingPnlSub(sub: PnlSub) {
  pending = sub;
}

// 한 번 읽으면 비운다 — 뒤로 갔다 다시 들어왔을 때 또 끌려가지 않도록.
export function takePendingPnlSub(): PnlSub | null {
  const s = pending;
  pending = null;
  return s;
}
