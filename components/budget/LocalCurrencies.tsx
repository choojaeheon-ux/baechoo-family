"use client";

import { useState } from "react";
import { useData } from "@/lib/data-context";
import { monthTransactions } from "@/lib/compute";
import { won, ymLabel } from "@/lib/format";
import { Card, SectionTitle, Empty } from "./ui";
import { LocalCurrencyForm, AmountSheet, TransactionForm } from "./forms";
import type { LocalCurrency, Transaction } from "@/lib/types";

// 지역화폐 · 바우처 · 상품권 — 선불 잔액 관리.
// 충전은 자산 이동이라 거래를 만들지 않고 잔액만 올린다.
// 차감은 거래 입력에서 결제 수단으로 이 지역화폐를 고를 때 자동으로 일어난다.
export default function LocalCurrencies({ ym }: { ym: string }) {
  const { localCurrencies, transactions, categoryById, saveLocalCurrency } =
    useData();

  const [formOpen, setFormOpen] = useState(false);
  const [editLc, setEditLc] = useState<LocalCurrency | null>(null);
  const [chargeLc, setChargeLc] = useState<LocalCurrency | null>(null);
  const [editTxn, setEditTxn] = useState<Transaction | null>(null);

  const monthTxns = monthTransactions(transactions, ym);
  const usedThisMonth = (id: string) =>
    monthTxns
      .filter((t) => t.localCurrencyId === id && t.type === "expense")
      .reduce((s, t) => s + t.amount, 0);
  const txnsOf = (id: string) =>
    monthTxns
      .filter((t) => t.localCurrencyId === id)
      .sort(
        (a, b) =>
          b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)
      );

  return (
    <div className="space-y-1 pb-4">
      <SectionTitle
        right={
          <button
            onClick={() => {
              setEditLc(null);
              setFormOpen(true);
            }}
            className="text-xs font-semibold text-leaf"
          >
            + 추가
          </button>
        }
      >
        지역화폐 · 바우처 · 상품권
      </SectionTitle>

      {localCurrencies.length === 0 ? (
        <Card>
          <Empty>
            온누리상품권·경기지역화폐 등을 등록하면
            <br />
            내역 추가의 결제 수단에서 고를 수 있어요.
          </Empty>
        </Card>
      ) : (
        localCurrencies.map((lc) => {
          const used = usedThisMonth(lc.id);
          const rows = txnsOf(lc.id);
          return (
            <Card key={lc.id} className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <button
                  onClick={() => {
                    setEditLc(lc);
                    setFormOpen(true);
                  }}
                  className="min-w-0 text-left"
                >
                  <p className="truncate text-base font-bold text-ink">
                    🎟️ {lc.name}
                  </p>
                  <p className="mt-0.5 text-[11px] text-stone">
                    매월 충전 {won(lc.monthlyCharge)} · 수정하기
                  </p>
                </button>
                <div className="shrink-0 text-right">
                  <p className="text-[11px] text-stone">잔액(이월 포함)</p>
                  <p
                    className={`text-xl font-extrabold tabular ${
                      lc.balance < 0 ? "text-coral" : "text-leaf-dark"
                    }`}
                  >
                    {won(lc.balance)}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-cream px-3 py-2">
                <span className="text-xs text-stone">{ymLabel(ym)} 사용액</span>
                <span className="text-sm font-bold tabular text-ink">
                  {won(used)}
                </span>
              </div>

              <button
                onClick={() => setChargeLc(lc)}
                className="w-full rounded-lg bg-leaf py-2 text-sm font-semibold text-white active:scale-[0.98]"
              >
                + 충전
              </button>

              <div className="border-t border-line pt-2">
                <p className="mb-1 text-[11px] font-semibold text-stone">
                  {ymLabel(ym)} 사용 내역
                </p>
                {rows.length === 0 ? (
                  <p className="py-3 text-center text-xs text-stone">
                    이번 달 사용 내역이 없어요.
                  </p>
                ) : (
                  <div className="space-y-1">
                    {rows.map((t) => {
                      const cat = categoryById(t.categoryId);
                      return (
                        <button
                          key={t.id}
                          onClick={() => setEditTxn(t)}
                          className="flex w-full items-center gap-2 rounded-xl px-1 py-1.5 text-left active:bg-cream"
                        >
                          <span
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{ background: "var(--color-coral)" }}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-ink">
                              {t.merchant || t.memo || cat?.name || "내역"}
                            </p>
                            <p className="text-[11px] text-stone">
                              {Number(t.date.slice(5, 7))}.{Number(t.date.slice(8))} ·{" "}
                              {cat?.name}
                            </p>
                          </div>
                          <span className="shrink-0 text-sm font-bold tabular text-ink">
                            -{won(t.amount)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </Card>
          );
        })
      )}

      <p className="mt-3 px-1 text-center text-[11px] text-stone">
        내역 추가 → 결제 수단에서 지역화폐를 고르면 잔액이 자동 차감됩니다.
      </p>

      {formOpen && (
        <LocalCurrencyForm
          open={formOpen}
          onClose={() => setFormOpen(false)}
          initial={editLc ?? undefined}
        />
      )}
      <AmountSheet
        key={`charge-${chargeLc?.id ?? "none"}`}
        open={!!chargeLc}
        onClose={() => setChargeLc(null)}
        title={`${chargeLc?.name ?? ""} 충전`}
        label="충전 금액"
        defaultAmount={chargeLc?.monthlyCharge ?? 0}
        onConfirm={(amt) => {
          if (!chargeLc) return;
          saveLocalCurrency({ ...chargeLc, balance: chargeLc.balance + amt });
        }}
      />
      {editTxn && (
        <TransactionForm
          open={!!editTxn}
          onClose={() => setEditTxn(null)}
          initial={editTxn}
        />
      )}
    </div>
  );
}
