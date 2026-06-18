"use client";

// 리스트 / 캘린더 보기 토글 (todo52 보기 토글 패턴)
export default function ViewToggle({
  view,
  onChange,
}: {
  view: "list" | "calendar";
  onChange: (v: "list" | "calendar") => void;
}) {
  return (
    <div className="flex gap-1">
      {(
        [
          ["list", "리스트"],
          ["calendar", "캘린더"],
        ] as const
      ).map(([id, label]) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={`flex-1 rounded-full px-3 py-1.5 text-sm font-semibold transition ${
            view === id
              ? "bg-leaf text-white"
              : "bg-card text-stone border border-line"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
