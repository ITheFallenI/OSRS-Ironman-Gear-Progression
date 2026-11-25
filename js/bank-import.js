export function itemKey(name) {
  return name.normalize("NFKC").toLowerCase().replace(/[^a-z0-9+]/g, "");
}

export function parseBank(text) {
  const items = [];
  let ignored = 0;
  for (const rawLine of text.split(/\r\n|[\n\r]/)) {
    const line = rawLine.trim();
    if (!line || /^item\s*id\b/i.test(line)) continue;

    const columns = line.includes("\t")
      ? line.split("\t")
      : /^(\d+)\s*,\s*("(?:[^"]|"")*"|[^,]+)\s*,\s*([\d,]+)$/.exec(line)?.slice(1);
    if (columns?.length !== 3) {
      ignored++;
      continue;
    }

    const [rawId, rawName, rawQuantity] = columns.map((column) => column.trim());
    const id = Number(rawId);
    const name = rawName.replace(/^"|"$/g, "").replaceAll('""', '"');
    const quantity = Number(rawQuantity.replaceAll(",", ""));
    const valid = /^\d+$/.test(rawId) && Number.isSafeInteger(id) && id > 0 && itemKey(name)
      && /^(?:\d+|\d{1,3}(?:,\d{3})+)$/.test(rawQuantity) && Number.isSafeInteger(quantity);
    if (!valid) {
      ignored++;
      continue;
    }
    if (quantity > 0) items.push({ id, name, quantity });
  }
  return { items, ignored };
}

export function matchBank(items, entries) {
  const byId = new Map();
  const byName = new Map();
  for (const entry of entries) {
    for (const [index, keys] of [[byId, entry.ids ?? []], [byName, (entry.names ?? []).map(itemKey)]]) {
      for (const key of keys) {
        if (!index.has(key)) index.set(key, new Set());
        index.get(key).add(entry.key);
      }
    }
  }

  const matches = new Map();
  for (const { id, name, quantity } of items) {
    for (const key of byId.get(id) ?? byName.get(itemKey(name)) ?? []) {
      matches.set(key, Math.min(Number.MAX_SAFE_INTEGER, (matches.get(key) ?? 0) + quantity));
    }
  }
  return matches;
}
