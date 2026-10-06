"use client";

import { useMemo, useState } from "react";
import { dateOf, type EventSource } from "@/lib/baechooEvents";
import {
  minuteOfDay,
  patternItems,
  readPatternFilter,
  writePatternFilter,
  type KindFilter,
} from "@/lib/baechooPattern";
import { Segmented } from "@/components/ios";
import { useNow } from "../record/useNow";
import { useBaechooEvents } from "../record/useBaechooEvents";
import EventSheet from "../record/EventSheet";
import WalkAtlas from "../WalkAtlas";
import FilterBar from "./FilterBar";
import DayClock from "./DayClock";
import WeekColumns from "./WeekColumns";
import IntervalList from "./IntervalList";

type View = "day" | "week" | "interval";
const VIEWS: { id: View; label: string }[] = [
  { id: "day", label: "일과표" },
  { id: "week", label: "주간 패턴" },
  { id: "interval", label: "간격 패턴" },
];

export default function PatternTab() {
  const events = useBaechooEvents();
  const now = useNow();
  const [view, setView] = useState<View>("day");
  // PinGate가 클라이언트에서만 렌더하므로 첫 렌더에 기기 저장값을 읽어도 된다
  const [filter, setFilter] = useState<KindFilter>(() => readPatternFilter());
  const [open, setOpen] = useState<EventSource | null>(null);
  const [atlas, setAtlas] = useState(false);
  const items = useMemo(() => patternItems(events, filter), [events, filter]);
  const today = dateOf(now);
  const nowMin = minuteOfDay(now);

  function changeFilter(f: KindFilter) {
    setFilter(f);
    writePatternFilter(f);
  }

  return (
    <div className="pb-4">
      <Segmented label="패턴 보기" value={view} onChange={setView} options={VIEWS} />
      <div className="mt-4">
        <FilterBar filter={filter} onChange={changeFilter} />
      </div>
      <div className="mt-5">
        {view === "day" && <DayClock items={items} events={events} today={today} nowMin={nowMin} />}
        {view === "week" && <WeekColumns items={items} today={today} nowMin={nowMin} />}
        {view === "interval" && <IntervalList items={items} today={today} onOpen={setOpen} />}
      </div>
      <button
        type="button"
        onClick={() => setAtlas(true)}
        className="press mt-8 w-full rounded-full bg-card py-3 text-[15px] font-semibold text-ink"
      >
        대동여지도 보기
      </button>
      {open && (
        <EventSheet key={`${open.table}:${open.id}`} source={open} onClose={() => setOpen(null)} />
      )}
      {atlas && <WalkAtlas onClose={() => setAtlas(false)} />}
    </div>
  );
}
