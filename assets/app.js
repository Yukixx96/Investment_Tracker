import { BUDGETS } from "./budgets.js";
import { loadState, saveState, clearState } from "./storage.js";
import { $, monthKey, escapeHtml, fmtMoney } from "./utils.js";

const defaultState = {
  monthlyCapYen: 200000, // 20万日元/月
  unitMode: "yen",
  txs: [], // {id, date, categoryKey, ticker, amountYen, note}
  budgets: structuredClone(BUDGETS)
};

const state = loadState() ?? structuredClone(defaultState);
state.budgets = normalizeBudgets(state.budgets ?? BUDGETS);

// init UI
const today = new Date();
const ym = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}`;

$("monthPicker").value = ym;
$("monthlyCap").value = state.monthlyCapYen;
$("unitMode").value = state.unitMode;

$("date").value = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;

// category select
const catSel = $("category");
renderCategoryOptions();

// events
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

$("btnAdd").addEventListener("click", () => {
  const date = $("date").value;
  const categoryKey = $("category").value;
  const ticker = $("ticker").value.trim();
  const note = $("note").value.trim();
  const amountYen = Number($("amount").value);

  if (!date) return alert("请选择日期");
  if (!categoryKey) return alert("请选择类别");
  if (!amountYen || amountYen <= 0) return alert("请输入正确金额（円）");

  const id = (crypto?.randomUUID?.() ?? String(Date.now()) + Math.random());
  state.txs.push({ id, date, categoryKey, ticker, note, amountYen });
  saveState(state);

  $("ticker").value = "";
  $("amount").value = "";
  $("note").value = "";
  renderAll();
});

$("btnExport").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], {type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `invest_backup_${new Date().toISOString().slice(0,10)}.json`;
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
    state.unitMode = (obj.unitMode === "man") ? "man" : "yen";
    if (obj.budgets) {
      state.budgets = normalizeBudgets(obj.budgets);
    }
    state.txs = obj.txs.map(t => ({
      id: String(t.id || (crypto?.randomUUID?.() ?? Date.now())),
      date: String(t.date),
      categoryKey: String(t.categoryKey),
      ticker: String(t.ticker || ""),
      note: String(t.note || ""),
      amountYen: Number(t.amountYen || 0),
    })).filter(t => t.date && t.categoryKey && t.amountYen > 0);

    saveState(state);
    $("monthlyCap").value = state.monthlyCapYen;
    $("unitMode").value = state.unitMode;
    renderCategoryOptions();
    renderBudgetEditor();
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

// budget editor
const budgetForm = {
  key: $("budgetKey"),
  name: $("budgetName"),
  monthly: $("budgetMonthly"),
  editingIndex: null
};

$("btnSaveBudget").addEventListener("click", () => {
  const key = budgetForm.key.value.trim();
  const name = budgetForm.name.value.trim();
  const monthlyMan = Number(budgetForm.monthly.value);

  if (!key) return alert("请输入类别代码");
  if (!name) return alert("请输入类别名称");
  if (!Number.isFinite(monthlyMan) || monthlyMan < 0) return alert("请输入正确的预算金额");

  const existingIndex = state.budgets.findIndex((b, i) => b.key === key && i !== budgetForm.editingIndex);
  if (existingIndex >= 0) return alert("类别代码必须唯一");

  if (budgetForm.editingIndex === null) {
    state.budgets.push({ key, name, monthlyMan });
  } else {
    const target = state.budgets[budgetForm.editingIndex];
    const prevKey = target.key;
    target.key = key;
    target.name = name;
    target.monthlyMan = monthlyMan;
    if (prevKey !== key) {
      state.txs.forEach(t => {
        if (t.categoryKey === prevKey) t.categoryKey = key;
      });
    }
  }

  saveState(state);
  clearBudgetForm();
  renderBudgetEditor();
  renderCategoryOptions();
  renderAll();
});

$("btnCancelBudget").addEventListener("click", () => {
  clearBudgetForm();
});

function normalizeBudgets(raw) {
  if (!Array.isArray(raw)) return structuredClone(BUDGETS);
  const seen = new Set();
  const cleaned = [];
  raw.forEach((b, idx) => {
    const key = String(b?.key ?? "").trim() || `CAT_${idx + 1}`;
    if (seen.has(key)) return;
    seen.add(key);
    cleaned.push({
      key,
      name: String(b?.name ?? key),
      monthlyMan: Number(b?.monthlyMan ?? 0)
    });
  });
  return cleaned.length ? cleaned : structuredClone(BUDGETS);
}

function clearBudgetForm() {
  budgetForm.key.value = "";
  budgetForm.name.value = "";
  budgetForm.monthly.value = "";
  budgetForm.editingIndex = null;
}

function renderCategoryOptions() {
  const current = catSel.value;
  catSel.innerHTML = "";
  state.budgets.forEach(b => {
    const op = document.createElement("option");
    op.value = b.key;
    op.textContent = b.name;
    catSel.appendChild(op);
  });
  if (state.budgets.some(b => b.key === current)) {
    catSel.value = current;
  }
}

function renderBudgetEditor() {
  const tbody = $("tableBudgetEdit").querySelector("tbody");
  tbody.innerHTML = "";
  state.budgets.forEach((b, idx) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(b.key)}</td>
      <td>${escapeHtml(b.name)}</td>
      <td class="right">${b.monthlyMan}</td>
      <td class="right">
        <button data-action="edit" data-idx="${idx}">编辑</button>
        <button class="danger" data-action="remove" data-idx="${idx}">删除</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll("button[data-action='edit']").forEach(btn => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.getAttribute("data-idx"));
      const budget = state.budgets[idx];
      if (!budget) return;
      budgetForm.key.value = budget.key;
      budgetForm.name.value = budget.name;
      budgetForm.monthly.value = budget.monthlyMan;
      budgetForm.editingIndex = idx;
      budgetForm.key.focus();
    });
  });

  tbody.querySelectorAll("button[data-action='remove']").forEach(btn => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.getAttribute("data-idx"));
      const target = state.budgets[idx];
      if (!target) return;
      if (!confirm(`确定删除类别“${target.name}”吗？已记录的数据不会被删除。`)) return;
      state.budgets.splice(idx, 1);
      saveState(state);
      renderBudgetEditor();
      renderCategoryOptions();
      renderAll();
    });
  });
}

// rendering
function fmt(yen){ return fmtMoney(yen, state.unitMode); }

function renderAll(){
  const curYM = $("monthPicker").value;

  const txs = state.txs
    .filter(t => monthKey(t.date) === curYM)
    .sort((a,b) => a.date.localeCompare(b.date));

  const catTotals = new Map();
  txs.forEach(t => {
    catTotals.set(t.categoryKey, (catTotals.get(t.categoryKey) ?? 0) + t.amountYen);
  });

  const used = txs.reduce((s,t)=>s+t.amountYen,0);
  const cap = state.monthlyCapYen;
  const remain = cap - used;

  $("pillMonth").textContent = `月份：${curYM}`;
  $("pillCount").textContent = `记录：${txs.length} 条`;

  $("kpiUsed").textContent = fmt(used);
  $("kpiRemain").textContent = fmt(remain);
  $("kpiRemain").className = "v " + (remain < 0 ? "warn" : "ok");

  const rate = cap > 0 ? (used/cap*100) : 0;
  $("kpiRate").textContent = rate.toFixed(1) + "%";

  // category budget table
  const tbody = $("tableCat").querySelector("tbody");
  tbody.innerHTML = "";
  state.budgets.forEach(b => {
    const budgetYen = b.monthlyMan * 10000;
    const catUsed = catTotals.get(b.key) ?? 0;
    const catRemain = budgetYen - catUsed;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${b.name}</td>
      <td class="right">${fmt(budgetYen)}</td>
      <td class="right">${fmt(catUsed)}</td>
      <td class="right"><span class="${catRemain<0?'warn':'ok'}">${fmt(catRemain)}</span></td>
    `;
    tbody.appendChild(tr);
  });

  // tx list
  const txBody = $("tableTx").querySelector("tbody");
  txBody.innerHTML = "";
  const catNameMap = new Map(state.budgets.map(b => [b.key, b.name]));
  txs.forEach(t => {
    const catName = catNameMap.get(t.categoryKey) ?? t.categoryKey;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${t.date}</td>
      <td>${catName}</td>
      <td>${escapeHtml(t.ticker)}</td>
      <td class="right">${fmt(t.amountYen)}</td>
      <td>${escapeHtml(t.note)}</td>
      <td class="right"><button data-id="${t.id}" class="danger">删除</button></td>
    `;
    txBody.appendChild(tr);
  });

  txBody.querySelectorAll("button[data-id]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      const idx = state.txs.findIndex(x => x.id === id);
      if (idx >= 0) {
        state.txs.splice(idx, 1);
        saveState(state);
        renderAll();
      }
    });
  });
}

renderAll();
renderBudgetEditor();
