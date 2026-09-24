const STORAGE_KEY = "pikmin-mushroom-records-v1";
let records = loadRecords();
let editingId = null;

const form = document.querySelector("#mushroom-form");
const list = document.querySelector("#mushroom-list");
const emptyState = document.querySelector("#empty-state");
const countLabel = document.querySelector("#count-label");
const dialog = document.querySelector("#edit-dialog");
const searchInput = document.querySelector("#name-search");

function loadRecords() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; } }
function saveRecords() { localStorage.setItem(STORAGE_KEY, JSON.stringify(records)); }
function parseDuration(value) {
  const parts = value.trim().split(":").map(Number);
  if (parts.length !== 4 || parts.some(n => !Number.isInteger(n) || n < 0) || parts[1] > 23 || parts[2] > 59 || parts[3] > 59) return null;
  return (((parts[0] * 24 + parts[1]) * 60 + parts[2]) * 60 + parts[3]) * 1000;
}
function formatDuration(milliseconds) {
  const total = Math.max(0, Math.floor(milliseconds / 1000));
  const days = Math.floor(total / 86400), hours = Math.floor(total % 86400 / 3600), mins = Math.floor(total % 3600 / 60), secs = total % 60;
  return `${days}:${String(hours).padStart(2,"0")}:${String(mins).padStart(2,"0")}:${String(secs).padStart(2,"0")}`;
}
function formatDate(dateString) { return new Intl.DateTimeFormat("zh-TW", { year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit", second:"2-digit", hour12:false }).format(new Date(dateString)); }
function toLocalInput(dateString) { const date = new Date(dateString), offset = date.getTimezoneOffset(); return new Date(date - offset * 60000).toISOString().slice(0,16); }
function safe(text) { const node = document.createElement("span"); node.textContent = text; return node.innerHTML; }
function render() {
  const keyword = searchInput.value.trim().toLocaleLowerCase("zh-TW");
  const visibleRecords = records.filter(r => r.user.toLocaleLowerCase("zh-TW").includes(keyword));
  list.innerHTML = visibleRecords.map(r => {
    const remaining = new Date(r.endAt) - Date.now();
    return `<tr><td><div class="actions"><button class="secondary mini-button" data-action="edit" data-id="${r.id}">修改</button><button class="delete mini-button" data-action="delete" data-id="${r.id}">刪除</button></div></td><td>${safe(r.user)}</td><td>${safe(r.mushroom)}</td><td>${Number(r.power).toLocaleString()}</td><td>${formatDate(r.startAt)}</td><td class="${remaining <= 0 ? "finished" : ""}">${remaining <= 0 ? "已結束" : formatDuration(remaining)}</td><td>${formatDate(r.endAt)}</td></tr>`;
  }).join("");
  emptyState.hidden = visibleRecords.length > 0;
  emptyState.textContent = keyword ? "沒有符合此使用者名稱的資料。" : "尚未新增蘑菇。從上方開始記錄吧！";
  countLabel.textContent = keyword ? `顯示 ${visibleRecords.length} / ${records.length} 筆資料` : `${records.length} 筆資料`;
}
function showError(id, message) { const el = document.querySelector(id); el.textContent = message; el.hidden = false; }
function clearError(id) { document.querySelector(id).hidden = true; }
function buildRecord(values, startAt, id = crypto.randomUUID()) { const duration = parseDuration(values.duration); return { id, user: values.user.trim(), mushroom: values.mushroom.trim(), power: Number(values.power), startAt: new Date(startAt).toISOString(), endAt: new Date(new Date(startAt).getTime() + duration).toISOString() }; }

form.addEventListener("submit", event => {
  event.preventDefault(); clearError("#form-error");
  const values = Object.fromEntries(new FormData(form));
  if (!parseDuration(values.duration)) return showError("#form-error", "請以「日:時:分:秒」填寫時間，例如：1:02:30:00。");
  records.unshift(buildRecord(values, new Date())); saveRecords(); form.reset(); render();
});
list.addEventListener("click", event => {
  const button = event.target.closest("button[data-action]"); if (!button) return;
  const record = records.find(r => r.id === button.dataset.id); if (!record) return;
  if (button.dataset.action === "delete") { if (confirm(`確定要刪除「${record.mushroom}」嗎？`)) { records = records.filter(r => r.id !== record.id); saveRecords(); render(); } return; }
  editingId = record.id; document.querySelector("#edit-user").value = record.user; document.querySelector("#edit-mushroom").value = record.mushroom; document.querySelector("#edit-power").value = record.power; document.querySelector("#edit-start").value = toLocalInput(record.startAt); document.querySelector("#edit-duration").value = formatDuration(new Date(record.endAt) - new Date(record.startAt)); clearError("#edit-error"); dialog.showModal();
});
document.querySelector("#edit-form").addEventListener("submit", event => {
  event.preventDefault(); const values = { user: document.querySelector("#edit-user").value, mushroom: document.querySelector("#edit-mushroom").value, power: document.querySelector("#edit-power").value, duration: document.querySelector("#edit-duration").value }; const startAt = document.querySelector("#edit-start").value;
  if (!parseDuration(values.duration)) return showError("#edit-error", "請以「日:時:分:秒」填寫時間，例如：1:02:30:00。");
  records = records.map(r => r.id === editingId ? buildRecord(values, startAt, r.id) : r); saveRecords(); dialog.close(); render();
});
function closeDialog() { dialog.close(); } document.querySelector("#close-dialog").addEventListener("click", closeDialog); document.querySelector("#cancel-edit").addEventListener("click", closeDialog);
document.querySelector("#clear-finished").addEventListener("click", () => { const active = records.filter(r => new Date(r.endAt) > Date.now()); if (active.length === records.length) return; if (confirm("確定要清除所有已結束的蘑菇嗎？")) { records = active; saveRecords(); render(); } });
searchInput.addEventListener("input", render);
render(); setInterval(render, 1000);
