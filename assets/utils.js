export const $ = (id) => document.getElementById(id);

export function monthKey(dateStr) {
  return dateStr.slice(0, 7); // YYYY-MM
}

export function escapeHtml(s) {
  return (s ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

export function fmtMoney(yen, unitMode) {
  if (unitMode === "man") {
    const v = yen / 10000;
    const isInt = Math.abs(v - Math.round(v)) < 1e-9;
    return (isInt ? v.toFixed(0) : v.toFixed(2)) + " 万";
  }
  return yen.toLocaleString("ja-JP") + " 円";
}
