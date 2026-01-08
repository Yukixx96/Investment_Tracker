export const LS_KEY = "yuki_invest_tracker_v2";

// 你的预算配置（按你最新表：单位“万日元/月”）
// 存储时统一换算为 yen：monthlyMan * 10000
export const BUDGETS = [
  { key:"NASDAQ",  name:"111",     monthlyMan: 5 },
  { key:"US_TECH", name:"222", monthlyMan: 4 },
  { key:"JP_HEAVY",name:"333",   monthlyMan: 3 },
  { key:"JP_BANK", name:"444",     monthlyMan: 3 },
  { key:"JP_SEMI", name:"555",   monthlyMan: 2 },
  { key:"JP_GAME", name:"666", monthlyMan: 1 },
  { key:"JP_RE",   name:"777",   monthlyMan: 1 },
  { key:"OTHER",   name:"其他",         monthlyMan: 1 },
];

export const DEFAULT_STATE = {
  monthlyCapYen: 200000, // 20万日元/月
  unitMode: "yen",       // "yen" | "man"
  txs: []                // {id, date, categoryKey, ticker, amountYen, note}
};
