"use client";

import { useEffect } from "react";
import { ymLabel, shiftMonth } from "@/lib/format";

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-line bg-card p-4 shadow-sm ${className}`}
    >
      {children}
    </div>
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
    <div className="mb-2 mt-5 flex items-center justify-between px-1">
      <h2 className="text-sm font-bold text-ink">{children}</h2>
      {right}
    </div>
  );
}

export function ProgressBar({
  value,
  max,
  color = "var(--color-leaf)",
  track = "var(--color-leaf-light)",
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
      className="h-2.5 w-full overflow-hidden rounded-full"
      style={{ background: track }}
    >
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${pct}%`, background: over ? "var(--color-coral)" : color }}
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
    <div className="flex items-center justify-center gap-3">
      <button
        onClick={() => onChange(shiftMonth(ym, -1))}
        className="flex h-8 w-8 items-center justify-center rounded-full text-stone hover:bg-leaf-light"
      >
        ‹
      </button>
      <span className="min-w-28 text-center text-base font-bold text-ink">
        {ymLabel(ym)}
      </span>
      <button
        onClick={() => onChange(shiftMonth(ym, 1))}
        className="flex h-8 w-8 items-center justify-center rounded-full text-stone hover:bg-leaf-light"
      >
        ›
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
    coral: "bg-coral-light text-coral",
    stone: "bg-line text-stone",
    gold: "bg-amber-100 text-amber-700",
    sky: "bg-sky-100 text-sky-700",
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="py-10 text-center text-sm text-stone">{children}</div>
  );
}

// 바텀시트 모달
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
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
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 mx-auto w-full max-w-md rounded-t-3xl bg-card p-5 pb-8 shadow-2xl">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line" />
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold text-ink">{title}</h3>
          <button onClick={onClose} className="text-xl text-stone">
            ✕
          </button>
        </div>
        <div className="max-h-[70dvh] overflow-y-auto">{children}</div>
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
    <label className="mb-3 block">
      <span className="mb-1 block text-xs font-semibold text-stone">{label}</span>
      {children}
    </label>
  );
}

export const inputCls =
  "w-full rounded-xl border border-line bg-cream px-3 py-2.5 text-ink outline-none focus:border-leaf";

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
      className="w-full rounded-xl bg-leaf py-3 text-center font-bold text-white transition active:scale-[0.98] disabled:opacity-40"
    >
      {children}
    </button>
  );
}
