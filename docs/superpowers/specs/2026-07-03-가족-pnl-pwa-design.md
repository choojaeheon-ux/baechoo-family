# 배추가족 손익(P&L) 탭 — 2단계 PWA 설계 명세

- 작성일: 2026-07-03
- 상태: 설계 확정 (구현 착수 전)
- 선행: 1단계 회계모델 확정 — `docs/가족-pnl/회계모델-규칙서.md`, `docs/superpowers/specs/2026-07-03-가족-pnl-design.md`

## 1. 목적

1단계에서 합의한 하이브리드 회계모델을 배추가족 PWA에 **실적 P&L 탭**으로 이식한다. 실제 가계부 거래를 손익구조로 자동집계해, 그래픽 중심으로 "이번 달/올해 우리 가족 손익"을 한눈에 조망한다.

**이번 범위는 실적(실제 거래 집계)만.** 예산 계획 입력은 다음 증분.

## 2. 범위

**포함**
- 하단 5번째 독립 탭 `📊 손익`
- 그래픽 4종: 폭포 차트(히어로), BEP 반원 게이지, 구성 도넛, 자산 대조 미니바
- 월 뷰 / 연 뷰 토글
- 자산 스냅샷 입력·대조 (월말 총자산 수동 입력)
- 탭 내 서브탭 `[대시보드] [설명서]`
- 설명서: 회계모델·매핑 규칙을 앱 내 매뉴얼로

**제외 (YAGNI)**
- 예산 계획 입력·계획 대비 실적
- 손익분류 수동 조정 UI (자동 규칙만)
- 순자산(자산−부채)·부채 관리
- Goal 월별 적립 추적 (데이터에 월 이력 없음)

## 3. 화면 구조

P&L 탭은 상단에 서브탭 2개를 둔다.

### A. 대시보드 (그래픽 메인 · 숫자는 보조 캡션)

상단: `[월][연]` 토글 + `◀ 2026-06 ▶` 기간 네비 (기존 monthFilter 패턴 재사용)

1. **폭포 차트 (히어로)** — 매출에서 고정비·선저축·변동비가 차례로 깎여 운영이익만 남는 흐름. Chart.js floating bar([base, top]).
   - 매출·운영이익 = 양(+) 막대, 고정비·선저축·변동비 = 차감 막대
   - 각 막대 아래 항목명·금액 캡션
2. **BEP 반원 게이지** — 운영이익률 % 표시 + BEP 달성 배지(운영이익 ≥ 0 이면 ✓)
3. **구성 도넛** — 매출 대비 고정비/선저축/변동비/운영이익 비중
4. **자산 대조** — 월말 총자산 입력칸 + "전월 대비 자산증가 vs 운영이익" 미니 바 + 차이 표시

### 연 뷰
- 월별 운영이익 막대 + 운영이익률 라인 (Chart.js 콤보)
- 연간 합계(매출·고정비·선저축·변동비·운영이익) + 평균 운영이익률

### B. 설명서 (앱 내 매뉴얼)
`회계모델-규칙서.md`의 핵심을 정적 페이지로 렌더:
- 목적
- 하이브리드 회계모델 (손익구조 표)
- 카테고리 매핑 규칙
- 지표 정의 (운영이익률, BEP)

## 4. 손익분류 규칙 (자동 · `lib/pnl.ts`)

거래 하나를 손익항목으로 분류하는 순수함수. 우선순위 순:

```
classifyTx(tx, category, recurringById):
  1. category.id === "cat-card"              → "excluded"  (카드값)
  2. category.type === "income"              → "revenue"
  3. tx.recurringId != null
     또는 category.id ∈ {"cat-housing","cat-installment"} → "fixed" (청약·할부)
  4. category.id === "cat-saving"            → "saving"    (적금)
  5. 그 외 expense                           → "variable"
```

- **id 기준 매칭**: seed 카테고리 id로 매칭한다. 이름은 사용자가 바꿀 수 있어 불안정. 구현 착수 시 재헌님 실제 카테고리 목록을 확인해, seed id를 벗어난 커스텀 카테고리가 있으면 매핑 상수(`FIXED_CAT_IDS`, `SAVING_CAT_IDS`, `EXCLUDED_CAT_IDS`)에 추가한다.

- 반환 타입: `PnlClass = "revenue" | "fixed" | "saving" | "variable" | "excluded"`
- 변동비 세부: `tx.habitTag`(배달·커피·외식·쇼핑·택시·구독)별로 소계 (연/월 공통)
- **카드값 제외 근거**: 재헌님은 실제 사용액만 카테고리별로 기록하고 명세서 총액은 넣지 않음 → 카드값 카테고리는 이중계상 방지를 위해 손익에서 제외
- **미분류/신규 카테고리**: expense면 기본 "variable"

### 집계 산출물
```
PnlSummary {
  revenue: number        // 매출
  fixed: number          // 고정비 (매출원가)
  saving: number         // 선저축
  grossProfit: number    // 가처분이익 = revenue - fixed - saving
  variable: number       // 변동비 (판관비)
  operatingProfit: number// 운영이익 = grossProfit - variable
  operatingMargin: number// 운영이익률 = operatingProfit / revenue
  bepAchieved: boolean   // operatingProfit >= 0
  variableByHabit: Record<string, number> // 변동비 습관태그별 소계
}
```

## 5. 데이터 모델 (신규 1종)

기존 `transactions`·`recurring`·`categories`·`goals`는 그대로 읽어 집계한다. 새로 저장하는 것은 자산 스냅샷뿐.

```ts
// lib/types.ts
export interface AssetSnapshot {
  id: string;
  yearMonth: string;  // "YYYY-MM"
  totalAssets: number; // 현금+계좌+투자 잔액 합계
}
// DataSnapshot 에 assetSnapshots: AssetSnapshot[] 추가
```

- `lib/repo.ts`: `saveAssetSnapshot(x)` / `deleteAssetSnapshot(id)` + `loadAll()`에 `assetSnapshots` 포함 (기존 Supabase/localStorage 이중화 패턴 그대로)
- `lib/data-context.tsx`: `assetSnapshots` state + provider 노출
- Supabase 마이그레이션: `asset_snapshots` 테이블 (`id text pk, year_month text, total_assets numeric`). localStorage는 DataSnapshot 직렬화에 자동 포함
- 자산 대조: 해당 월 스냅샷 − 전월 스냅샷 = 자산증가, 운영이익과 차이 표시

## 6. 아키텍처 / 파일 구조

| 파일 | 책임 |
|---|---|
| `lib/pnl.ts` | 손익분류·집계 순수함수 (`classifyTx`, `computePnl`, `computeYearPnl`). 테스트 대상 |
| `app/pnl/page.tsx` | P&L 탭 진입, `[대시보드][설명서]` 서브탭 스위칭 |
| `components/pnl/Dashboard.tsx` | 월/연 토글·기간 네비·그래픽 조립 |
| `components/pnl/WaterfallChart.tsx` | 폭포 차트 |
| `components/pnl/BepGauge.tsx` | BEP 반원 게이지 |
| `components/pnl/CompositionDonut.tsx` | 구성 도넛 |
| `components/pnl/AssetReconcile.tsx` | 자산 스냅샷 입력·대조 |
| `components/pnl/YearView.tsx` | 연 뷰 콤보 차트·연간 합계 |
| `components/pnl/Manual.tsx` | 설명서 정적 페이지 |
| `components/BottomNav.tsx` | 5번째 탭 `📊 손익` 추가 (수정) |
| `lib/types.ts` · `lib/repo.ts` · `lib/data-context.tsx` | `AssetSnapshot` 추가 (수정) |

- 차트: 기존 의존성 `chart.js` + `react-chartjs-2` 재사용. 구현 시 `dataviz` 스킬 색·레이아웃 가이드 준용
- `lib/pnl.ts`는 순수함수로 격리해 단위 테스트(분류·집계·비율·BEP)

## 7. 데이터 흐름

```
useData() → transactions·recurring·categories·goals·assetSnapshots
   ↓
lib/pnl.ts: computePnl(month) / computeYearPnl(year)
   ↓
Dashboard → WaterfallChart·BepGauge·CompositionDonut·AssetReconcile
AssetReconcile 입력 → saveAssetSnapshot → context 갱신
```

## 8. 엣지 케이스

- **매출 0**: 운영이익률 분모 0 → 0% 또는 "—" 표시 (0으로 나누기 가드)
- **거래 없는 달**: 빈 폭포·"기록 없음" 안내
- **자산 스냅샷 미입력**: 자산 대조 영역은 "월말 총자산을 입력하세요" 플레이스홀더, 손익표는 정상 표시
- **전월 스냅샷 없음**: 자산증가 계산 불가 → "전월 자산 없음, 대조 생략"
- **카드값 카테고리 없는 경우**: 이름 매칭 실패해도 안전(제외 대상이 없을 뿐)

## 9. 테스트

`lib/pnl.ts` 단위 테스트:
- 분류: income→revenue, recurring 연결→fixed, 청약→fixed, 적금→saving, 카드값→excluded, 일반지출→variable
- 집계: 가처분이익·운영이익·운영이익률 계산
- BEP: 운영이익 0 이상/미만
- 변동비 habitTag 소계
- 매출 0 가드
- 연 집계 12개월 합산

## 10. 미결·다음 증분

- 예산 계획 입력 + 계획 대비 실적
- 손익분류 수동 조정 UI
- Goal 월별 적립 추적
- 순자산(자산−부채) 확장
