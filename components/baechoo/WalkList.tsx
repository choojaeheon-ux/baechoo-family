"use client";

import { useEffect, useMemo, useState } from "react";
import { useData } from "@/lib/data-context";
import { weekdayKo, currentYearMonth } from "@/lib/format";
import { formatDuration, formatDistance } from "@/lib/geo";
import { type BaechooWalk } from "@/lib/types";
import { Card, Empty, Pill } from "@/components/budget/ui";
import WalkMap from "./WalkMap";
import { WalkManualForm, WalkDetailSheet, startHHMM } from "./walk-forms";
import WalkTracker from "./WalkTracker";
import BaechooCalendar from "./BaechooCalendar";
import ViewToggle from "./ViewToggle";

// "6/18 (목)"
function dateLabel(iso: string): string {
  return `${Number(iso.slice(5, 7))}/${Number(iso.slice(8, 10))} (${weekdayKo(iso)})`;
}

function WalkCard({ r, onClick }: { r: BaechooWalk; onClick: () => void }) {
  return (
    <Card className="cursor-pointer active:scale-[0.99]">
      <div onClick={onClick}>
        <div className="flex items-center gap-2">
          {r.startTime && (
            <span className="text-xs text-stone">{startHHMM(r.startTime)}</span>
          )}
          <span className="text-sm font-semibold text-ink">
            {formatDuration(r.durationSec)}
          </span>
          <span className="text-xs text-stone">·</span>
          <span className="text-sm font-semibold text-ink">
            {formatDistance(r.distanceM)}
          </span>
          {r.stools.length > 0 && (
            <Pill tone="gold">응가 {r.stools.length}</Pill>
          )}
        </div>
        {r.memo && <p className="mt-1.5 text-xs text-stone">{r.memo}</p>}
        {r.route.length > 1 && (
          <WalkMap
            route={r.route}
            stools={r.stools}
            isStatic
            className="mt-2 h-28 w-full overflow-hidden rounded-xl border border-line"
          />
        )}
      </div>
    </Card>
  );
}

// [임시 디버그] localStorage에 유실된 산책이 남아있는지 확인용. 확인 끝나면 제거.
function DebugStorage() {
  const [open, setOpen] = useState(false);
  const [info, setInfo] = useState<string>("(불러오는 중…)");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      const lines: string[] = [];
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k) keys.push(k);
      }
      lines.push(`localStorage 키 ${keys.length}개:`);
      for (const k of keys) {
        const len = (localStorage.getItem(k) ?? "").length;
        lines.push(`  • ${k} (${len.toLocaleString()}자)`);
      }
      lines.push("");

      const raw = localStorage.getItem("baechoo-budget-v1");
      if (!raw) {
        lines.push('"baechoo-budget-v1" 키 없음 → 로컬에 저장된 데이터 없음');
      } else {
        const parsed = JSON.parse(raw);
        const walks = Array.isArray(parsed?.baechooWalks)
          ? parsed.baechooWalks
          : [];
        lines.push(`로컬 산책 기록: ${walks.length}건`);
        for (const w of walks) {
          lines.push(
            `  - ${w.date} / ${Math.round(w.distanceM ?? 0)}m / ${
              w.durationSec ?? 0
            }초 / 응가 ${(w.stools ?? []).length} / start=${w.startTime ?? "-"}`
          );
        }
      }
      setInfo(lines.join("\n"));
    } catch (e) {
      setInfo("읽기 오류: " + String(e));
    }
  }, [open]);

  return (
    <div className="rounded-xl border border-dashed border-coral bg-coral-light/30 p-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-xs font-bold text-coral"
      >
        {open ? "▼" : "▶"} [임시 디버그] 로컬 저장소 확인
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-white p-2 text-[11px] leading-relaxed text-ink">
            {info}
          </pre>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(info);
              setCopied(true);
            }}
            className="rounded-lg bg-coral px-3 py-1.5 text-xs font-semibold text-white"
          >
            {copied ? "복사됨" : "전체 복사"}
          </button>
        </div>
      )}
    </div>
  );
}

export default function WalkList() {
  const { baechooWalks } = useData();
  const [view, setView] = useState<"list" | "calendar">("list");
  const [ym, setYm] = useState(currentYearMonth());
  const [tracking, setTracking] = useState(false);
  const [manual, setManual] = useState(false);
  const [detail, setDetail] = useState<BaechooWalk | null>(null);

  const sorted = useMemo(
    () =>
      [...baechooWalks].sort((a, b) => {
        if (a.date !== b.date) return a.date < b.date ? 1 : -1;
        return (b.startTime ?? "") < (a.startTime ?? "") ? -1 : 1;
      }),
    [baechooWalks]
  );

  const groups = useMemo(() => {
    const m = new Map<string, BaechooWalk[]>();
    for (const r of sorted) m.set(r.date, [...(m.get(r.date) ?? []), r]);
    return [...m.entries()];
  }, [sorted]);

  const markedDates = useMemo(
    () => new Set(baechooWalks.map((r) => r.date)),
    [baechooWalks]
  );

  return (
    <div className="space-y-4">
      <DebugStorage />

      <div className="flex gap-2">
        <button
          onClick={() => setTracking(true)}
          className="flex-1 rounded-xl bg-leaf py-3 text-sm font-bold text-white active:scale-[0.99]"
        >
          산책 시작
        </button>
        <button
          onClick={() => setManual(true)}
          className="flex-1 rounded-xl border border-dashed border-leaf bg-leaf-light/40 py-3 text-sm font-bold text-leaf-dark active:scale-[0.99]"
        >
          수동 입력
        </button>
      </div>

      <ViewToggle view={view} onChange={setView} />

      {view === "calendar" ? (
        <BaechooCalendar
          ym={ym}
          onYmChange={setYm}
          markedDates={markedDates}
          renderDay={(iso) => {
            const items = sorted.filter((r) => r.date === iso);
            if (items.length === 0)
              return <Empty>이 날은 산책 기록이 없어요.</Empty>;
            return (
              <div className="space-y-2">
                {items.map((r) => (
                  <WalkCard key={r.id} r={r} onClick={() => setDetail(r)} />
                ))}
              </div>
            );
          }}
        />
      ) : groups.length === 0 ? (
        <Empty>아직 산책 기록이 없어요. 위에서 산책을 시작해 보세요.</Empty>
      ) : (
        groups.map(([date, items]) => (
          <div key={date}>
            <p className="mb-1.5 px-1 text-xs font-bold text-stone">
              {dateLabel(date)}
            </p>
            <div className="space-y-2">
              {items.map((r) => (
                <WalkCard key={r.id} r={r} onClick={() => setDetail(r)} />
              ))}
            </div>
          </div>
        ))
      )}

      {tracking && <WalkTracker onClose={() => setTracking(false)} />}
      {manual && (
        <WalkManualForm open onClose={() => setManual(false)} />
      )}
      {detail && (
        <WalkDetailSheet
          key={detail.id}
          open
          onClose={() => setDetail(null)}
          walk={detail}
        />
      )}
    </div>
  );
}
