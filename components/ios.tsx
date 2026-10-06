"use client";

import { useEffect, useRef, useState } from "react";
import { previewReadonly } from "@/lib/supabase";

// 동기화 부제 — 미리보기에서는 저장되지 않는다는 사실을 먼저 말한다
export function syncLabel(mode: string): string {
  if (previewReadonly) return "미리보기 · 저장되지 않음";
  return mode === "cloud" ? "클라우드 동기화 중" : "이 기기에 저장 중";
}

/* ── 큰 제목 내비게이션 ─────────────────────────────────────
   큰 제목은 내용과 함께 스크롤되어 바 아래로 사라지고, 사라지는 순간 바 가운데에
   작은 제목이 나타난다. 바 재질은 내용이 그 밑으로 들어갈 때만 깔린다.
   sticky가 페이지 전체 높이를 쓰도록 래퍼 없이 조각으로 렌더한다. */
export function LargeTitleHeader({
  title,
  subtitle,
  trailing,
  children,
}: {
  title: string;
  subtitle?: string;
  trailing?: React.ReactNode;
  children?: React.ReactNode; // 바에 붙어 따라오는 부속(세그먼트·월 이동)
}) {
  const titleRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    let raf = 0;
    const read = () => {
      raf = 0;
      const y = window.scrollY;
      const h = titleRef.current?.offsetHeight ?? 0;
      setScrolled(y > 1);
      setCollapsed(y >= h - 6);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(read);
    };
    raf = requestAnimationFrame(read);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  const hasAccessory = Boolean(children);
  const barEdge = scrolled && !(hasAccessory && collapsed);

  return (
    <>
      <div
        className="sticky top-0 z-30"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div
          aria-hidden
          className={`bar-material absolute inset-0 transition-opacity duration-200 ${
            scrolled ? "opacity-100" : "opacity-0"
          }`}
        />
        <div
          aria-hidden
          className={`scroll-edge pointer-events-none absolute inset-x-0 top-full h-4 transition-opacity duration-200 ${
            barEdge ? "opacity-100" : "opacity-0"
          }`}
        />
        <div className="relative flex h-11 items-center justify-end px-4">
          <span
            aria-hidden={!collapsed}
            className={`pointer-events-none absolute left-1/2 max-w-[60%] -translate-x-1/2 truncate text-[17px] font-semibold text-ink transition-[opacity,transform] duration-200 ${
              collapsed ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
            }`}
          >
            {title}
          </span>
          {trailing}
        </div>
      </div>

      <div ref={titleRef} className="px-5 pb-3">
        <h1 className="text-[34px] font-bold leading-[1.12] tracking-[-0.022em] text-ink">
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-[13px] text-stone">{subtitle}</p>}
      </div>

      {hasAccessory && (
        <div
          className="sticky z-20 px-4 pb-3 pt-1"
          style={{ top: "calc(44px + env(safe-area-inset-top))" }}
        >
          <div
            aria-hidden
            className={`bar-material absolute inset-0 transition-opacity duration-200 ${
              collapsed ? "opacity-100" : "opacity-0"
            }`}
          />
          <div
            aria-hidden
            className={`scroll-edge pointer-events-none absolute inset-x-0 top-full h-4 transition-opacity duration-200 ${
              collapsed ? "opacity-100" : "opacity-0"
            }`}
          />
          <div className="relative space-y-2.5">{children}</div>
        </div>
      )}
    </>
  );
}

/* ── 세그먼트 컨트롤 ───────────────────────────────────────
   손잡이는 스프링으로 미끄러지고(가로채기 가능한 CSS transition), 누르는 순간 살짝 눌린다. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (v: T) => void;
  label?: string;
}) {
  const idx = Math.max(
    0,
    options.findIndex((o) => o.id === value)
  );
  const n = options.length;
  return (
    <div
      role="tablist"
      aria-label={label}
      className="seg relative flex h-9 rounded-full bg-fill p-[3px]"
    >
      <span
        aria-hidden
        className="seg-thumb absolute bottom-[3px] left-[3px] top-[3px] rounded-full bg-card"
        style={{
          width: `calc((100% - 6px) / ${n})`,
          transform: `translateX(${idx * 100}%)`,
        }}
      />
      {options.map((o, i) => (
        <button
          key={o.id}
          type="button"
          role="tab"
          aria-selected={i === idx}
          onClick={() => onChange(o.id)}
          className={`relative min-w-0 flex-1 whitespace-nowrap rounded-full px-1 text-[13px] tracking-[-0.01em] text-ink transition-opacity active:opacity-60 ${
            i === idx ? "font-semibold" : "font-medium opacity-80"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// 떠 있는 원형 글래스 버튼(내비게이션 바 오른쪽)
export function GlassIconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="glass press flex h-9 w-9 items-center justify-center rounded-full text-ink"
    >
      {children}
    </button>
  );
}

/* ── 아이콘 (SF Symbols 형태를 24pt 격자에 옮김) ──────────── */
type IconProps = { filled?: boolean; className?: string };
const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function IconChecklist({ filled, className = "h-6 w-6" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      {filled ? (
        <>
          <circle cx="12" cy="12" r="9.6" fill="currentColor" />
          <path d="M7.9 12.3l2.8 2.8 5.4-5.6" {...stroke} stroke="#fff" strokeWidth={2.1} />
        </>
      ) : (
        <>
          <circle cx="12" cy="12" r="9" {...stroke} />
          <path d="M7.9 12.3l2.8 2.8 5.4-5.6" {...stroke} />
        </>
      )}
    </svg>
  );
}

export function IconWon({ filled, className = "h-6 w-6" }: IconProps) {
  const glyph = "M7.4 8.2l1.8 7.4 2.8-6.2 2.8 6.2 1.8-7.4M6.6 11h10.8M6.6 13.3h10.8";
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      {filled ? (
        <>
          <circle cx="12" cy="12" r="9.6" fill="currentColor" />
          <path d={glyph} {...stroke} stroke="#fff" strokeWidth={1.7} />
        </>
      ) : (
        <>
          <circle cx="12" cy="12" r="9" {...stroke} />
          <path d={glyph} {...stroke} strokeWidth={1.6} />
        </>
      )}
    </svg>
  );
}

export function IconChart({ filled, className = "h-6 w-6" }: IconProps) {
  const bars = [
    { x: 3.6, y: 12.5, h: 8 },
    { x: 9.9, y: 7.5, h: 13 },
    { x: 16.2, y: 3.5, h: 17 },
  ];
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      {bars.map((b) =>
        filled ? (
          <rect key={b.x} x={b.x} y={b.y} width="4.2" height={b.h} rx="1.4" fill="currentColor" />
        ) : (
          <rect key={b.x} x={b.x + 0.4} y={b.y + 0.4} width="3.4" height={b.h - 0.8} rx="1.1" {...stroke} strokeWidth={1.6} />
        )
      )}
    </svg>
  );
}

export function IconPaw({ filled, className = "h-6 w-6" }: IconProps) {
  const paint = filled ? { fill: "currentColor" } : { ...stroke, strokeWidth: 1.5 };
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <ellipse cx="5.6" cy="10.4" rx="1.9" ry="2.4" transform="rotate(-18 5.6 10.4)" {...paint} />
      <ellipse cx="9.4" cy="6.2" rx="2" ry="2.6" {...paint} />
      <ellipse cx="14.6" cy="6.2" rx="2" ry="2.6" {...paint} />
      <ellipse cx="18.4" cy="10.4" rx="1.9" ry="2.4" transform="rotate(18 18.4 10.4)" {...paint} />
      <path
        d="M12 11.4c-2.7 0-5.8 3.4-5.8 5.9 0 1.6 1.2 2.7 2.8 2.7 1.2 0 2-.6 3-.6s1.8.6 3 .6c1.6 0 2.8-1.1 2.8-2.7 0-2.5-3.1-5.9-5.8-5.9z"
        {...paint}
      />
    </svg>
  );
}

export function IconMoonStars({ filled, className = "h-6 w-6" }: IconProps) {
  const paint = filled ? { fill: "currentColor" } : { ...stroke, strokeWidth: 1.7 };
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M19.6 14.9A8.2 8.2 0 0 1 9.1 4.4 8.2 8.2 0 1 0 19.6 14.9z" {...paint} />
      <path
        d="M17.2 2.8l.75 1.75 1.75.75-1.75.75-.75 1.75-.75-1.75-1.75-.75 1.75-.75z"
        fill="currentColor"
      />
    </svg>
  );
}

export function IconTrash({ className = "h-[18px] w-[18px]" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M4.5 6.5h15M9.5 6.5V4.8c0-.7.5-1.2 1.2-1.2h2.6c.7 0 1.2.5 1.2 1.2v1.7M6.4 6.5l.9 12.3c.1 1 .9 1.7 1.9 1.7h5.6c1 0 1.8-.7 1.9-1.7l.9-12.3M10 10.5v6M14 10.5v6" {...stroke} strokeWidth={1.7} />
    </svg>
  );
}

export function IconSliders({ className = "h-[18px] w-[18px]" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M4 7h8.8M17.2 7H20M4 17h2.8M11.2 17H20" {...stroke} />
      <circle cx="15" cy="7" r="2.2" {...stroke} />
      <circle cx="9" cy="17" r="2.2" {...stroke} />
    </svg>
  );
}

export function IconChevron({
  dir,
  className = "h-5 w-5",
}: {
  dir: "left" | "right" | "down";
  className?: string;
}) {
  const d =
    dir === "left" ? "M14.5 5.5L8 12l6.5 6.5" : dir === "right" ? "M9.5 5.5L16 12l-6.5 6.5" : "M5.5 9.5L12 16l6.5-6.5";
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d={d} {...stroke} strokeWidth={2.2} />
    </svg>
  );
}

export function IconXmark({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" {...stroke} strokeWidth={2.6} />
    </svg>
  );
}

export function IconPlus({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M12 4.5v15M4.5 12h15" {...stroke} strokeWidth={2.4} />
    </svg>
  );
}

export function IconCheck({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M5 12.5l4.6 4.6L19 7.5" {...stroke} strokeWidth={3} />
    </svg>
  );
}
