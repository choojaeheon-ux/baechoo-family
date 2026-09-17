"use client";

import { Segmented } from "@/components/ios";

// 리스트 / 캘린더 보기 토글
export default function ViewToggle({
  view,
  onChange,
}: {
  view: "list" | "calendar";
  onChange: (v: "list" | "calendar") => void;
}) {
  return (
    <Segmented
      label="보기 방식"
      value={view}
      onChange={onChange}
      options={[
        { id: "list", label: "리스트" },
        { id: "calendar", label: "캘린더" },
      ]}
    />
  );
}
