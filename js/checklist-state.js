const storageKey = "osrs-ironman-checklist-v1";
const legacyKey = "osrs-ironman-selected-overlays-v1";

export function createProgress(entries) {
  const entriesByKey = new Map(entries.map((entry) => [entry.key, entry]));
  const entriesByArea = new Map(entries.flatMap((entry) => entry.mapIds.map((id) => [id, entry.key])));

  const progress = {
    manual: new Set(),
    excluded: new Set(),
    matches: new Map(),
    importedRows: 0,
    entriesByArea,
  };

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey));
      if (saved) {
        progress.manual = new Set(saved.manual.filter((key) => entriesByKey.has(key)));
        progress.excluded = new Set(saved.excluded.filter((key) => entriesByKey.has(key)));
        progress.matches = new Map(saved.matches.filter(([key, quantity]) =>
          entriesByKey.has(key) && Number.isSafeInteger(quantity) && quantity > 0));
        progress.importedRows = saved.importedRows;
        return;
      }
      const legacy = JSON.parse(localStorage.getItem(legacyKey)) ?? [];
      progress.manual = new Set(legacy.map((id) => entriesByArea.get(id)).filter(Boolean));
    } catch {
      // A blocked or malformed storage record does not prevent tracking in this tab.
    }
  }

  function save() {
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        manual: [...progress.manual],
        excluded: [...progress.excluded],
        matches: [...progress.matches],
        importedRows: progress.importedRows,
      }));
    } catch {
      // Changes still work until the tab is closed.
    }
  }

  function status(key) {
    if (!entriesByKey.has(key) || progress.excluded.has(key)) return "todo";
    if ((progress.matches.get(key) ?? 0) >= entriesByKey.get(key).goal) return "bank";
    return progress.manual.has(key) ? "manual" : "todo";
  }

  function setComplete(key, complete) {
    if (!entriesByKey.has(key)) return;
    if (complete) {
      progress.excluded.delete(key);
      if (status(key) !== "bank") progress.manual.add(key);
    } else {
      if (status(key) === "bank") progress.excluded.add(key);
      progress.manual.delete(key);
    }
    save();
  }

  function replaceBank(matches, importedRows) {
    progress.matches = matches;
    progress.importedRows = importedRows;
    progress.excluded.clear();
    save();
  }

  function clearManual() {
    progress.manual.clear();
    progress.excluded.clear();
    save();
  }

  load();
  return Object.assign(progress, { load, status, setComplete, replaceBank, clearManual });
}
