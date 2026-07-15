"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/calendar", label: "캘린더", icon: "🗓️" },
  { href: "/budget", label: "가계부", icon: "💰" },
  { href: "/pnl", label: "손익", icon: "📊" },
  { href: "/baechoo", label: "배추", icon: "🐶" },
  { href: "/uju", label: "우주", icon: "🍼" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-md border-t border-line bg-card/95 backdrop-blur">
      <div
        className="flex"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {TABS.map((t) => {
          const active =
            pathname === t.href || pathname.startsWith(t.href + "/");
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition ${
                active ? "text-leaf" : "text-stone"
              }`}
            >
              <span className={`text-xl ${active ? "" : "grayscale opacity-60"}`}>
                {t.icon}
              </span>
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
