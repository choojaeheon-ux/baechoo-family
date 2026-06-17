"use client";

import { useEffect, useState } from "react";

const PIN_KEY = "baechoo-pin";
const SESSION_KEY = "baechoo-unlocked";
const PIN_LEN = 4;

type Phase = "loading" | "setup" | "confirm" | "locked" | "unlocked";

export default function PinGate({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [entry, setEntry] = useState("");
  const [firstPin, setFirstPin] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY) === "1") {
      setPhase("unlocked");
      return;
    }
    setPhase(localStorage.getItem(PIN_KEY) ? "locked" : "setup");
  }, []);

  function unlock() {
    sessionStorage.setItem(SESSION_KEY, "1");
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
    if (phase === "setup") {
      setFirstPin(pin);
      setEntry("");
      setPhase("confirm");
      return;
    }
    if (phase === "confirm") {
      if (pin === firstPin) {
        localStorage.setItem(PIN_KEY, pin);
        unlock();
      } else {
        setError("PIN이 일치하지 않아요. 다시 설정해 주세요.");
        setFirstPin("");
        setEntry("");
        setPhase("setup");
      }
      return;
    }
    if (phase === "locked") {
      if (pin === localStorage.getItem(PIN_KEY)) {
        setEntry("");
        unlock();
      } else {
        setError("PIN이 틀렸어요.");
        setEntry("");
      }
    }
  }

  if (phase === "loading") {
    return <div className="min-h-dvh bg-cream" />;
  }
  if (phase === "unlocked") return <>{children}</>;

  const title =
    phase === "setup"
      ? "사용할 PIN을 정해 주세요"
      : phase === "confirm"
        ? "PIN을 한 번 더 입력해 주세요"
        : "배추가족 잠금 해제";

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-gradient-to-b from-leaf to-leaf-dark px-8 text-white">
      <div className="mb-2 text-6xl">🥬</div>
      <h1 className="text-2xl font-bold tracking-tight">배추가족</h1>
      <p className="mt-1 mb-8 text-sm text-white/80">{title}</p>

      <div className="mb-2 flex gap-4">
        {Array.from({ length: PIN_LEN }).map((_, i) => (
          <span
            key={i}
            className={`h-4 w-4 rounded-full border-2 border-white/70 transition ${
              i < entry.length ? "bg-white" : "bg-transparent"
            }`}
          />
        ))}
      </div>
      <p className="mb-6 h-5 text-sm text-white/90">{error}</p>

      <div className="grid grid-cols-3 gap-4">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <KeyBtn key={d} onClick={() => press(d)}>
            {d}
          </KeyBtn>
        ))}
        <span />
        <KeyBtn onClick={() => press("0")}>0</KeyBtn>
        <KeyBtn onClick={back} subtle>
          ⌫
        </KeyBtn>
      </div>
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
      className={`h-16 w-16 rounded-full text-2xl font-semibold transition active:scale-90 ${
        subtle
          ? "text-white/80"
          : "bg-white/15 text-white hover:bg-white/25 active:bg-white/30"
      }`}
    >
      {children}
    </button>
  );
}
