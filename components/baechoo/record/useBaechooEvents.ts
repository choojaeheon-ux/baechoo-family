"use client";

import { useMemo } from "react";
import { useData } from "@/lib/data-context";
import { toEvents, type BaechooEvent } from "@/lib/baechooEvents";

export function useBaechooEvents(): BaechooEvent[] {
  const { baechooMeals, baechooWalks, baechooStools, baechooHealth } = useData();
  return useMemo(
    () => toEvents(baechooMeals, baechooWalks, baechooStools, baechooHealth),
    [baechooMeals, baechooWalks, baechooStools, baechooHealth]
  );
}
