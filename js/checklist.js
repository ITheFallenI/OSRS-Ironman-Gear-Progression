import { entries, sections } from "./checklist-data.js";
import { createProgress } from "./checklist-state.js";
import { itemKey, matchBank, parseBank } from "./bank-import.js";

const progress = createProgress(entries);
const bankInput = document.querySelector("#bank-input");
const importResult = document.querySelector("#import-result");
const clearBank = document.querySelector("#clear-bank");
const search = document.querySelector("#search");
const sectionFilter = document.querySelector("#section-filter");
const statusFilters = document.querySelector(".status-filters");
const groups = document.querySelector("#groups");
const number = new Intl.NumberFormat();
const searchKeys = new Map(entries.map((entry) =>
  [entry.key, [entry.name, entry.key, ...(entry.names ?? [])].map(itemKey)]));
let statusFilter = "all";

function element(tag, className, content) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (content !== undefined) node.textContent = content;
  return node;
}

function updateSummary() {
  const bank = entries.filter(({ key }) => progress.status(key) === "bank").length;
  const manual = entries.filter(({ key }) => progress.status(key) === "manual").length;
  const completed = bank + manual;
  const percent = Math.round(completed * 100 / entries.length);
  document.querySelector("#progress-count").textContent = `${completed} of ${entries.length}`;
  document.querySelector("#progress-percent").textContent = `${percent}%`;
  document.querySelector("#progress-meter").value = completed * 100 / entries.length;
  document.querySelector("#bank-count").textContent = bank;
  document.querySelector("#manual-count").textContent = manual;
  clearBank.hidden = !progress.importedRows;
}

function rowFor(entry) {
  const status = progress.status(entry.key);
  const quantity = progress.matches.get(entry.key) ?? 0;
  const row = element("li", "gear-row");
  row.dataset.status = status;
  const label = element("label", "gear-name");
  const checkbox = element("input", "gear-checkbox");
  checkbox.type = "checkbox";
  checkbox.checked = status !== "todo";
  checkbox.dataset.item = entry.key;
  label.append(checkbox, element("span", "gear-label", entry.name));
  row.append(label);

  let detail = "—";
  let detailLabel = "To do";
  if (status === "bank") detail = detailLabel = "In bank";
  else if (status === "manual") detail = detailLabel = "Manual tick";
  else if (entry.goal > 1) detail = detailLabel = `${number.format(quantity)} / ${entry.goal} in bank`;
  else if (entry.ids === undefined) detail = detailLabel = "Manual only";

  const pill = element("span", "gear-status", detail);
  pill.title = detailLabel;
  if (detail === "—") pill.setAttribute("aria-label", detailLabel);
  const wiki = element("a", "wiki-link", "Wiki");
  wiki.href = entry.wiki;
  wiki.target = "_blank";
  wiki.rel = "noopener noreferrer";
  wiki.setAttribute("aria-label", `${entry.name} on the OSRS Wiki (opens in a new tab)`);
  row.append(pill, wiki);
  return row;
}

function render() {
  updateSummary();
  const term = itemKey(search.value);
  const sectionId = sectionFilter.value;
  const content = document.createDocumentFragment();
  let visibleCount = 0;

  for (const [id, label] of sections) {
    if (sectionId && sectionId !== id) continue;
    const all = entries.filter((entry) => entry.section === id);
    const visible = all.filter(({ key }) => {
      if (term && !searchKeys.get(key).some((name) => name.includes(term))) return false;
      const complete = progress.status(key) !== "todo";
      return statusFilter === "all" || complete === (statusFilter === "done");
    });
    if (!visible.length) continue;
    visibleCount += visible.length;
    const completed = all.filter(({ key }) => progress.status(key) !== "todo").length;
    const section = element("section", "gear-group");
    const heading = element("div", "group-heading");
    heading.append(element("h3", "", label), element("span", "", `${completed} / ${all.length} done`));
    const list = element("ul", "gear-list");
    for (const entry of visible) list.append(rowFor(entry));
    section.append(heading, list);
    content.append(section);
  }

  document.querySelector("#result-count").textContent = `${visibleCount} ${visibleCount === 1 ? "entry" : "entries"}`;
  if (!visibleCount) content.append(element("p", "empty", "No entries match these filters."));
  groups.replaceChildren(content);
}

function announceImport(message, error = false) {
  importResult.textContent = message;
  importResult.classList.toggle("error", error);
  importResult.hidden = false;
}

if (progress.importedRows) {
  const matches = entries.filter((entry) => (progress.matches.get(entry.key) ?? 0) >= entry.goal).length;
  announceImport(`Last import matched ${number.format(matches)} checklist entries.`);
}

for (const [id, label] of sections) {
  sectionFilter.append(new Option(label, id));
}

document.querySelector("#bank-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const { items, ignored } = parseBank(bankInput.value);
  if (!items.length) {
    announceImport("Paste at least one item row with an ID, name and positive quantity.", true);
    bankInput.focus();
    return;
  }

  const matches = matchBank(items, entries);
  const completed = entries.filter((entry) => (matches.get(entry.key) ?? 0) >= entry.goal).length;
  progress.replaceBank(matches, items.length);
  announceImport(`Matched ${number.format(completed)} checklist entries from ${number.format(items.length)} bank rows.${ignored ? ` Skipped ${number.format(ignored)} invalid rows.` : ""}`);
  bankInput.value = "";
  render();
});

document.querySelector("#load-example").addEventListener("click", () => {
  bankInput.value = "Item id\tItem name\tItem quantity\n9185\tRune crossbow\t1\n1712\tAmulet of glory(4)\t1\n10551\tFighter torso\t1";
  bankInput.focus();
});

clearBank.addEventListener("click", () => {
  progress.replaceBank(new Map(), 0);
  announceImport("Bank matches cleared. Manual ticks are still saved.");
  render();
  bankInput.focus();
});

search.addEventListener("input", render);
sectionFilter.addEventListener("change", render);
statusFilters.addEventListener("click", ({ target }) => {
  if (!target.matches("button[data-filter]")) return;
  statusFilter = target.dataset.filter;
  for (const button of statusFilters.querySelectorAll("button")) {
    button.setAttribute("aria-pressed", String(button === target));
  }
  render();
});

groups.addEventListener("change", ({ target }) => {
  if (!target.matches(".gear-checkbox")) return;
  const key = target.dataset.item;
  progress.setComplete(key, target.checked);
  render();
  const next = Array.from(groups.querySelectorAll(".gear-checkbox")).find((field) => field.dataset.item === key);
  (next ?? statusFilters.querySelector('[aria-pressed="true"]')).focus({ preventScroll: true });
});

function refresh() {
  progress.load();
  render();
}
window.addEventListener("storage", refresh);
window.addEventListener("pageshow", refresh);
render();
