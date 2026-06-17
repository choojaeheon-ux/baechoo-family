# 배추가족 🥬

배추가족(추추·배찌·배추·우주)이 함께 쓰는 모바일 PWA 앱.

- **가계부** — 이번에 만든 1차 기능 (캘린더 투두, 할부 카운트다운, 예산·분석·목표)
- **배추 생활 기록부** — 준비중 (탭만)
- **우주 육아 기록부** — 준비중 (탭만)

## 동작 방식

- **데이터 저장 2가지 모드** (자동 선택)
  - `.env.local`에 Supabase 키가 있으면 → **클라우드 동기화** (추추·배찌 두 폰이 같은 데이터)
  - 키가 없으면 → **이 기기 localStorage** (설정 없이 바로 사용 가능, 데모용)
- **접근**: 기기별 4자리 PIN (첫 실행 시 설정)
- 입력자는 화면에서 `추추`/`배찌` 토글로 구분

## 바로 실행 (로컬, 설정 불필요)

```bash
npm install
npm run dev
```

브라우저에서 http://localhost:3000 접속 → PIN 설정 → 바로 사용. (이 모드는 데이터가 이 브라우저에만 저장됩니다.)

## 클라우드 동기화 켜기 (개인 Supabase)

> ⚠️ 반드시 **개인 계정**으로 진행하세요 (회사 계정 아님).

1. https://supabase.com 에서 개인 계정으로 새 프로젝트 생성
2. 프로젝트의 **SQL Editor** 에 `supabase/migrations/0001_init.sql` 내용을 붙여넣고 실행 (테이블·기본 카테고리·접근정책 생성)
3. 프로젝트 설정 → **API** 에서 `Project URL` 과 `anon public` 키 복사
4. `.env.local.example` 를 `.env.local` 로 복사하고 값 입력:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ....
   ```
5. `npm run dev` 재시작 → 헤더에 "클라우드 동기화 중" 표시되면 성공

## 배포 (개인 Vercel + 폰에 설치)

> ⚠️ 반드시 **개인 Vercel 계정**으로 진행하세요.

1. https://vercel.com 에 개인 계정으로 로그인 → 이 프로젝트 import (또는 `npx vercel`)
2. 환경변수에 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` 등록
3. 배포 후 받은 URL을 폰 브라우저로 열기
4. **홈 화면에 추가** (iOS: 공유 → 홈 화면에 추가 / Android: 메뉴 → 앱 설치) → 앱처럼 실행

## 기술 스택

Next.js 16 (App Router) · TypeScript · Tailwind v4 · Supabase · Chart.js · PWA

## 폴더 구조

```
app/
  budget/      가계부 (메인)
  baechoo/     배추 생활기록부 (준비중)
  uju/         우주 육아기록부 (준비중)
  manifest.ts  PWA 매니페스트
components/
  PinGate.tsx  PIN 잠금
  BottomNav.tsx 하단 탭
  budget/      가계부 화면들 (Dashboard/Calendar/Transactions/Analysis/Plans + forms)
lib/
  types.ts     도메인 타입
  repo.ts      저장소 (Supabase <-> localStorage)
  data-context.tsx 전역 상태
  compute.ts   월별 집계·예산·절감항목
  recurring.ts 고정지출 반복·할부 계산
supabase/migrations/0001_init.sql  DB 스키마
scripts/gen-icons.mjs              아이콘 생성기
```
