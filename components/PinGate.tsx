"use client";

import { useEffect, useState } from "react";

// 회사 캘린더 API 라우트 호출 시 헤더로도 전송 (서버 FAMILY_PIN env와 대조)
export const FAMILY_PIN = "1106";
const CORRECT_PIN = FAMILY_PIN;
const UNLOCKED_KEY = "baechoo-unlocked";
const PIN_LEN = 4;

type Phase = "loading" | "locked" | "unlocked";

export default function PinGate({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [entry, setEntry] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    // 한 번 잠금 해제하면 이 기기에서는 다시 묻지 않음
    if (localStorage.getItem(UNLOCKED_KEY) === "1") {
      setPhase("unlocked");
    } else {
      setPhase("locked");
    }
  }, []);

  function unlock() {
    localStorage.setItem(UNLOCKED_KEY, "1");
    setPhase("unlocked");
  }

  function press(d: string) {
    setError("");
    if (entry.length >= PIN_LEN) return;
    const next = entry + d;
    setEntry(next);
    if (next.length === PIN_LEN) setTimeout(() => submit(next), 120);
  }

  function back() {
    setError("");
    setEntry((e) => e.slice(0, -1));
  }

  function submit(pin: string) {
    if (pin === CORRECT_PIN) {
      setEntry("");
      unlock();
    } else {
      setError("비밀번호가 틀렸어요.");
      setEntry("");
    }
  }

  if (phase === "loading") {
    return <div className="min-h-dvh bg-cream" />;
  }
  if (phase === "unlocked") return <>{children}</>;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-cream px-8 text-ink">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/apple-icon-v2.png"
        alt=""
        className="mb-4 h-16 w-16 rounded-[16px] shadow-[0_4px_14px_rgba(0,0,0,0.12)]"
      />
      <h1 className="text-[22px] font-semibold tracking-[-0.02em]">배추가족</h1>
      <p className="mb-7 mt-1 text-[15px] text-stone">비밀번호를 입력해 주세요</p>

      <div className={`mb-3 flex gap-5 ${error ? "animate-[shake_380ms_ease-out]" : ""}`}>
        {Array.from({ length: PIN_LEN }).map((_, i) => (
          <span
            key={i}
            className={`h-[13px] w-[13px] rounded-full border-[1.5px] border-ink transition-colors duration-100 ${
              i < entry.length ? "bg-ink" : "bg-transparent"
            }`}
          />
        ))}
      </div>
      <p className="mb-8 h-5 text-[13px] text-coral">{error}</p>

      <div className="grid grid-cols-3 gap-x-6 gap-y-4">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <KeyBtn key={d} onClick={() => press(d)}>
            {d}
          </KeyBtn>
        ))}
        <span />
        <KeyBtn onClick={() => press("0")}>0</KeyBtn>
        <KeyBtn onClick={back} subtle>
          지우기
        </KeyBtn>
      </div>
      <style>{`@keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-10px)}40%{transform:translateX(8px)}60%{transform:translateX(-5px)}80%{transform:translateX(3px)}}`}</style>
    </div>
  );
}

function KeyBtn({
  children,
  onClick,
  subtle,
}: {
  children: React.ReactNode;
  onClick: () => void;
  subtle?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex h-[76px] w-[76px] items-center justify-center rounded-full transition-colors duration-75 ${
        subtle
          ? "text-[15px] text-ink active:opacity-50"
          : "bg-fill text-[32px] font-normal tabular text-ink active:bg-[rgba(118,118,128,0.3)]"
      }`}
    >
      {children}
    </button>
  );
}
