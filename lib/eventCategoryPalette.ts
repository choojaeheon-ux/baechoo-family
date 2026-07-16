// 캘린더 카테고리 색 팔레트 — 앱 크림/어스톤 톤에 맞춘 스와치.
export const CATEGORY_PALETTE = [
  "#5b8c3e", // leaf
  "#8ab560", // sprout
  "#4a9d9a", // teal
  "#5c93a8", // sky
  "#8a6fb0", // lavender
  "#b5586f", // plum
  "#e07a5f", // coral
  "#c9784f", // terracotta
  "#d9a441", // gold
  "#a3785a", // caramel
  "#6d6875", // slate
  "#7c766a", // stone
];

// 배경 hex 위에 얹을 글씨색 — 밝기(YIQ)로 흰색/짙은색 결정.
export function readableText(hex: string): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 150 ? "#2f2a20" : "#ffffff";
}
