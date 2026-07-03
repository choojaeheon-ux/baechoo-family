import type { Transaction, Category, PnlClass } from "./types";
import { EXCLUDED_CAT_IDS, FIXED_CAT_IDS, SAVING_CAT_IDS } from "./types";

export function classifyTx(
  tx: Transaction,
  category: Category | undefined,
): PnlClass {
  if (EXCLUDED_CAT_IDS.includes(tx.categoryId)) return "excluded";
  if (category?.type === "income") return "revenue";
  if (tx.recurringId != null || FIXED_CAT_IDS.includes(tx.categoryId)) return "fixed";
  if (SAVING_CAT_IDS.includes(tx.categoryId)) return "saving";
  return "variable";
}
