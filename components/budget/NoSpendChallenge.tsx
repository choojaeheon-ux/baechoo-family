"use client";

import { useEffect, useState } from "react";
import { useData } from "@/lib/data-context";
import { noSpendInfo } from "@/lib/compute";
import { currentYearMonth } from "@/lib/format";
import { Card, SectionTitle, Empty, ProgressBar } from "./ui";
import { RewardRuleForm } from "./forms";
import type { RewardRule } from "@/lib/types";

// 무지출 챌린지 + 쿠폰함 — 원래 캘린더 탭에 있던 블록을 대시보드 하단으로 옮겼다.
export default function NoSpendChallenge({ ym }: { ym: string }) {
  const { transactions, rewardRules, coupons, saveCoupon } = useData();
  const [ruleOpen, setRuleOpen] = useState(false);
  const [editRule, setEditRule] = useState<RewardRule | null>(null);

  const noSpend = noSpendInfo(transactions, ym);
  const monthCoupons = coupons.filter((c) => c.earnedYearMonth === ym);

  // 달성 시 쿠폰 자동 발급 (이번 달, 규칙별 1회)
  useEffect(() => {
    if (ym !== currentYearMonth()) return;
    for (const rule of rewardRules) {
      // 결정적 ID로 중복 발급 방지 (StrictMode 이중 호출·동시성 안전)
      const couponId = `cpn-${rule.id}-${ym}`;
      if (noSpend.count >= rule.days && !coupons.some((c) => c.id === couponId)) {
        saveCoupon({
          id: couponId,
          ruleId: rule.id,
          name: rule.name,
          earnedYearMonth: ym,
          used: false,
        });
      }
    }
  }, [noSpend.count, rewardRules, coupons, ym, saveCoupon]);

  return (
    <>
      <SectionTitle
        right={
          <button
            onClick={() => {
              setEditRule(null);
              setRuleOpen(true);
            }}
            className="text-xs font-semibold text-leaf"
          >
            + 보상 규칙
          </button>
        }
      >
        무지출 챌린지
      </SectionTitle>
      <Card>
        <div className="mb-3 flex items-center justify-around text-center">
          <div>
            <p className="text-3xl font-extrabold tabular text-leaf-dark">
              {noSpend.count}
              <span className="text-base font-bold text-stone">일</span>
            </p>
            <p className="text-[11px] text-stone">이번 달 무지출</p>
          </div>
          <div className="h-10 w-px bg-line" />
          <div>
            <p className="text-3xl font-extrabold tabular text-leaf">
              {noSpend.streak}
              <span className="text-base font-bold text-stone">일</span>
            </p>
            <p className="text-[11px] text-stone">연속 무지출🔥</p>
          </div>
        </div>

        {rewardRules.length === 0 ? (
          <Empty>
            &lsquo;+ 보상 규칙&rsquo;으로 목표를 만들어 보세요.
            <br />
            예: 무지출 5일 → 배달 1회권
          </Empty>
        ) : (
          <div className="space-y-3 border-t border-line pt-3">
            {[...rewardRules]
              .sort((a, b) => a.days - b.days)
              .map((rule) => {
                const achieved = noSpend.count >= rule.days;
                return (
                  <button
                    key={rule.id}
                    onClick={() => {
                      setEditRule(rule);
                      setRuleOpen(true);
                    }}
                    className="block w-full text-left"
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-sm font-semibold text-ink">
                        🎁 {rule.name}
                      </span>
                      <span
                        className={`text-xs font-bold ${
                          achieved ? "text-leaf-dark" : "text-stone"
                        }`}
                      >
                        {achieved ? "달성!" : `${noSpend.count}/${rule.days}일`}
                      </span>
                    </div>
                    <ProgressBar value={noSpend.count} max={rule.days} />
                  </button>
                );
              })}
          </div>
        )}
      </Card>

      {/* 쿠폰함 */}
      {monthCoupons.length > 0 && (
        <>
          <SectionTitle>쿠폰함</SectionTitle>
          <Card className="space-y-2">
            {monthCoupons.map((c) => (
              <div
                key={c.id}
                className={`flex items-center gap-3 rounded-xl border border-dashed p-3 ${
                  c.used
                    ? "border-line bg-cream opacity-60"
                    : "border-leaf bg-leaf-light"
                }`}
              >
                <span className="text-2xl">🎟️</span>
                <div className="flex-1">
                  <p
                    className={`text-sm font-bold ${
                      c.used ? "text-stone line-through" : "text-leaf-dark"
                    }`}
                  >
                    {c.name}
                  </p>
                  <p className="text-[11px] text-stone">무지출 챌린지 보상</p>
                </div>
                {c.used ? (
                  <button
                    onClick={() => saveCoupon({ ...c, used: false })}
                    className="text-xs text-stone"
                  >
                    되돌리기
                  </button>
                ) : (
                  <button
                    onClick={() => saveCoupon({ ...c, used: true })}
                    className="rounded-lg bg-leaf px-3 py-1.5 text-xs font-semibold text-white active:scale-95"
                  >
                    사용
                  </button>
                )}
              </div>
            ))}
          </Card>
        </>
      )}

      {ruleOpen && (
        <RewardRuleForm
          open={ruleOpen}
          onClose={() => setRuleOpen(false)}
          initial={editRule ?? undefined}
        />
      )}
    </>
  );
}
