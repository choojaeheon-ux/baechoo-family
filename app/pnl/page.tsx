"use client";

import { useState } from "react";
import Dashboard from "@/components/pnl/Dashboard";
import Manual from "@/components/pnl/Manual";

export default function PnlPage() {
  const [sub, setSub] = useState<"dashboard" | "manual">("dashboard");
  return (
    <main className="mx-auto w-full max-w-md px-4 pb-24 pt-4">
      <div className="mb-4 flex gap-1 rounded-xl bg-card p-1">
        {(["dashboard", "manual"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setSub(k)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
              sub === k ? "bg-leaf text-white" : "text-stone"
            }`}
          >
            {k === "dashboard" ? "대시보드" : "설명서"}
          </button>
        ))}
      </div>
      {sub === "dashboard" ? <Dashboard /> : <Manual />}
    </main>
  );
}
