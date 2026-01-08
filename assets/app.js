import { loadBudgets, saveBudgets, clearBudgets, DEFAULT_BUDGETS } from "./budgets.js";
import { loadState, saveState, clearState } from "./storage.js";
import { $, monthKey, escapeHtml, fmtMoney } from "./utils.js";

/* =========================
   State
   ========================= */
const defaultState = {
  monthlyCapYen: 200000, // 20万日元/月
  unitMode: "yen",
  txs: [], // { id, date, categoryKey, ticker, amountYen, note }
};

const state = loadState() ?? structuredClone(defaultState);
let budgets = loadBudgets();

/* =========================
   Init UI
   ========================= */
const today = new Date();
const ym = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

$("monthPicker").value = ym;
$("monthlyCap").value = state.monthlyCapYen;
$("unitMode").value = state.unitMode;
$("date").value =
  `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

function fmt(yen) {
  return fmtMoney(yen, state.unitMode);
}

/* =========================
   Category Select
   ========================= */
function renderCategorySelect() {
  const catSel = $("category");
  const prev = catSel.value;

  catSel.innerHTML = "";

  budgets.forEach((b) => {
    const op = document.createElement("option");
    op.value = b.key;
    op.textContent = b.name;
    catSel.appendChild(op);
  });

  // 尽量保持原选择；如果不存在则回退到第一项
  if (prev && budgets.some((b) => b.key === prev)) {
    catSel.value = prev;
  } else if (budgets[0]) {
    catSel.value = budgets[0].key;
  }
}

renderCategorySelect();

/* =========================
   Top Controls Events
   ========================= */
$("monthPicker").addEventListener("change", renderAll);

$("monthlyCap").addEventListener("change", () => {
  state.monthlyCapYen = Number($("monthlyCap").value || 0);
  saveState(state);
  renderAll();
});

$("unitMode").addEventListener("change", () => {
  state.unitMode = $("unitMode").value === "man" ? "man" : "yen";
  saveState(state);
  renderAll();
});

/* =========================
   Add Transaction
   ========================= */
$("btnAdd").addEventListener("click", () => {
  const date = $("date").value;
  const categoryKey = $("category").value;
  const ticker = $("ticker").value.trim();
  const note = $("note").value.trim();
  const amountYen = Number($("amount").value);

  if (!date) return alert("请选择日期");
  if (!categoryKey) return alert("请选择类别");
  if (!amountYen || amountYen <= 0) return alert("请输入正确金额（円）");

  const id = crypto?.randomUUID?.() ?? String(Date.now()) + Math.random();
  state.txs.push({ id, date, categoryKey, ticker, note, amountYen });

  saveState(state);

  $("ticker").value = "";
  $("amount").value = "";
  $("note").value = "";

  renderAll();
});

/* =========================
   Export / Import / Reset State
   ========================= */
$("btnExport").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `invest_backup_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
});

$("btnImport").addEventListener("click", () => $("fileInput").click());

$("fileInput").addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    const obj = JSON.parse(text);

    if (!obj || !Array.isArray(obj.txs)) throw new Error("bad format");

    state.monthlyCapYen = Number(obj.monthlyCapYen || state.monthlyCapYen);
    state.unitMode = obj.unitMode === "man" ? "man" : "yen";

    state.txs = obj.txs
      .map((t) => ({
        id: String(t.id || (crypto?.randomUUID?.() ?? Date.now())),
        date: String(t.date),
        categoryKey: String(t.categoryKey),
        ticker: String(t.ticker || ""),
        note: String(t.note || ""),
        amountYen: Number(t.amountYen || 0),
      }))
      .filter((t) => t.date && t.categoryKey && t.amountYen > 0);

    saveState(state);

    $("monthlyCap").value = state.monthlyCapYen;
    $("unitMode").value = state.unitMode;

    renderAll();
    alert("导入成功");
  } catch {
    alert("导入失败：请确认是本工具导出的 JSON 文件");
  } finally {
    e.target.value = "";
  }
});

$("btnReset").addEventListener("click", () => {
  if (!confirm("确定要清空所有数据吗？此操作不可恢复。建议先导出备份。")) return;
  clearState();
  location.reload();
});

/* =========================
   Budgets Editor
   ========================= */
function validateBudgetsOrAlert(list) {
  // 校验：key 不能为空、且唯一
  const keys = list.map((x) => String(x.key || "").trim()).filter(Boolean);
  const unique = new Set(keys);

  if (keys.length !== list.length || unique.size !== list.length) {
    alert("Key 必须唯一，且不能为空。");
    return false;
  }
  return true;
}

function renderBudgetsEditor() {
  const tb = $("tableBudgets")?.querySelector("tbody");
  if (!tb) return;

  tb.innerHTML = "";

  budgets.forEach((b, idx) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><input data-i="${idx}" data-f="key" value="${escapeHtml(b.key)}" /></td>
      <td><input data-i="${idx}" data-f="name" value="${escapeHtml(b.name)}" /></td>
      <td class="right"><input data-i="${idx}" data-f="monthlyMan" type="number" step="0.5" min="0" value="${b.monthlyMan}" /></td>
      <td class="right"><button class="danger" data-del="${idx}">删除</button></td>
    `;
    tb.appendChild(tr);
  });

  // 修改：保存 + 刷新
  tb.querySelectorAll("input[data-i][data-f]").forEach((inp) => {
    inp.addEventListener("change", () => {
      const i = Number(inp.getAttribute("data-i"));
      const f = inp.getAttribute("data-f");
      if (!Number.isInteger(i) || !f) return;

      const next = budgets.map((x) => ({ ...x }));

      if (f === "monthlyMan") next[i][f] = Number(inp.value || 0);
      else next[i][f] = String(inp.value || "").trim();

      if (!validateBudgetsOrAlert(next)) {
        renderBudgetsEditor();
        return;
      }

      budgets = saveBudgets(next);
      renderCategorySelect();
      renderAll();
      renderBudgetsEditor();
    });
  });

  // 删除
  tb.querySelectorAll("button[data-del]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const i = Number(btn.getAttribute("data-del"));
      if (!Number.isInteger(i)) return;

      const b = budgets[i];
      if (!confirm(`确定删除类别：${b?.name ?? ""}（${b?.key ?? ""}）？`)) return;

      const next = budgets.slice();
      next.splice(i, 1);

      budgets = saveBudgets(next);
      renderCategorySelect();
      renderAll();
      renderBudgetsEditor();
    });
  });
}

$("btnAddBudget")?.addEventListener("click", () => {
  const key = prompt("请输入新类别 Key（唯一，例如：JP_ETF）");
  if (!key) return;

  const k = key.trim();
  if (!k) return;

  if (budgets.some((b) => b.key === k)) {
    alert("Key 已存在，请换一个。");
    return;
  }

  const name = prompt("请输入显示名称（例如：日本ETF）") ?? "";
  const nm = name.trim() || k;

  const next = budgets.concat([{ key: k, name: nm, monthlyMan: 0 }]);

  budgets = saveBudgets(next);
  renderCategorySelect();
  renderAll();
  renderBudgetsEditor();
});

$("btnResetBudgets")?.addEventListener("click", () => {
  if (!confirm("确定恢复默认预算吗？（只影响预算配置，不影响历史记录）")) return;

  clearBudgets();
  budgets = structuredClone(DEFAULT_BUDGETS);
  budgets = saveBudgets(budgets);

  renderCategorySelect();
  renderAll();
  renderBudgetsEditor();
});

/* =========================
   Rendering
   ========================= */
function renderAll() {
  const curYM = $("monthPicker").value;

  const txs = state.txs
    .filter((t) => monthKey(t.date) === curYM)
    .sort((a, b) => a.date.localeCompare(b.date));

  // 汇总：按类别统计
  const catTotals = new Map();
  txs.forEach((t) => {
    catTotals.set(t.categoryKey, (catTotals.get(t.categoryKey) ?? 0) + t.amountYen);
  });

  const used = txs.reduce((s, t) => s + t.amountYen, 0);
  const cap = state.monthlyCapYen;
  const remain = cap - used;

  $("pillMonth").textContent = `月份：${curYM}`;
  $("pillCount").textContent = `记录：${txs.length} 条`;

  $("kpiUsed").textContent = fmt(used);
  $("kpiRemain").textContent = fmt(remain);
  $("kpiRemain").className = "v " + (remain < 0 ? "warn" : "ok");

  const rate = cap > 0 ? (used / cap) * 100 : 0;
  $("kpiRate").textContent = rate.toFixed(1) + "%";

  // 右侧：类别预算表
  const tbody = $("tableCat").querySelector("tbody");
  tbody.innerHTML = "";

  budgets.forEach((b) => {
    const budgetYen = b.monthlyMan * 10000;
    const catUsed = catTotals.get(b.key) ?? 0;
    const catRemain = budgetYen - catUsed;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(b.name)}</td>
      <td class="right">${fmt(budgetYen)}</td>
      <td class="right">${fmt(catUsed)}</td>
      <td class="right"><span class="${catRemain < 0 ? "warn" : "ok"}">${fmt(catRemain)}</span></td>
    `;
    tbody.appendChild(tr);
  });

  // 下方：交易列表
  const txBody = $("tableTx").querySelector("tbody");
  txBody.innerHTML = "";

  const catNameMap = new Map(budgets.map((b) => [b.key, b.name]));

  txs.forEach((t) => {
    const catName = catNameMap.get(t.categoryKey) ?? t.categoryKey;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${t.date}</td>
      <td>${escapeHtml(catName)}</td>
      <td>${escapeHtml(t.ticker)}</td>
      <td class="right">${fmt(t.amountYen)}</td>
      <td>${escapeHtml(t.note)}</td>
      <td class="right"><button data-id="${t.id}" class="danger">删除</button></td>
    `;
    txBody.appendChild(tr);
  });

  // 删除单条记录
  txBody.querySelectorAll("button[data-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      const idx = state.txs.findIndex((x) => x.id === id);
      if (idx < 0) return;

      state.txs.splice(idx, 1);
      saveState(state);
      renderAll();
    });
  });
}

/* =========================
   First Render
   ========================= */
renderAll();
renderBudgetsEditor();
