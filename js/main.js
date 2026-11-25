import { initPanZoom } from "./panzoom.js";
import overlays from "./rect_overlays.js";
import { entries } from "./checklist-data.js";
import { createProgress } from "./checklist-state.js";

const svg = document.querySelector("#root");
const sectionPicker = document.querySelector("#map-section");
const zoomIn = document.querySelector("#zoom-in");
const zoomOut = document.querySelector("#zoom-out");
const details = document.querySelector("#map-details");
const detailsHeading = document.querySelector("#selected-item");
const closeDetails = document.querySelector("#close-details");
const toggleComplete = document.querySelector("#toggle-complete");
const progress = createProgress(entries);
const byKey = new Map(entries.map((entry) => [entry.key, entry]));
const statusLabels = { todo: "To do", bank: "In bank", manual: "Manual tick" };
const svgNS = "http://www.w3.org/2000/svg";

// Keep the original section, item and route coordinates so the guide works the same way in either view.
const sections = [
  ["Pre-bossing gear", "Pre Bossing Gear Guide.png", 100, 400, 9850, 1250],
  ["Entry-level bosses", "Entry Level Bossing.png", 10050, 400, 3700, 1250],
  ["Skilling & diaries", "Skilling.png", 100, 1750, 2200, 2250],
  ["Background bossing", "Background Bossing.png", 300, 4150, 1650, 6350, 450, 1500],
  ["70+ combat", "70+ Combat Stats.png", 2450, 2100, 2250, 5600],
  ["Slayer", "Slayer.png", 4800, 2100, 8750, 1800],
  ["90+ Ranged", "90+ Range.png", 5088, 4000, 400, 600],
  ["Ranged progression", "Ranged Pathway.png", 5725, 4000, 4000, 1050],
  ["Bowfa bosses", "Bowfa Bossing.png", 10100, 4000, 3250, 1050],
  ["Demonic progression", "Demonic Pathway.png", 5025, 5150, 4700, 1050],
  ["Demonic endgame", "Demonic Endgame.png", 10100, 5150, 3250, 1050],
  ["Entry-level raids", "Entry Level Raiding.png", 5025, 6300, 4700, 1050],
  ["Best-in-slot capes", "BIS Capes.png", 10100, 6300, 2900, 1050],
  ["God Wars Dungeon", "Godwars.png", 5025, 7450, 1450, 3600],
  ["Wilderness bosses", "Wilderness.png", 2450, 8150, 2250, 2900],
  ["Desert Treasure II", "DT2.png", 7000, 7750, 1850, 3300],
  ["Endgame bosses & raids", "Endgame Bossing.png", 9275, 7750, 4425, 3300, 9400, 4300],
].map(([name, file, x, y, w, h, artX = x, artWidth = w]) =>
  ({ name, x, y, w, h, art: { file, x: artX, y, w: artWidth, h } }));

const areas = overlays.map((area) => ({
  ...area,
  x: area.x + 120,
  y: area.y + 120,
  entry: byKey.get(progress.entriesByArea.get(area.id)),
}));
let selected = null;
let tabStop = null;

function svgElement(tag, attributes, text) {
  const element = document.createElementNS(svgNS, tag);
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
  if (text !== undefined) element.textContent = text;
  return element;
}

function rect({ x, y, w, h }, radius, className) {
  return svgElement("rect", { x, y, width: w, height: h, rx: radius, class: className });
}

function image({ file, x, y, w, h }) {
  return svgElement("image", { x, y, width: w, height: h, href: `./assets/tiles/${file}`, preserveAspectRatio: "none" });
}

function drawBoards() {
  const boards = document.querySelector("#section-panels");
  const artwork = document.querySelector("#image-layers");
  const ladder = { x: 2390, y: 1750, w: 11385, h: 9400 };
  boards.append(
    rect(ladder, 80, "map-board map-board-major"),
    svgElement("text", { x: 2520, y: 1960, class: "map-ladder-title" }, "Bossing ladder"),
  );

  for (const [index, section] of sections.entries()) {
    const { x, y, w, name, art } = section;
    const banner = svgElement("g", { class: "map-board-link", "data-section": index });
    banner.append(
      rect({ x: x + 18, y: y + 18, w: w - 36, h: 105 }, 32, "map-board-header"),
      svgElement("text", {
        x: x + w / 2,
        y: y + 100,
        "text-anchor": "middle",
        class: w < 600 ? "map-board-title map-board-title-small" : "map-board-title",
      }, name),
    );
    boards.append(rect(section, 65, "map-board"), banner);
    artwork.append(image(art));
    sectionPicker.append(new Option(name, index));
  }

  document.querySelector("#progression-paths").append(image({
    file: "Arrows.png", x: 3574, y: 3900, w: 10076, h: 4239,
  }));
  boards.addEventListener("click", ({ target }) => {
    const banner = target.closest(".map-board-link");
    if (banner) viewSection(banner.dataset.section);
  });
}

function drawTiles() {
  const clips = document.querySelector("#tile-artwork");
  const backs = document.querySelector("#tile-backs");
  const tiles = document.querySelector("#map-tiles");

  for (const area of areas) {
    const { x, y, w, h, entry } = area;
    const inset = 17;
    clips.append(rect({ x: x + inset, y: y + inset, w: w - 2 * inset, h: h - 2 * inset }, 30, ""));
    backs.append(rect(area, 38, "tile-back"));
    const tile = svgElement("g", { class: "map-tile", role: "button", tabindex: "-1", "aria-controls": "map-details" });
    const badge = svgElement("g", { class: "tile-badge", transform: `translate(${x + w - 48} ${y + 48})`, "aria-hidden": "true" });
    badge.append(
      svgElement("circle", { r: 39 }),
      svgElement("path", { d: "M -15 0 L -5 11 L 16 -12" }),
    );
    tile.append(svgElement("title", {}, entry.name), rect(area, 38, "tile-hit"), badge);
    tile.addEventListener("click", () => selectTile(area));
    tile.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      selectTile(area);
    });
    tile.addEventListener("focus", () => {
      setTabStop(area);
      if (tile.matches(":focus-visible")) camera.reveal(area);
    });
    tile.addEventListener("keydown", (event) => onTileKey(event, area));
    tiles.append(tile);
    area.element = tile;
  }
}

function setTabStop(area) {
  if (!area) return;
  tabStop?.element.setAttribute("tabindex", "-1");
  area.element.setAttribute("tabindex", "0");
  tabStop = area;
}

function renderProgress() {
  for (const area of areas) {
    const status = progress.status(area.entry.key);
    area.element.dataset.status = status;
    area.element.setAttribute("aria-label", `${area.entry.name}, ${statusLabels[status]}`);
  }
  const done = entries.filter(({ key }) => progress.status(key) !== "todo").length;
  document.querySelector("#map-progress-count").textContent = `${done} of ${entries.length} complete`;
  document.querySelector("#map-progress-meter").value = done * 100 / entries.length;
  updateSelectedStatus();
}

function updateSelectedStatus() {
  if (!selected) return;
  const { key, goal } = selected.entry;
  const status = progress.status(key);
  const label = document.querySelector("#item-status");
  const quantity = document.querySelector("#item-quantity");
  label.dataset.status = status;
  label.textContent = statusLabels[status];
  quantity.hidden = goal <= 1;
  if (goal > 1) quantity.textContent = `${progress.matches.get(key) ?? 0} of ${goal} in bank`;
  toggleComplete.textContent = status === "todo" ? "Mark complete" : "Mark as to do";
}

function selectTile(area, focusDetails = false) {
  selected?.element.classList.remove("is-selected");
  selected?.element.removeAttribute("aria-current");
  selected = area;
  if (area) {
    area.element.classList.add("is-selected");
    area.element.setAttribute("aria-current", "true");
    setTabStop(area);
  }

  details.dataset.empty = String(!area);
  closeDetails.hidden = !area;
  document.querySelector("#selection-placeholder").hidden = Boolean(area);
  document.querySelector("#selection").hidden = !area;
  detailsHeading.textContent = area?.entry.name ?? "Item details";
  if (!area) return;

  const links = new Map();
  for (const { label, url } of area.links) {
    if (url?.startsWith("https://")) links.set(url, label.replace(/^Wiki:\s*/, ""));
  }
  if (!links.size) links.set(area.entry.wiki, "Open on OSRS Wiki");
  const items = [...links].map(([url, label]) => {
    const item = document.createElement("li");
    const anchor = document.createElement("a");
    Object.assign(anchor, { href: url, textContent: label, target: "_blank", rel: "noopener noreferrer" });
    item.append(anchor);
    return item;
  });
  document.querySelector("#item-links").replaceChildren(...items);
  updateSelectedStatus();
  if (focusDetails) toggleComplete.focus({ preventScroll: true });
}

const directions = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };

function onTileKey(event, area) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    selectTile(area, true);
    return;
  }
  const direction = directions[event.key];
  if (!direction) return;
  event.preventDefault();
  event.stopPropagation();

  const [x, y] = direction;
  let target = null;
  let distance = Infinity;
  for (const other of areas) {
    const dx = other.x + other.w / 2 - (area.x + area.w / 2);
    const dy = other.y + other.h / 2 - (area.y + area.h / 2);
    const forward = dx * x + dy * y;
    const offset = Math.abs(dx * y - dy * x);
    const score = forward + offset * 2;
    if (forward > 5 && score < distance) {
      target = other;
      distance = score;
    }
  }
  target?.element.focus({ preventScroll: true });
}

const camera = initPanZoom(svg, {
  width: 13850, height: 11250,
  onChange(atMin, atMax) {
    zoomOut.disabled = atMin;
    zoomIn.disabled = atMax;
  },
});

function viewSection(value) {
  sectionPicker.value = value;
  selectTile(null);
  if (value === "") {
    camera.reset();
    setTabStop(areas[0]);
    return;
  }
  const section = sections[Number(value)];
  camera.frame(section);
  setTabStop(areas.find((area) =>
    area.x >= section.x && area.x < section.x + section.w
    && area.y >= section.y && area.y < section.y + section.h));
}

drawBoards();
drawTiles();
setTabStop(areas[0]);
renderProgress();

sectionPicker.addEventListener("change", () => viewSection(sectionPicker.value));
zoomIn.addEventListener("click", () => camera.zoomBy(1.5));
zoomOut.addEventListener("click", () => camera.zoomBy(1 / 1.5));
document.querySelector("#btn-reset").addEventListener("click", () => viewSection(""));
closeDetails.addEventListener("click", () => {
  const previous = selected;
  selectTile(null);
  previous?.element.focus({ preventScroll: true });
});
toggleComplete.addEventListener("click", () => {
  if (!selected) return;
  const { key } = selected.entry;
  progress.setComplete(key, progress.status(key) === "todo");
  renderProgress();
});
document.querySelector("#btn-clear").addEventListener("click", () => {
  progress.clearManual();
  renderProgress();
});

svg.addEventListener("keydown", (event) => {
  const direction = directions[event.key];
  if (direction) camera.panBy(-direction[0] * 60, -direction[1] * 60);
  else if (event.key === "+" || event.key === "=") camera.zoomBy(1.5);
  else if (event.key === "-") camera.zoomBy(1 / 1.5);
  else if (event.key === "Home") viewSection("");
  else return;
  event.preventDefault();
});

function reloadProgress() {
  progress.load();
  renderProgress();
}
window.addEventListener("storage", reloadProgress);
window.addEventListener("pageshow", reloadProgress);
