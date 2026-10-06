"use client";

import { IconChevron } from "@/components/ios";

export default function Stepper({
  label,
  onPrev,
  onNext,
  nextDisabled,
}: {
  label: string;
  onPrev: () => void;
  onNext: () => void;
  nextDisabled: boolean;
}) {
  const btn = "press glass flex h-9 w-9 items-center justify-center rounded-full text-ink disabled:opacity-30";
  return (
    <div className="mt-3 flex items-center justify-center gap-4">
      <button type="button" aria-label="이전" onClick={onPrev} className={btn}>
        <IconChevron dir="left" />
      </button>
      <span className="min-w-[170px] text-center text-[15px] font-semibold text-ink">{label}</span>
      <button type="button" aria-label="다음" onClick={onNext} disabled={nextDisabled} className={btn}>
        <IconChevron dir="right" />
      </button>
    </div>
  );
}
