"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ymLabel, shiftMonth } from "@/lib/format";
import { IconChevron, IconXmark } from "@/components/ios";

// 인셋 그룹 카드 — 테두리·그림자 없이 회색 바탕 위 흰 면으로만 구분한다
export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-[22px] bg-card p-4 ${className}`}>{children}</div>
  );
}

export function SectionTitle({
  children,
  right,
}: {
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="mb-2 mt-7 flex items-end justify-between px-1 first:mt-3">
      <h2 className="text-[20px] font-bold leading-tight tracking-[-0.02em] text-ink">
        {children}
      </h2>
      {right}
    </div>
  );
}

export function ProgressBar({
  value,
  max,
  color = "var(--color-sprout)",
  track = "var(--color-fill)",
}: {
  value: number;
  max: number;
  color?: string;
  track?: string;
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const over = max > 0 && value > max;
  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full"
      style={{ background: track }}
    >
      <div
        className="h-full rounded-full transition-[width] duration-500"
        style={{ width: `${pct}%`, background: over ? "var(--color-coral)" : color }}
      />
    </div>
  );
}

// 예산 소진률 막대 — 막대 가득 = 100% 소진. 100% 이하 초록 / 초과 빨강, 이 두 색만 쓴다.
export function BurnBar({ pct, height = "h-2" }: { pct: number; height?: string }) {
  const over = pct > 100;
  const width = Math.max(Math.min(pct, 100), 0);
  return (
    <div
      className={`${height} w-full overflow-hidden rounded-full`}
      style={{ background: "var(--color-fill)" }}
    >
      <div
        className="h-full rounded-full transition-[width] duration-500"
        style={{
          width: `${width}%`,
          background: over ? "var(--color-coral)" : "var(--color-sprout)",
        }}
      />
    </div>
  );
}

export function MonthSwitcher({
  ym,
  onChange,
}: {
  ym: string;
  onChange: (ym: string) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <button
        onClick={() => onChange(shiftMonth(ym, -1))}
        aria-label="이전 달"
        className="press press-dim flex h-9 w-9 items-center justify-center rounded-full text-leaf"
      >
        <IconChevron dir="left" />
      </button>
      <span className="text-[17px] font-semibold tracking-[-0.01em] text-ink tabular">
        {ymLabel(ym)}
      </span>
      <button
        onClick={() => onChange(shiftMonth(ym, 1))}
        aria-label="다음 달"
        className="press press-dim flex h-9 w-9 items-center justify-center rounded-full text-leaf"
      >
        <IconChevron dir="right" />
      </button>
    </div>
  );
}

export function Pill({
  children,
  tone = "leaf",
}: {
  children: React.ReactNode;
  tone?: "leaf" | "coral" | "stone" | "gold" | "sky";
}) {
  const tones: Record<string, string> = {
    leaf: "bg-leaf-light text-leaf-dark",
    coral: "bg-coral-light text-[#d70015]",
    stone: "bg-fill text-stone",
    gold: "bg-[#fff1dc] text-[#c35f00]",
    sky: "bg-[#e3efff] text-[#0060d6]",
  };
  return (
    <span
      className={`shrink-0 whitespace-nowrap rounded-full px-2 py-[3px] text-[11px] font-semibold leading-none ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

// 접었다 펴는 한 줄 — 관리 목록이 아래로 길게 늘어지지 않도록 묶는다
export function Accordion({
  label,
  count,
  children,
}: {
  label: React.ReactNode;
  count: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-separator last:border-b-0">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex min-h-11 w-full items-center gap-2 py-2 text-left"
      >
        <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-ink">
          {label}
        </span>
        <span className="shrink-0 text-[15px] text-stone tabular">{count}</span>
        <span
          className={`text-[#c4c4c7] transition-transform duration-300 ${
            open ? "rotate-90" : ""
          }`}
        >
          <IconChevron dir="right" className="h-4 w-4" />
        </span>
      </button>
      {open && <div className="pb-3">{children}</div>}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="py-10 text-center text-[15px] leading-relaxed text-stone">
      {children}
    </div>
  );
}

/* ── 바텀시트 ───────────────────────────────────────────────
   움직임은 CSS 지속시간이 아니라 스프링 상태(x·v)로 굴린다 — 그래야 올라오는 도중에
   잡아 끌 수 있고, 손을 뗀 속도를 그대로 이어받아 닫히거나 제자리로 돌아온다.
   닫힐 때 부모가 시트를 바로 언마운트해도 퇴장이 보이도록, 마지막 화면을 복제한
   유령이 남은 거리를 마저 내려간다. */

type SpringState = { x: number; v: number; raf: number };

function springTo(
  s: SpringState,
  target: number,
  response: number,
  damping: number,
  apply: (x: number) => void,
  done?: () => void
) {
  cancelAnimationFrame(s.raf);
  const k = (2 * Math.PI / response) ** 2;
  const c = (4 * Math.PI * damping) / response;
  let last = performance.now();
  const step = (now: number) => {
    const dt = Math.min((now - last) / 1000, 1 / 30);
    last = now;
    const h = dt / 4;
    for (let i = 0; i < 4; i++) {
      s.v += (-k * (s.x - target) - c * s.v) * h;
      s.x += s.v * h;
    }
    if (Math.abs(s.x - target) < 0.5 && Math.abs(s.v) < 20) {
      s.x = target;
      s.v = 0;
      apply(target);
      done?.();
      return;
    }
    apply(s.x);
    s.raf = requestAnimationFrame(step);
  };
  s.raf = requestAnimationFrame(step);
}

// 경계 너머로 끌면 점점 덜 따라온다
const rubberband = (o: number, d: number, c = 0.55) => (o * d * c) / (d + c * o);

// Apple 모멘텀 투영 — 손을 뗀 속도로 멈출 위치를 내다본다
const project = (v: number, rate = 0.998) => ((v / 1000) * rate) / (1 - rate);

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// footer를 주면 시트가 화면 높이까지 커지고, footer(저장 버튼 등)는 스크롤과 무관하게 하단에 고정된다
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  if (!open) return null;
  return (
    <SheetPanel onClose={onClose} title={title} footer={footer}>
      {children}
    </SheetPanel>
  );
}

function SheetPanel({
  onClose,
  title,
  children,
  footer,
}: {
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const dimRef = useRef<HTMLDivElement>(null);
  const spring = useRef<SpringState>({ x: 0, v: 0, raf: 0 });
  const height = useRef(1);
  const mounted = useRef(false);
  const justDragged = useRef(false);
  const drag = useRef<{
    id: number;
    y0: number;
    base: number;
    active: boolean;
    samples: { t: number; y: number }[];
  } | null>(null);

  const paint = useCallback((panel: HTMLElement | null, dim: HTMLElement | null, x: number, h: number) => {
    if (panel) panel.style.transform = `translate3d(0, ${x}px, 0)`;
    if (dim) dim.style.opacity = String(Math.max(0, Math.min(1, 1 - x / h)));
  }, []);
  const apply = useCallback(
    (x: number) => paint(panelRef.current, dimRef.current, x, height.current),
    [paint]
  );

  useLayoutEffect(() => {
    mounted.current = true;
    const s = spring.current;
    const root = rootRef.current;
    height.current = panelRef.current?.offsetHeight || 1;
    const reduce = prefersReducedMotion();
    if (reduce) {
      s.x = 0;
      apply(0);
      root?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 180, easing: "ease-out" });
    } else {
      s.x = height.current + 24;
      s.v = 0;
      apply(s.x);
      springTo(s, 0, 0.38, 1, apply);
    }
    return () => {
      mounted.current = false;
      cancelAnimationFrame(s.raf);
      if (!root) return;
      const h = height.current;
      const from = { x: s.x, v: Math.max(s.v, 0) };
      // 개발 모드(StrictMode)의 가짜 언마운트에서는 DOM이 그대로 붙어 있다 — 그때는 유령을 만들지 않는다
      queueMicrotask(() => {
        if (root.isConnected) return;
        const ghost = root.cloneNode(true) as HTMLElement;
        ghost.style.pointerEvents = "none";
        ghost.removeAttribute("role");
        document.body.appendChild(ghost);
        const gp = ghost.querySelector<HTMLElement>("[data-sheet-panel]");
        const gd = ghost.querySelector<HTMLElement>("[data-sheet-dim]");
        if (reduce) {
          ghost.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160 }).onfinish = () =>
            ghost.remove();
          return;
        }
        const gs: SpringState = { x: from.x, v: from.v, raf: 0 };
        springTo(gs, h + 24, 0.3, 1, (x) => paint(gp, gd, x, h), () => ghost.remove());
      });
    };
  }, [apply, paint]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    drag.current = {
      id: e.pointerId,
      y0: e.clientY,
      base: spring.current.x,
      active: false,
      samples: [{ t: e.timeStamp, y: e.clientY }],
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    if (!d.active) {
      if (Math.abs(e.clientY - d.y0) < 6) return; // 탭과 끌기를 가르는 여유
      d.active = true;
      cancelAnimationFrame(spring.current.raf); // 움직이는 도중이면 그 자리에서 잡는다
      d.base = spring.current.x;
      d.y0 = e.clientY;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }
    const raw = d.base + (e.clientY - d.y0);
    const x = raw < 0 ? -rubberband(-raw, height.current) : raw;
    spring.current.x = x;
    apply(x);
    d.samples.push({ t: e.timeStamp, y: e.clientY });
    if (d.samples.length > 6) d.samples.shift();
  };

  const onPointerEnd = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    if (!d.active) return;
    justDragged.current = true;
    setTimeout(() => (justDragged.current = false), 0);
    const a = d.samples[0];
    const b = d.samples[d.samples.length - 1];
    const dt = (b.t - a.t) / 1000;
    const v = dt > 0 ? (b.y - a.y) / dt : 0;
    const s = spring.current;
    s.v = v;
    if (v >= 0 && s.x + project(v) > height.current * 0.5) {
      onClose();
      // 부모가 닫지 않았으면 제자리로
      setTimeout(() => {
        if (mounted.current) springTo(s, 0, 0.3, 0.8, apply);
      }, 50);
    } else {
      springTo(s, 0, 0.3, 0.8, apply); // 손의 속도가 실린 복귀라 약간 튄다
    }
  };

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-end justify-center"
    >
      <div
        ref={dimRef}
        data-sheet-dim
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        data-sheet-panel
        className={`relative z-10 w-[calc(100%-16px)] min-w-0 max-w-[432px] overflow-hidden rounded-[32px] bg-card shadow-[0_24px_64px_rgba(0,0,0,0.22)] will-change-transform ${
          footer ? "flex flex-col" : ""
        }`}
        style={{
          marginBottom: "calc(env(safe-area-inset-bottom, 0px) + 8px)",
          // 위로는 상태 표시줄 아래 12px 틈까지 — 넘치면 본문만 줄어 스크롤되고 footer는 남는다
          maxHeight: footer
            ? "calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 20px)"
            : undefined,
        }}
      >
        <div
          className="shrink-0 cursor-grab touch-none select-none px-3 pb-1 pt-2"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          onClickCapture={(e) => {
            if (justDragged.current) {
              e.preventDefault();
              e.stopPropagation();
            }
          }}
        >
          <div className="mx-auto h-[5px] w-9 rounded-full bg-[rgba(60,60,67,0.28)]" />
          <div className="mt-1.5 grid grid-cols-[36px_1fr_36px] items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              aria-label="닫기"
              className="press flex h-9 w-9 items-center justify-center rounded-full bg-fill text-ink/80"
            >
              <IconXmark />
            </button>
            <h3 className="truncate text-center text-[17px] font-semibold tracking-[-0.01em] text-ink">
              {title}
            </h3>
            <span />
          </div>
        </div>
        <div
          className={`overflow-y-auto overflow-x-hidden overscroll-contain px-5 pb-6 pt-3 ${
            footer ? "min-h-0" : "max-h-[70dvh]"
          }`}
        >
          {children}
        </div>
        {footer && <div className="shrink-0 border-t border-line px-5 pb-4 pt-3">{footer}</div>}
      </div>
    </div>
  );
}

// 폼 인풋들
export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="mb-4 block">
      <span className="mb-1.5 block px-1 text-[13px] font-medium text-stone">{label}</span>
      {children}
    </label>
  );
}

export const inputCls =
  "w-full rounded-[12px] bg-fill px-3.5 py-3 text-ink outline-none transition-shadow placeholder:text-[rgba(60,60,67,0.45)] focus:shadow-[inset_0_0_0_1.5px_var(--color-leaf)]";

export function PrimaryButton({
  children,
  onClick,
  type = "button",
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="press h-[50px] w-full rounded-full bg-leaf text-center text-[17px] font-semibold text-white disabled:opacity-35"
    >
      {children}
    </button>
  );
}
