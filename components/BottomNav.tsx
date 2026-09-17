"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconChart,
  IconChecklist,
  IconMoonStars,
  IconPaw,
  IconWon,
} from "@/components/ios";

const TABS = [
  { href: "/todo", label: "투두", Icon: IconChecklist },
  { href: "/budget", label: "가계부", Icon: IconWon },
  { href: "/pnl", label: "손익", Icon: IconChart },
  { href: "/baechoo", label: "배추", Icon: IconPaw },
  { href: "/uju", label: "우주", Icon: IconMoonStars },
];

// 떠 있는 글래스 탭 바 — 선택 렌즈가 탭 사이를 스프링으로 미끄러진다
export default function BottomNav() {
  const pathname = usePathname();
  const idx = TABS.findIndex(
    (t) => pathname === t.href || pathname.startsWith(t.href + "/")
  );

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-md px-4"
      style={{ paddingBottom: "var(--tabbar-gap)" }}
    >
      <nav
        aria-label="주 메뉴"
        className="glass pointer-events-auto relative flex rounded-full p-1"
        style={{ height: "var(--tabbar-h)" }}
      >
        {idx >= 0 && (
          <span
            aria-hidden
            className="tab-lens absolute bottom-1 left-1 top-1 rounded-full bg-black/[0.06]"
            style={{
              width: `calc((100% - 8px) / ${TABS.length})`,
              transform: `translateX(${idx * 100}%)`,
            }}
          />
        )}
        {TABS.map((t, i) => {
          const active = i === idx;
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={active ? "page" : undefined}
              className={`press relative flex flex-1 flex-col items-center justify-center gap-[3px] rounded-full ${
                active ? "text-leaf" : "text-ink/80"
              }`}
            >
              <t.Icon filled={active} className="h-[25px] w-[25px]" />
              <span className="text-[10px] font-semibold leading-none tracking-[0.01em]">
                {t.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
