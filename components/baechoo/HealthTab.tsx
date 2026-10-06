"use client";

import { SectionTitle } from "@/components/budget/ui";
import HealthTodos from "./HealthTodos";
import VaccineList from "./VaccineList";
import ExamList from "./ExamList";
import HealthList from "./HealthList";

// 건강 탭 — 옛 [건강]·[신체검사] 두 탭을 하나로(2026-10-06 재헌 지시). 내용은 그대로 두고 배치만:
// 건강 기록은 기록 탭 「기타」로도 계속 쌓이므로 맨 아래 — 신체검사 추이가 긴 목록에 묻히지 않게.
export default function HealthTab() {
  return (
    <div className="space-y-4">
      <HealthTodos />
      <VaccineList />
      <section>
        <SectionTitle>신체검사</SectionTitle>
        <ExamList />
      </section>
      <section>
        <SectionTitle>건강 기록</SectionTitle>
        <HealthList />
      </section>
    </div>
  );
}
