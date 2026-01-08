// assets/budgets.js
// 预算/类别：默认 + 本地可编辑（LocalStorage）

const LS_BUDGET_KEY = "yuki_invest_tracker_budgets_v1";

// 默认预算：单位“万日元/月”
export const DEFAULT_BUDGETS = [
  { key: "NASDAQ",   name: "纳斯达克", monthlyMan: 5 },
  { key: "US_TECH",  name: "US科技",      monthlyMan: 4 },
  { key: "JP_HEAVY", name: "JP重工",      monthlyMan: 3 },
  { key: "JP_BANK",  name: "JP银行",      monthlyMan: 3 },
  { key: "JP_SEMI",  name: "JP半导体",      monthlyMan: 2 },
  { key: "JP_GAME",  name: "JP游戏",      monthlyMan: 1 },
  { key: "JP_RE",    name: "JP房地产",      monthlyMan: 1 },
  { key: "OTHER",    name: "其他",     monthlyMan: 1 },
];

export function normalizeBudgets(list) {
  const arr = Array.isArray(list) ? list : [];
  const cleaned = arr
    .map(x => ({
      key: String(x.key || "").trim(),
      name: String(x.name || "").trim(),
      monthlyMan: Number(x.monthlyMan ?? 0),
    }))
    .filter(x => x.key && x.name && Number.isFinite(x.monthlyMan) && x.monthlyMan >= 0);

  // 去重（按 key，保留靠前）
  const seen = new Set();
  const uniq = [];
  for (const b of cleaned) {
    if (seen.has(b.key)) continue;
    seen.add(b.key);
    uniq.push(b);
  }
  return uniq;
}

export function loadBudgets() {
  try {
    const s = localStorage.getItem(LS_BUDGET_KEY);
    if (!s) return structuredClone(DEFAULT_BUDGETS);
    const parsed = JSON.parse(s);
    const list = normalizeBudgets(parsed);
    return list.length ? list : structuredClone(DEFAULT_BUDGETS);
  } catch {
    return structuredClone(DEFAULT_BUDGETS);
  }
}

export function saveBudgets(budgets) {
  const list = normalizeBudgets(budgets);
  localStorage.setItem(LS_BUDGET_KEY, JSON.stringify(list));
  return list;
}

export function clearBudgets() {
  localStorage.removeItem(LS_BUDGET_KEY);
}
