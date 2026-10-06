// 기기별 설정(localStorage) 공용. 사생활 보호 모드 등에서 접근 자체가 던질 수 있어
// 호출부는 반드시 try/catch로 감싼다.
export type KV = { getItem(k: string): string | null; setItem(k: string, v: string): void };

export function browserStore(): KV | null {
  return typeof window === "undefined" ? null : window.localStorage;
}
