"use client";

// 타임라인·간격 패턴에서 기록을 누르면 열리는 상세 시트 4종(스펙 §7).
// 원탭으로 비어 있게 만든 기록도 그대로 저장할 수 있어야 하므로 내용 필수 검사는 없다.
// 날짜만은 필수 — 빈 date는 NOT NULL 위반인데 sbUpsert가 에러를 삼켜 조용히 사라진다.
import { useState } from "react";
import { useData } from "@/lib/data-context";
import {
  STOOL_STATES,
  STOOL_STATE_LABEL,
  HEALTH_TYPE_LABEL,
  type BaechooHealth,
  type BaechooMeal,
  type BaechooStool,
  type BaechooWalk,
  type HealthType,
  type Stool,
  type StoolState,
} from "@/lib/types";
import { parseNames, joinNames } from "@/lib/mealNames";
import {
  KIND_COLOR,
  KIND_LABEL,
  dateOf,
  durationLabel,
  hhmmOf,
  localMs,
  type EventKind,
} from "@/lib/baechooEvents";
import { recentAmounts, walkTimes, defaultWalkEnd } from "@/lib/baechooQuick";
import { Sheet, Field, inputCls, PrimaryButton } from "@/components/budget/ui";
import CategorySelect from "../CategorySelect";
import WalkMap from "../WalkMap";
import { StoolEditor } from "../walk-forms";
import { DeleteButton } from "../forms";

// Sheet 제목은 문자열이라 종류색은 본문 맨 위 띠로 준다
function KindBar({ kind, text }: { kind: EventKind; text?: string }) {
  return (
    <div className="mb-4 flex items-center gap-2 px-1">
      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: KIND_COLOR[kind].face }} />
      <span className="text-[17px] font-semibold" style={{ color: KIND_COLOR[kind].text }}>
        {text ?? KIND_LABEL[kind]}
      </span>
    </div>
  );
}

// 버튼 묶음용 — Field(<label>)로 감싸면 라벨 클릭이 첫 버튼을 누른다
function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <p className="mb-1.5 px-1 text-[13px] font-medium text-stone">{label}</p>
      {children}
    </div>
  );
}

function Chips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={value === o.id}
          onClick={() => onChange(o.id)}
          className={`press rounded-full px-3.5 py-1.5 text-[14px] font-medium ${
            value === o.id ? "bg-ink text-white" : "bg-fill text-ink"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function DateTime({
  date,
  time,
  onDate,
  onTime,
  timeLabel = "시각",
}: {
  date: string;
  time: string;
  onDate: (v: string) => void;
  onTime: (v: string) => void;
  timeLabel?: string;
}) {
  return (
    <div className="flex gap-2">
      <div className="min-w-0 flex-1">
        <Field label="날짜">
          <input type="date" className={inputCls} value={date} onChange={(e) => onDate(e.target.value)} />
        </Field>
      </div>
      <div className="min-w-0 flex-1">
        <Field label={timeLabel}>
          <input type="time" className={inputCls} value={time} onChange={(e) => onTime(e.target.value)} />
        </Field>
      </div>
    </div>
  );
}

function Memo({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Field label="메모">
      <textarea
        className={inputCls + " min-h-16 resize-none"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}

/* ── 식사·간식 ── */
export function MealSheet({ meal, onClose }: { meal: BaechooMeal; onClose: () => void }) {
  const { baechooMeals, saveBaechooMeal, removeBaechooMeal } = useData();
  const isMeal = meal.mealType === "meal";
  const [date, setDate] = useState(meal.date);
  const [time, setTime] = useState(meal.time ?? "");
  const [content, setContent] = useState(meal.content);
  const [topping, setTopping] = useState(meal.topping ?? "");
  const [amount, setAmount] = useState(meal.amount ?? "");
  const [memo, setMemo] = useState(meal.memo ?? "");
  const recent = recentAmounts(baechooMeals, meal.mealType);

  async function save() {
    await saveBaechooMeal({
      ...meal,
      date,
      time: time || null,
      content: joinNames(parseNames(content)),
      topping: isMeal ? joinNames(parseNames(topping)) || null : null,
      amount: amount.trim() || null,
      memo: memo.trim() || null,
    });
    onClose();
  }

  return (
    <Sheet open onClose={onClose} title="기록 수정">
      <KindBar kind={meal.mealType} />
      <DateTime date={date} time={time} onDate={setDate} onTime={setTime} />
      <Group label={isMeal ? "사료" : "간식 종류"}>
        <CategorySelect group="food" value={content} onChange={setContent} multiple />
      </Group>
      {isMeal && (
        <Group label="토핑">
          <CategorySelect group="topping" value={topping} onChange={setTopping} multiple />
        </Group>
      )}
      <Group label="먹은 양">
        <input
          className={inputCls}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="예: 1/1, 다 먹음, 반만"
        />
        {recent.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {recent.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAmount(a)}
                className="press rounded-full bg-fill px-3 py-1.5 text-[14px] text-ink"
              >
                {a}
              </button>
            ))}
          </div>
        )}
      </Group>
      <Memo value={memo} onChange={setMemo} />
      <div className="mt-2">
        <PrimaryButton onClick={save} disabled={!date}>
          저장
        </PrimaryButton>
      </div>
      <DeleteButton
        onDelete={async () => {
          await removeBaechooMeal(meal.id);
          onClose();
        }}
      />
    </Sheet>
  );
}

/* ── 산책 ── */
export function WalkSheet({ walk, onClose }: { walk: BaechooWalk; onClose: () => void }) {
  const { saveBaechooWalk, removeBaechooWalk } = useData();
  const startMs = walk.startTime ? new Date(walk.startTime).getTime() : localMs(walk.date, "00:00");
  const [date, setDate] = useState(dateOf(startMs));
  const [start, setStart] = useState(hhmmOf(startMs));
  const [end, setEnd] = useState<string | null>(
    walk.durationSec > 0 ? hhmmOf(startMs + walk.durationSec * 1000) : null
  );
  const [km, setKm] = useState(walk.distanceM > 0 ? String(Math.round(walk.distanceM) / 1000) : "");
  const [stools, setStools] = useState<Stool[]>(walk.stools);
  const [memo, setMemo] = useState(walk.memo ?? "");

  const hasMap = walk.route.length > 0 || stools.some((s) => s.lat != null && s.lng != null);
  const valid = Boolean(date && start);
  const duration = valid && end ? walkTimes(date, start, end).durationSec : 0;

  async function save() {
    if (!valid) return;
    const dist = Number(km.replace(/[^0-9.]/g, ""));
    await saveBaechooWalk({
      ...walk,
      ...walkTimes(date, start, end),
      distanceM: Number.isFinite(dist) ? Math.round(dist * 1000) : 0,
      stools,
      memo: memo.trim() || null,
    });
    onClose();
  }

  return (
    <Sheet open onClose={onClose} title="기록 수정">
      <KindBar kind="walk" />
      <DateTime date={date} time={start} onDate={setDate} onTime={setStart} timeLabel="시작" />
      {end === null ? (
        <button
          type="button"
          disabled={!valid}
          onClick={() => setEnd(defaultWalkEnd(localMs(date, start), Date.now()))}
          className="press mb-4 w-full rounded-full bg-leaf-light py-2.5 text-[15px] font-semibold text-leaf-dark disabled:opacity-40"
        >
          + 끝난 시각
        </button>
      ) : (
        <Group label={`끝난 시각 · ${durationLabel(duration * 1000)}`}>
          <div className="flex items-center gap-2">
            <input
              type="time"
              className={inputCls + " min-w-0 flex-1"}
              value={end}
              onChange={(e) => setEnd(e.target.value || null)}
            />
            <button type="button" onClick={() => setEnd(null)} className="shrink-0 px-2 text-[14px] text-coral">
              지우기
            </button>
          </div>
        </Group>
      )}
      <Field label="거리 (km, 선택)">
        <input
          inputMode="decimal"
          className={inputCls}
          value={km}
          onChange={(e) => setKm(e.target.value)}
          placeholder="예: 1.2"
        />
      </Field>
      {hasMap && (
        <WalkMap
          route={walk.route}
          stools={stools}
          pawTrail
          className="mb-4 h-56 w-full overflow-hidden rounded-xl border border-line"
        />
      )}
      <Group label="산책 중 응가 (지난 기록)">
        <StoolEditor stools={stools} onChange={setStools} />
      </Group>
      <Memo value={memo} onChange={setMemo} />
      <div className="mt-2">
        <PrimaryButton onClick={save} disabled={!valid}>
          저장
        </PrimaryButton>
      </div>
      <DeleteButton
        onDelete={async () => {
          await removeBaechooWalk(walk.id);
          onClose();
        }}
      />
    </Sheet>
  );
}

/* ── 응가 ── */
export function StoolSheet({ stool, onClose }: { stool: BaechooStool; onClose: () => void }) {
  const { saveBaechooStool, removeBaechooStool } = useData();
  const [date, setDate] = useState(stool.date);
  const [time, setTime] = useState(stool.time ?? "");
  const [state, setState] = useState<StoolState>(stool.state);
  const [memo, setMemo] = useState(stool.memo ?? "");

  async function save() {
    await saveBaechooStool({ ...stool, date, time: time || null, state, memo: memo.trim() || null });
    onClose();
  }

  return (
    <Sheet open onClose={onClose} title="기록 수정">
      <KindBar kind="stool" />
      <DateTime date={date} time={time} onDate={setDate} onTime={setTime} />
      <Group label="상태">
        <Chips
          options={STOOL_STATES.map((s) => ({ id: s, label: STOOL_STATE_LABEL[s] }))}
          value={state}
          onChange={setState}
        />
      </Group>
      <Memo value={memo} onChange={setMemo} />
      <div className="mt-2">
        <PrimaryButton onClick={save} disabled={!date}>
          저장
        </PrimaryButton>
      </div>
      <DeleteButton
        onDelete={async () => {
          await removeBaechooStool(stool.id);
          onClose();
        }}
      />
    </Sheet>
  );
}

/* ── 기타 ── */
// 스펙 §7 순서. 예방접종은 예방접종 목록이 따로 있어 빼되, 옛 기록이 예방접종이면 보인다.
const ETC_TYPES: HealthType[] = ["dental", "medicine", "supplement", "symptom", "hospital", "note", "etc"];

export function EtcSheet({ health, onClose }: { health: BaechooHealth; onClose: () => void }) {
  const { saveBaechooHealth, removeBaechooHealth } = useData();
  const [date, setDate] = useState(health.date);
  const [time, setTime] = useState(health.time ?? "");
  const [healthType, setHealthType] = useState<HealthType>(health.healthType);
  const [title, setTitle] = useState(health.title);
  const [nextDate, setNextDate] = useState(health.nextDate ?? "");
  const [memo, setMemo] = useState(health.memo ?? "");
  const types = health.healthType === "vaccine" ? [...ETC_TYPES, "vaccine" as HealthType] : ETC_TYPES;

  async function save() {
    await saveBaechooHealth({
      ...health,
      date,
      time: time || null,
      healthType,
      title: title.trim(),
      nextDate: nextDate || null,
      memo: memo.trim() || null,
    });
    onClose();
  }

  return (
    <Sheet open onClose={onClose} title="기록 수정">
      <KindBar kind="etc" text={`기타 · ${HEALTH_TYPE_LABEL[healthType]}`} />
      <DateTime date={date} time={time} onDate={setDate} onTime={setTime} />
      <Group label="종류">
        <Chips
          options={types.map((t) => ({ id: t, label: HEALTH_TYPE_LABEL[t] }))}
          value={healthType}
          onChange={setHealthType}
        />
      </Group>
      <Field label="내용">
        <input
          className={inputCls}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="예: 칫솔질, 심장사상충 약"
        />
      </Field>
      <Field label="다음 예정일 (선택)">
        <input type="date" className={inputCls} value={nextDate} onChange={(e) => setNextDate(e.target.value)} />
      </Field>
      <Memo value={memo} onChange={setMemo} />
      <div className="mt-2">
        <PrimaryButton onClick={save} disabled={!date}>
          저장
        </PrimaryButton>
      </div>
      <DeleteButton
        onDelete={async () => {
          await removeBaechooHealth(health.id);
          onClose();
        }}
      />
    </Sheet>
  );
}
