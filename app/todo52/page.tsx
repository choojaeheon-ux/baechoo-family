import { redirect } from "next/navigation";

// 캘린더 탭으로 통합됨 — 홈화면에 저장된 옛 링크 보호용 리다이렉트
export default function Todo52Page() {
  redirect("/calendar");
}
