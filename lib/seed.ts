import type { Category } from "./types";

// 기본 카테고리 시드 (앱 최초 실행 시 자동 주입)
export const SEED_CATEGORIES: Category[] = [
  // 지출
  { id: "cat-food", name: "식비", type: "expense", color: "#e07a5f", icon: "🍚" },
  { id: "cat-living", name: "생활", type: "expense", color: "#8ab560", icon: "🧺" },
  { id: "cat-card", name: "카드값", type: "expense", color: "#5c93a8", icon: "💳" },
  { id: "cat-saving", name: "적금", type: "expense", color: "#5b8c3e", icon: "🐖" },
  { id: "cat-housing", name: "청약", type: "expense", color: "#d9a441", icon: "🏠" },
  { id: "cat-installment", name: "할부", type: "expense", color: "#b06fb0", icon: "🧾" },
  { id: "cat-baechoo", name: "배추(반려)", type: "expense", color: "#6fae8e", icon: "🐶" },
  { id: "cat-uju", name: "우주(육아)", type: "expense", color: "#e8a0bf", icon: "🍼" },
  { id: "cat-medical", name: "의료/건강", type: "expense", color: "#c96f6f", icon: "💊" },
  { id: "cat-leisure", name: "문화/여가", type: "expense", color: "#7a8cd0", icon: "🎬" },
  { id: "cat-etc", name: "기타", type: "expense", color: "#9a948a", icon: "📦" },
  // 수입
  { id: "cat-salary", name: "급여", type: "income", color: "#3f6b2a", icon: "💼" },
  { id: "cat-income-etc", name: "기타수입", type: "income", color: "#4f8a6f", icon: "💰" },
];
