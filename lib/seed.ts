import type { Category, PaymentMethod, BaechooCategory, PlanItem, EventCategory } from "./types";

// 기본 계정 과목 시드 (앱 최초 실행 시 자동 주입, 이후 관리 화면에서 수정)
// groupName = 상위 카테고리. color/icon은 더 이상 화면에서 쓰지 않지만 컬럼 호환을 위해 남긴다.
export const SEED_CATEGORIES: Category[] = [
  // 지출
  { id: "cat-food", name: "식비", type: "expense", groupName: "생활비", costType: "variable", color: "#e07a5f" },
  { id: "cat-living", name: "생활용품", type: "expense", groupName: "생활비", costType: "variable", color: "#8ab560" },
  { id: "cat-uju", name: "육아", type: "expense", groupName: "가족", costType: "variable", color: "#e8a0bf" },
  { id: "cat-baechoo", name: "배추(반려)", type: "expense", groupName: "가족", costType: "variable", color: "#6fae8e" },
  { id: "cat-medical", name: "병원", type: "expense", groupName: "의료", costType: "variable", color: "#c96f6f" },
  { id: "cat-hobby", name: "취미", type: "expense", groupName: "문화·여가", costType: "variable", color: "#7a8cd0" },
  { id: "cat-card", name: "카드값", type: "expense", groupName: "금융", costType: "variable", color: "#5c93a8" },
  { id: "cat-saving", name: "적금", type: "expense", groupName: "저축·상환", costType: "fixed", color: "#5b8c3e" },
  { id: "cat-housing", name: "청약", type: "expense", groupName: "저축·상환", costType: "fixed", color: "#d9a441" },
  { id: "cat-installment", name: "할부", type: "expense", groupName: "저축·상환", costType: "fixed", color: "#b06fb0" },
  { id: "cat-etc", name: "기타", type: "expense", groupName: null, costType: "variable", color: "#9a948a" },
  // 수입
  { id: "cat-salary", name: "급여", type: "income", groupName: "근로소득", costType: null, color: "#3f6b2a" },
  { id: "cat-income-etc", name: "기타수입", type: "income", groupName: null, costType: null, color: "#4f8a6f" },
];

// 기본 결제수단 (현금·계좌, 카드는 직접 추가)
export const SEED_PAYMENT_METHODS: PaymentMethod[] = [
  { id: "pm-cash", name: "현금", kind: "cash" },
  { id: "pm-account", name: "계좌이체", kind: "account" },
];

// 배추 측정항목 기본값 (체중만, 나머지는 직접 추가)
export const SEED_BAECHOO_CATEGORIES: BaechooCategory[] = [
  { id: "bcat-weight", group: "measure", name: "체중", unit: "kg" },
];

// 월 예산 계획 시드 — 재헌님 손글씨 노트(2026-07-13). 합계는 골든 값이다.
//   수입 4,400,000 / 월 지출 2,760,000 / 저축·상환 1,254,206 / 여유 시 집행 360,000
//   → 계획 운영이익 25,794 (노트의 "잔액"과 원 단위 일치)
// 여기에 1회성 지출 1건(어머니 산후조리비, 2026-08)이 더해진다.
//   → 2026-08만 운영이익 -974,206, 그 외 달은 25,794
export const SEED_PLAN_ITEMS: PlanItem[] = [
  // ── 수입 4,400,000
  { id: "plan-inc-salary", group: "income", name: "추 급여", amount: 3300000, pnlClass: "revenue", conditional: false, startYearMonth: null, endYearMonth: null, targetTotal: null, note: "매월 25일", sortOrder: 10 },
  { id: "plan-inc-parent", group: "income", name: "부모급여", amount: 1000000, pnlClass: "revenue", conditional: false, startYearMonth: null, endYearMonth: null, targetTotal: null, note: null, sortOrder: 20 },
  { id: "plan-inc-child", group: "income", name: "아동수당", amount: 100000, pnlClass: "revenue", conditional: false, startYearMonth: null, endYearMonth: null, targetTotal: null, note: null, sortOrder: 30 },

  // ── 월 지출 2,760,000 (고정비 1,460,000 + 변동비 1,300,000)
  { id: "plan-exp-rent", group: "spending", name: "월세", amount: 600000, pnlClass: "fixed", conditional: false, startYearMonth: null, endYearMonth: null, targetTotal: null, note: null, sortOrder: 110 },
  { id: "plan-exp-maint", group: "spending", name: "관리비", amount: 150000, pnlClass: "fixed", conditional: false, startYearMonth: null, endYearMonth: null, targetTotal: null, note: null, sortOrder: 120 },
  { id: "plan-exp-gas", group: "spending", name: "가스", amount: 50000, pnlClass: "fixed", conditional: false, startYearMonth: null, endYearMonth: null, targetTotal: null, note: null, sortOrder: 130 },
  { id: "plan-exp-elec", group: "spending", name: "전기", amount: 50000, pnlClass: "fixed", conditional: false, startYearMonth: null, endYearMonth: null, targetTotal: null, note: null, sortOrder: 140 },
  { id: "plan-exp-loan", group: "spending", name: "대출", amount: 80000, pnlClass: "fixed", conditional: false, startYearMonth: null, endYearMonth: null, targetTotal: null, note: null, sortOrder: 150 },
  { id: "plan-exp-phone", group: "spending", name: "휴대폰", amount: 150000, pnlClass: "fixed", conditional: false, startYearMonth: null, endYearMonth: null, targetTotal: null, note: null, sortOrder: 160 },
  { id: "plan-exp-nhis", group: "spending", name: "국민건강보험", amount: 20000, pnlClass: "fixed", conditional: false, startYearMonth: null, endYearMonth: null, targetTotal: null, note: null, sortOrder: 170 },
  { id: "plan-exp-uju-ins", group: "spending", name: "우주보험", amount: 200000, pnlClass: "fixed", conditional: false, startYearMonth: null, endYearMonth: null, targetTotal: null, note: null, sortOrder: 180 },
  { id: "plan-exp-chu-allowance", group: "spending", name: "추 용돈", amount: 300000, pnlClass: "variable", conditional: false, startYearMonth: null, endYearMonth: null, targetTotal: null, note: null, sortOrder: 190 },
  { id: "plan-exp-chu-ins", group: "spending", name: "추 보험", amount: 150000, pnlClass: "fixed", conditional: false, startYearMonth: null, endYearMonth: null, targetTotal: null, note: null, sortOrder: 200 },
  { id: "plan-exp-apple", group: "spending", name: "애플", amount: 10000, pnlClass: "fixed", conditional: false, startYearMonth: null, endYearMonth: null, targetTotal: null, note: null, sortOrder: 210 },
  { id: "plan-exp-food", group: "spending", name: "식비", amount: 700000, pnlClass: "variable", conditional: false, startYearMonth: null, endYearMonth: null, targetTotal: null, note: null, sortOrder: 220 },
  { id: "plan-exp-fuel", group: "spending", name: "연료비", amount: 300000, pnlClass: "variable", conditional: false, startYearMonth: null, endYearMonth: null, targetTotal: null, note: null, sortOrder: 230 },

  // ── 1회성 지출 (특정 월에만 반영)
  { id: "plan-once-postpartum", group: "spending", name: "어머니 산후조리비", amount: 1000000, pnlClass: "variable", conditional: false, startYearMonth: "2026-08", endYearMonth: "2026-08", targetTotal: null, note: null, sortOrder: 240 },

  // ── 저축·상환 1,254,206
  { id: "plan-sav-uju-emergency", group: "saving", name: "우주 비상금", amount: 300000, pnlClass: "saving", conditional: false, startYearMonth: null, endYearMonth: null, targetTotal: null, note: null, sortOrder: 310 },
  { id: "plan-sav-cheongyak", group: "saving", name: "청약", amount: 20000, pnlClass: "fixed", conditional: false, startYearMonth: null, endYearMonth: null, targetTotal: null, note: null, sortOrder: 320 },
  { id: "plan-sav-uju-deposit", group: "saving", name: "우주 적금", amount: 200000, pnlClass: "saving", conditional: false, startYearMonth: null, endYearMonth: null, targetTotal: null, note: null, sortOrder: 330 },
  { id: "plan-sav-baechoo-deposit", group: "saving", name: "배추 적금", amount: 100000, pnlClass: "saving", conditional: false, startYearMonth: null, endYearMonth: null, targetTotal: null, note: "아동수당으로 충당", sortOrder: 340 },
  { id: "plan-sav-student-loan", group: "saving", name: "학자금", amount: 266000, pnlClass: "fixed", conditional: false, startYearMonth: null, endYearMonth: "2028-12", targetTotal: 6264000, note: "월 216,000 + 추가상환 50,000", sortOrder: 350 },
  { id: "plan-sav-car-loan", group: "saving", name: "자동차 할부", amount: 353206, pnlClass: "fixed", conditional: false, startYearMonth: null, endYearMonth: "2027-03", targetTotal: 2425648, note: "월 303,206 + 추가상환 50,000", sortOrder: 360 },
  { id: "plan-sav-car-tax", group: "saving", name: "자동차세", amount: 15000, pnlClass: "saving", conditional: false, startYearMonth: null, endYearMonth: "2027-06", targetTotal: 150000, note: "연 150,000 적립 (6월 납부)", sortOrder: 370 },

  // ── 여유 시 집행 ⊖ 360,000 — 부모급여·아동수당이 들어오면 집행
  { id: "plan-cond-mom-loan", group: "saving", name: "엄니 상환", amount: 200000, pnlClass: "fixed", conditional: true, startYearMonth: null, endYearMonth: null, targetTotal: 5000000, note: null, sortOrder: 410 },
  { id: "plan-cond-car-ins", group: "saving", name: "자동차보험", amount: 100000, pnlClass: "saving", conditional: true, startYearMonth: null, endYearMonth: "2027-02", targetTotal: 700000, note: "연 700,000 적립 (2월 납부)", sortOrder: 420 },
  { id: "plan-cond-baejji-wedding", group: "saving", name: "배찌 결혼 축의금", amount: 40000, pnlClass: "saving", conditional: true, startYearMonth: null, endYearMonth: "2026-12", targetTotal: 200000, note: null, sortOrder: 430 },
  { id: "plan-cond-gyeongjosa", group: "saving", name: "경조사 저축", amount: 20000, pnlClass: "saving", conditional: true, startYearMonth: null, endYearMonth: null, targetTotal: null, note: null, sortOrder: 440 },
];

// 캘린더 기본 카테고리 (고정 ID → 기존 일정 백필 category_id와 정합)
export const SEED_EVENT_CATEGORIES: EventCategory[] = [
  { id: "cat-chuchu", name: "추추", color: "#5c93a8", emoji: "🧑", sortOrder: 10, createdAt: "2026-07-16" },
  { id: "cat-baejji", name: "배찌", color: "#e07a5f", emoji: "👩", sortOrder: 20, createdAt: "2026-07-16" },
  { id: "cat-together", name: "함께", color: "#5b8c3e", emoji: "👫", sortOrder: 30, createdAt: "2026-07-16" },
];
