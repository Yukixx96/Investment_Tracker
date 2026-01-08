const LS_KEY = "yuki_invest_tracker_v1";

export function loadState() {
  try {
    const s = localStorage.getItem(LS_KEY);
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
}

export function saveState(state) {
  localStorage.setItem(LS_KEY, JSON.stringify(state));
}

export function clearState() {
  localStorage.removeItem(LS_KEY);
}
