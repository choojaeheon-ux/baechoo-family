"use client";

import { Card } from "@/components/budget/ui";

export default function Manual() {
  return (
    <div className="space-y-4 text-sm leading-relaxed">
      <Card>
        <h3 className="mb-2 font-bold">목적</h3>
        <p>가족 재무를 경영자 관점 손익계산서로 조망합니다. 매달 BEP 달성 여부와 저축·투자 진행, 운영이익률을 한눈에 봅니다.</p>
      </Card>
      <Card>
        <h3 className="mb-2 font-bold">회계모델 (하이브리드)</h3>
        <table className="w-full">
          <tbody>
            <tr><td>매출</td><td className="text-right text-stone">급여·기타수입</td></tr>
            <tr><td>− 고정비(매출원가)</td><td className="text-right text-stone">주거·공과·보험·구독·할부·청약</td></tr>
            <tr><td>− 선저축</td><td className="text-right text-stone">적금</td></tr>
            <tr className="border-t"><td>= 가처분이익</td><td></td></tr>
            <tr><td>− 변동비(판관비)</td><td className="text-right text-stone">식비·외식·쇼핑·여가·병원·육아·배추</td></tr>
            <tr className="border-t font-bold"><td>= 운영이익(잉여)</td><td></td></tr>
          </tbody>
        </table>
      </Card>
      <Card>
        <h3 className="mb-2 font-bold">카테고리 매핑</h3>
        <ul className="list-disc space-y-1 pl-4">
          <li>고정지출 등록·청약·할부 → 고정비</li>
          <li>적금 → 선저축</li>
          <li>습관태그(배달·커피·외식 등) 포함 그 외 지출 → 변동비</li>
          <li>카드값 → 손익 제외(이중계상 방지, 실제 사용액만 카테고리별 기록)</li>
        </ul>
      </Card>
      <Card>
        <h3 className="mb-2 font-bold">지표</h3>
        <ul className="list-disc space-y-1 pl-4">
          <li>운영이익률 = 운영이익 ÷ 매출</li>
          <li>BEP = 운영이익 0. 고정비 + 계획저축 + 변동비를 수입으로 딱 감당</li>
          <li>운영이익 &gt; 0 = 계획한 저축을 다 하고도 흑자</li>
        </ul>
      </Card>
    </div>
  );
}
