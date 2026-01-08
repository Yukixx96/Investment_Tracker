import { LS_KEY, DEFAULT_STATE } from "./config.js";

export function loadState(){
  try{
    const s = localStorage.getItem(LS_KEY);
    if(!s) return structuredClone(DEFAULT_STATE);
    const obj = JSON.parse(s);
    return normalizeState(obj);
  }catch{
    return structuredClone(DEFAULT_STATE);
  }
}

export function saveState(state){
  localStorage.setItem(LS_KEY, JSON.stringify(state));
}

export function resetState(){
  localStorage.removeItem(LS_KEY);
}

export function exportState(state){
  return JSON.stringify(state, null, 2);
}

export function importState(state, jsonText){
  const obj = JSON.parse(jsonText);
  const next = normalizeState(obj);
  state.monthlyCapYen = next.monthlyCapYen;
  state.unitMode = next.unitMode;
  state.txs = next.txs;
  return state;
}

function normalizeState(obj){
  const s = structuredClone(DEFAULT_STATE);
  s.monthlyCapYen = Number(obj?.monthlyCapYen ?? s.monthlyCapYen);
  s.unitMode = obj?.unitMode === "man" ? "man" : "yen";

  const txs = Array.isArray(obj?.txs) ? obj.txs : [];
  s.txs = txs.map(t => ({
    id: String(t.id || crypto.randomUUID()),
    date: String(t.date || ""),
    categoryKey: String(t.categoryKey || ""),
    ticker: String(t.ticker || ""),
    note: String(t.note || ""),
    amountYen: Number(t.amountYen || 0),
  })).filter(t => t.date && t.categoryKey && t.amountYen > 0);

  return s;
}
