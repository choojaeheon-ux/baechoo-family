import type { EventKind } from "@/lib/baechooEvents";
import { IconPaw } from "@/components/ios";

// 원형 버튼·필터용 흰 아이콘(currentColor). 뜻은 아래 라벨 글자가 전한다(스펙 §9).
export function KindIcon({ kind, className = "h-7 w-7" }: { kind: EventKind; className?: string }) {
  if (kind === "walk") return <IconPaw filled className={className} />;
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
      {kind === "meal" && (
        <>
          <path d="M3 11.5h18a9 9 0 0 1-18 0Z" />
          <circle cx="8.5" cy="8.6" r="1.3" />
          <circle cx="12" cy="7.2" r="1.3" />
          <circle cx="15.5" cy="8.6" r="1.3" />
        </>
      )}
      {kind === "snack" && (
        <g transform="rotate(-45 12 12)">
          <rect x="6" y="10" width="12" height="4" rx="1" />
          <circle cx="6" cy="9.7" r="2.5" />
          <circle cx="6" cy="14.3" r="2.5" />
          <circle cx="18" cy="9.7" r="2.5" />
          <circle cx="18" cy="14.3" r="2.5" />
        </g>
      )}
      {kind === "stool" && (
        <path d="M4.8 20h14.4a2.6 2.6 0 0 0 .4-5.2 2.6 2.6 0 0 0-2.3-3.6h-.4a2.8 2.8 0 0 0-2.6-3.9c-.1-1.4.5-2.6 1.4-3.3-2.9-.5-5.4 1.2-5.9 3.6a2.8 2.8 0 0 0-1.7 3.6 2.6 2.6 0 0 0-2.6 3.6A2.6 2.6 0 0 0 4.8 20Z" />
      )}
      {kind === "etc" && (
        <path d="M4 20l1.1-4.6L15.6 4.9a2.1 2.1 0 0 1 3 3L8.1 18.4 4 20Zm9.9-13.4 3 3" />
      )}
    </svg>
  );
}
