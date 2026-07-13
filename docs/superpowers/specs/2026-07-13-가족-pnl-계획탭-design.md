# 가족 P&L — 「계획」 탭 설계

- 날짜: 2026-07-13
- 대상: 배추가족 PWA `📊손익` 탭
- 원천: 재헌님 손글씨 예산 계획 노트 2장 (2번째 장 = 월 예산 계획)

## 1. 배경과 목적

손익 탭은 2026-07-03에 **실적 P&L**만 구현했다. 당시 "예산 계획 입력 + 계획 대비 실적"은 의도적으로 다음 증분으로 미뤘고(원 요구 "예산 농사"), 이번이 그 증분이다.

재헌님이 손으로 월 예산 계획을 완성했다. 이 계획을 앱에 넣어 **계획 P&L을 실적과 같은 회계 모델로 산출**하고, **계획 대비 실적**을 매달 볼 수 있게 한다.

## 2. 원천 데이터 (손글씨 계획, 검산 완료)

### 수입 — 4,400,000

| 항목 | 월 금액 |
|---|---|
| 추 급여 | 3,300,000 |
| 부모급여 | 1,000,000 |
| 아동수당 | 100,000 |

배찌 수입·현금·배찌 주식은 예산 규칙에 따라 계획에 넣지 않는다.

### 월 지출 — 2,760,000

| 항목 | 월 금액 | 손익분류 |
|---|---|---|
| 월세 | 600,000 | 고정비 |
| 관리비 | 150,000 | 고정비 |
| 가스 | 50,000 | 고정비 |
| 전기 | 50,000 | 고정비 |
| 대출 | 80,000 | 고정비 |
| 휴대폰 | 150,000 | 고정비 |
| 국민건강보험 | 20,000 | 고정비 |
| 우주보험 | 200,000 | 고정비 |
| 추 용돈 | 300,000 | 변동비 |
| 추 보험 | 150,000 | 고정비 |
| 애플 | 10,000 | 고정비 |
| 식비 | 700,000 | 변동비 |
| 연료비 | 300,000 | 변동비 |

고정비 1,460,000 + 변동비 1,300,000 = 2,760,000

### 저축·상환 — 1,254,206

| 항목 | 월 금액 | 손익분류 | 종료 | 목표·잔액 |
|---|---|---|---|---|
| 우주 비상금 | 300,000 | 선저축 | — | — |
| 청약 | 20,000 | 고정비 | — | — |
| 우주 적금 | 200,000 | 선저축 | — | — |
| 배추 적금 | 100,000 | 선저축 | — | 아동수당으로 충당 |
| 학자금 | 266,000 (216,000 + 추가 50,000) | 고정비 | 2028-12 | 잔액 6,264,000 |
| 자동차 할부 | 353,206 (303,206 + 추가 50,000) | 고정비 | 2027-03 | 잔액 2,425,648 |
| 자동차세 | 15,000 | 선저축 | 2027-06 | 연 150,000 적립 |

합 1,254,206 (원 단위까지 손글씨 소계와 일치)

### 여유 시 집행 (⊖) — 360,000

손글씨의 ⊖ 표시 = **저축·상환 소계에서 빼두고 맨 아래에서 한 번에 차감**한 항목들. 재헌님 설명: "최우선은 아닌데, 부모급여·아동수당 받으면 가능하다는 소리".

| 항목 | 월 금액 | 손익분류 | 종료 | 목표·잔액 |
|---|---|---|---|---|
| 엄니 상환 | 200,000 | 고정비 | — | 총 5,000,000 |
| 자동차보험 | 100,000 | 선저축 | 2027-02 | 연 700,000 적립 |
| 배찌 결혼 축의금 | 40,000 | 선저축 | 2026-12 | 총 200,000 |
| 경조사 저축 | 20,000 | 선저축 | — | — |

합 360,000

> **자동차보험이 ⊖ 그룹인 근거**: 저축·상환 소계 1,254,206을 검산하면 자동차보험 100,000이 빠져야 원 단위까지 맞고, ⊖ 합도 360,000이 되어 하단 수식과 일치한다. 재헌님이 구두로 나열할 때는 빠뜨렸으나 산수가 확정한다. 앱에서 한 번의 편집으로 그룹 변경 가능하므로 되돌릴 수 있다.

### 예산에서 제외

- **엄마 1,000,000** — 첫만남 이용권으로 충당. 일회성이라 예산에서 완전 제외.

### 검산

```
수입      4,400,000
지출      4,014,206  (= 2,760,000 + 1,254,206)
─────────────────
차액        385,794
⊖ 차감      360,000
─────────────────
잔액         25,794   ← 손글씨와 일치
```

손익 4버킷으로 재집계해도 같다:

```
매출     4,400,000
고정비   2,299,206  (지출 1,460,000 + 청약 20,000 + 학자금 266,000 + 자동차 353,206 + 엄니 200,000)
선저축     775,000  (비상금 300,000 + 우주적금 200,000 + 배추적금 100,000 + 자동차세 15,000
                     + 자동차보험 100,000 + 배찌결혼 40,000 + 경조사 20,000)
변동비   1,300,000  (추 용돈 300,000 + 식비 700,000 + 연료비 300,000)
─────────────────
운영이익    25,794
```

## 3. 설계 결정

### 3-1. 기존 Budget·RecurringExpense를 재사용하지 않는다

- **계획값 ≠ 실제 청구액**. 계획 월세는 600,000, 실제 정기지출은 539,840이다. 예산 규칙 "넉넉하게 계산"이 그렇게 만든다. 한 테이블에 섞으면 어느 쪽이 진실인지 알 수 없다.
- **기존 `Budget`은 카테고리별 지출 금액만** 담는다. 수입 계획·부채 상환·적립(sinking fund)·종료 시점을 담을 자리가 없다.
- 따라서 `plan_items` 테이블을 신설한다.

### 3-2. 항목마다 `pnlClass`를 붙인다

계획 항목이 실적 P&L과 **같은 4버킷**(revenue / fixed / saving / variable)을 갖게 한다. 그래야:
- 계획 P&L을 `computePnl`과 동일한 구조(매출 − 고정비 − 선저축 − 변동비 = 운영이익)로 산출하고,
- 기존 `WaterfallChart`를 그대로 재사용하며,
- 계획 vs 실적 대조가 사과 대 사과가 된다.

카테고리 매핑(자동 규칙)에 의존하지 않고 **항목에 직접 명시**한다. 계획 항목은 개수가 적고(27개) 재헌님이 의미를 정확히 아는 대상이라, 자동 추론보다 직접 지정이 옳다.

### 3-3. 매달 같은 단일 계획

월별 계획표를 따로 두지 않는다. 계획 1벌을 매달 적용하고, `endYearMonth`가 지난 항목은 자동으로 빠진다(학자금 29회 → 2028-12 이후 소멸). 가계부의 "기본 예산"(`Budget.yearMonth = null`)과 같은 사고방식이다.

### 3-4. ⊖는 `group`이 아니라 `conditional` 플래그

⊖ 항목도 손익분류상으로는 고정비·선저축이다(엄니=부채상환, 자동차보험=적립). 그룹을 따로 만들면 4버킷이 5개가 되어 실적과 대조가 깨진다. 그래서 **`conditional: boolean`을 별도 필드로** 두고, 화면에서만 별도 섹션으로 묶어 보여준다. P&L 집계에는 정상 포함된다.

## 4. 데이터 모델

### 새 엔티티 `PlanItem` (`lib/types.ts`)

```ts
export type PlanGroup = "income" | "spending" | "saving";

export const PLAN_GROUP_LABEL: Record<PlanGroup, string> = {
  income: "수입",
  spending: "월 지출",
  saving: "저축·상환",
};

export interface PlanItem {
  id: string;
  group: PlanGroup;          // 종이의 좌/우 구획
  name: string;
  amount: number;            // 월 금액
  pnlClass: Exclude<PnlClass, "excluded">;  // revenue|fixed|saving|variable
  conditional: boolean;      // ⊖ — 여유 시 집행
  endYearMonth: string | null; // "YYYY-MM", null = 무기한
  targetTotal: number | null;  // 부채 잔액·적립 목표액 (표시용)
  note: string | null;
  sortOrder: number;
}
```

`DataSnapshot`에 `planItems: PlanItem[]` 추가.

### 마이그레이션 `0018_plan_items`

```sql
create table plan_items (
  id text primary key,
  "group" text not null check ("group" in ('income','spending','saving')),
  name text not null,
  amount integer not null,
  pnl_class text not null check (pnl_class in ('revenue','fixed','saving','variable')),
  conditional boolean not null default false,
  end_year_month text,
  target_total integer,
  note text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
alter table plan_items enable row level security;
create policy family_all on plan_items for all using (true) with check (true);
create index idx_plan_items_sort on plan_items (sort_order);
```

### 시드 — 마이그레이션 INSERT가 아니라 `loadAll` 부트스트랩

§2의 **27개 항목**을 `lib/seed.ts`의 `SEED_PLAN_ITEMS` 상수로 두고, `repo.loadAll()`이 **테이블이 비어 있으면 삽입**한다. `categories`·`payment_methods`·`baechoo_categories`가 이미 쓰는 패턴이다.

마이그레이션 INSERT 대신 이 방식을 쓰는 이유:
- **한글 인코딩 함정 회피** — Management API로 한글 INSERT를 하면 PowerShell 경유 시 깨진다(과거 사고). supabase-js는 UTF-8을 정상 처리하므로 앱이 삽입하면 문제가 없다. 마이그레이션은 순수 ASCII DDL만 남는다.
- **localStorage 모드도 대칭으로 시드된다** — 마이그레이션은 클라우드에만 적용되므로, 로컬 모드에선 계획이 텅 비어 있게 된다.

> ⚠️ DDL을 먼저 적용하면 배포 전까지 프로덕션 구버전 코드가 없는 테이블을 읽는다 — 는 걱정은 여기선 없다. 구버전 코드는 `plan_items`를 모르므로 테이블만 먼저 만들어 두는 것은 안전하다. 순서: **DDL 적용 → 배포**.

## 5. 계산 (`lib/plan.ts`, 순수함수)

```ts
// 종료된 항목 제외 (endYearMonth < 기준월)
export function activeItems(items: PlanItem[], yearMonth: string): PlanItem[];

// 계획 P&L — 실적과 동일한 PnlSummary 반환
export function computePlanPnl(items: PlanItem[], yearMonth: string): PnlSummary;

// 그룹 소계 (화면 표시용)
export function groupTotal(items: PlanItem[], group: PlanGroup, conditional?: boolean): number;

// 남은 개월 수 ("29회 남음" 뱃지)
export function remainingMonths(endYearMonth: string | null, today: string): number | null;
```

`computePlanPnl`은 `variableByHabit`을 빈 객체로 반환한다(계획엔 습관 태그가 없다). 나머지 필드는 실적 `PnlSummary`와 같은 의미를 갖는다.

**계획 vs 실적 대조**는 새 함수 없이 `computePlanPnl`과 기존 `computePnl` 결과를 화면에서 나란히 뺀다.

## 6. 화면 (`components/pnl/`)

서브탭을 `[대시보드] [계획] [설명서]` 3개로 확장. `app/pnl/page.tsx`의 토글에 `plan` 추가.

| 컴포넌트 | 역할 |
|---|---|
| `Plan.tsx` | 계획 탭 루트 — 아래 5블록 배치 |
| `PlanSummary.tsx` | ① 히어로: 수입 / 지출 / 여유 시 집행 / **잔액**(양수 leaf·음수 coral) |
| (재사용) `WaterfallChart` | ② 계획 P&L 폭포 — `buildWaterfall(computePlanPnl(...))` |
| `PlanVsActual.tsx` | ③ 계획 vs 실적 대조표 (매출·고정비·선저축·변동비·운영이익 × 계획/실적/차이) |
| `PlanItemList.tsx` | ④ 그룹별 항목 리스트 — `수입` / `월 지출` / `저축·상환` / `여유 시 집행(⊖)` 4섹션 |
| `PlanItemForm.tsx` | 항목 편집 시트 (name·amount·group·pnlClass·conditional·endYearMonth·targetTotal·note) |
| `BudgetRules.tsx` | ⑤ 예산 규칙 접이식 메모 (코드 상수) |

**항목 행**: 항목명 + 금액. `endYearMonth`가 있으면 우측에 Pill — `8회 남음`(≤12개월이면 gold, 그 외 stone). `targetTotal`이 있으면 부제로 `잔액 2,425,648`. `note`가 있으면 부제로 표시.

**여유 시 집행 섹션**: 헤더에 "부모급여·아동수당이 들어오면 집행" 설명 한 줄. 항목은 흐린 톤(stone)으로.

**예산 규칙 상수** (`lib/types.ts`):
```ts
export const BUDGET_RULES = [
  "금액은 넉넉하게 올려 잡는다",
  "현금·배찌 주식은 계획에서 잊는다",
  "첫만남 이용권·안양시 200만원 등 일회성 금액은 잊는다",
  "엄마 1,000,000은 첫만남 이용권으로 충당 — 예산 제외",
];
```

UI는 기존 `components/budget/ui.tsx`의 `Card`·`Sheet`·`Field`·`Pill`·`ProgressBar`를 재사용한다. 새 UI 프리미티브를 만들지 않는다.

## 7. 저장 계층

- `lib/repo.ts`: `toPlanItem`/`fromPlanItem` 매퍼, `loadAll`에 `plan_items` select 추가, `savePlanItem`(upsert)·`deletePlanItem`(하드삭제 — 계획 항목은 소프트삭제 대상 아님, 배추 기록물과 성격 다름)
- `lib/data-context.tsx`: `planItems` state + `savePlanItem`/`deletePlanItem` 낙관적 mutator + `refresh()`
- localStorage 모드도 대칭으로 동작

## 8. 테스트 (`lib/plan.test.ts`, vitest)

1. `computePlanPnl(시드 27항목, "2026-08")` → `operatingProfit === 25794` (**종이와 원 단위 일치 — 골든 케이스**)
2. 같은 입력 → `revenue === 4400000`, `fixed === 2299206`, `saving === 775000`, `variable === 1300000`
3. `groupTotal(spending)` === 2,760,000
4. `groupTotal(saving, conditional=false)` === 1,254,206
5. `groupTotal(saving, conditional=true)` === 360,000
6. `activeItems` — `endYearMonth`가 기준월보다 이전이면 제외 (자동차 할부는 2027-04 기준월에서 빠짐)
7. `activeItems` — `endYearMonth === 기준월`이면 **포함**(그 달까지 납부)
8. `remainingMonths("2027-03", "2026-08")` === 8
9. `remainingMonths(null, ...)` === null
10. `computePlanPnl` — 빈 배열이면 전 필드 0, `operatingMargin` 0 (0으로 나누기 가드)

## 9. 범위 밖 (YAGNI)

- **손글씨 1번째 장(카드/은행 현황·정기지출)** — 가계부의 `고정지출관리`·`결제수단`과 중복. 이번 증분에 넣지 않는다.
- 월별 계획 이력 — 단일 계획으로 시작.
- 계획 항목 ↔ 실제 카테고리/정기지출 자동 연결 — 대조는 4버킷 수준으로 충분. 항목 단위 연결은 다음 증분에서 필요해지면.
- 부채 잔액 자동 차감 — `targetTotal`은 표시용 수동값. 자동 상각은 과설계.
