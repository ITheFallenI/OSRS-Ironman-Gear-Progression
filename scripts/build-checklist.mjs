import { readFileSync, writeFileSync } from "node:fs";
import overlays from "../js/rect_overlays.js";
import { itemKey } from "../js/bank-import.js";

const [namesPath, notesPath, variationsPath] = process.argv.slice(2);
if (!namesPath || !notesPath || !variationsPath) {
  throw new Error("Pass RuneLite names.json, notes.json and item_variations.json.");
}
const read = (path) => JSON.parse(readFileSync(path, "utf8"));
const names = read(namesPath);
const notes = read(notesPath);
const variants = read(variationsPath);

const sections = [
  ["early", "Pre-bossing gear"],
  ["entry", "Entry-level bosses"],
  ["skilling", "Skilling & diaries"],
  ["combat", "70+ combat"],
  ["slayer", "Slayer"],
  ["barrows", "Barrows & Sarachnis"],
  ["bossing", "Other boss drops"],
  ["ranged", "Ranged progression"],
  ["bowfa", "Bowfa bosses"],
  ["demonic", "Demonic progression"],
  ["demonic-endgame", "Demonic endgame"],
  ["raids", "Entry-level raids"],
  ["capes", "Best-in-slot capes"],
  ["wilderness", "Wilderness"],
  ["godwars", "God Wars Dungeon"],
  ["dt2", "Desert Treasure II"],
  ["endgame", "Endgame bosses & raids"],
];

function sectionFor({ x, y }) {
  if (y < 1700) return x < 10000 ? "early" : "entry";
  if (x < 2200 && y < 4000) return "skilling";
  if (x < 850) return "barrows";
  if (x < 2200) return "bossing";
  if (x < 4600) return y < 7800 ? "combat" : "wilderness";
  if (y < 3900) return "slayer";
  if (y < 5100) return x < 9900 ? "ranged" : "bowfa";
  if (y < 6200) return x < 9900 ? "demonic" : "demonic-endgame";
  if (y < 7450) return x < 9900 ? "raids" : "capes";
  if (x < 6600) return "godwars";
  if (x < 9000) return "dt2";
  return "endgame";
}

const blessedBoots = ["Ancient", "Armadyl", "Bandos", "Guthix", "Saradomin", "Zamorak"]
  .map((god) => `${god} d'hide boots`);
const barrowsBodies = [
  "Ahrim's robetop", "Dharok's platebody", "Guthan's platebody",
  "Karil's leathertop", "Torag's platebody", "Verac's brassard",
];
const barrowsLegs = [
  "Ahrim's robeskirt", "Dharok's platelegs", "Guthan's chainskirt",
  "Karil's leatherskirt", "Torag's platelegs", "Verac's plateskirt",
];

// Overrides cover guide shorthand, named alternatives and entries requiring manual evidence.
const overrides = {
  "Mage Arena II": ["Mage Arena II", ["Imbued saradomin cape", "Imbued guthix cape", "Imbued zamorak cape"]],
  "Blessed Boots": ["Blessed d'hide boots", blessedBoots],
  "Quest Cape": ["Quest point cape"],
  "Msb (i)": ["Magic shortbow (i)"],
  "Warriors Ring": ["Warrior ring"],
  "Bones To Peaches": ["Bones to Peaches unlock", null],
  "Piety": ["Piety prayer", null],
  "1750+ Total Level": ["1750+ total level", null],
  "2000+ Total Level": ["2000+ total level", null],
  "2200+ Total Level": ["2200+ total level", null],
  "80+ Skill Level": ["80+ skill level", null],
  "90+ Skill Level": ["90+ skill level", null],
  "Crystalline Portal Nexus": ["Crystalline portal nexus", null],
  "Ornate Jewellery Box": ["Ornate jewellery box", null],
  "Fairy Ring": ["Fairy ring in POH", null],
  "Spirit Tree": ["Spirit tree in POH", null],
  "Ornate Pool": ["Ornate rejuvenation pool", null],
  "Occult Altar": ["Occult altar", null],
  "Tomb Of Water": ["Tome of Water"],
  "Tomb Of Fire": ["Tome of Fire"],
  "Tomb Of Earth": ["Tome of Earth"],
  "Barrows Legs": ["Any Barrows leg armour", barrowsLegs],
  "Barrows Top": ["Any Barrows body armour", barrowsBodies],
  "Black Tormaline Core": ["Black tourmaline core"],
  "Dragon Sword": ["Dragon sword", ["Dragon sword", "Dragon shortsword"]],
  "Hydras Tail": ["Hydra tail"],
  "Blue Moon Chest": ["Blue Moon chestplate"],
  "Blood Moon Tassests": ["Blood Moon tassets"],
  "Blood Moon Chest": ["Blood Moon chestplate"],
  "Deadeye": ["Deadeye prayer", null],
  "Mystic Vigour": ["Mystic Vigour prayer", null],
  "Hueycoatl Hide Vambs": ["Hueycoatl hide vambraces"],
  "Seercul": ["Seercull"],
  "Thammarons Scepter": ["Thammaron's sceptre"],
  "Claws Of Calisto": ["Claws of Callisto"],
  "Amulet Of Averice": ["Amulet of avarice"],
  "Vorkath Head": ["Vorkath's head"],
  "Zamorak Spear": ["Zamorakian spear"],
  "Dex": ["Dexterous prayer scroll"],
  "Arcane Prayer": ["Arcane prayer scroll"],
  "Osmuntens Fang": ["Osmumten's fang"],
  "Sunfire Chausses": ["Sunfire fanatic chausses"],
  "Sunfire Cuirass": ["Sunfire fanatic cuirass"],
  "Sunfire Helm": ["Sunfire fanatic helm"],
  "Armadyl Helm": ["Armadyl helmet"],
  "Ancient Blood Kit": ["Ancient blood ornament kit"],
  "Virtus Robe Bottoms": ["Virtus robe bottom"],
  "Magnus Ring": ["Magus ring"],
  "Twisted Kit": ["Twisted ancestral colour kit"],
  "Bulwark": ["Dinh's bulwark", ["Dinh's bulwark", "Dinh's blazing bulwark"]],
  "Dragon Hunter X-bow": ["Dragon hunter crossbow"],
  "Sanguine Kit": ["Sanguine ornament kit"],
  "Holy Kit": ["Holy ornament kit"],
  "Eldinis Ward": ["Elidinis' ward"],
  "Menaphite Kit": ["Menaphite ornament kit"],
  "Tztok-jad": ["TzTok-Jad", null],
  "Corporal Beast": ["Corporeal Beast", null],
  "Dragons": ["Dragons", null, "Dragon_(race)"],
  "Calvarion & Vetion": ["Calvar'ion & Vet'ion", null],
  "kril Tsutsaroth": ["K'ril Tsutsaroth", null],
  "Phosanis Nightmare": ["Phosani's Nightmare", null],
};

const wikiBase = "https://oldschool.runescape.wiki/w/";
const itemIndex = new Map();
for (const [id, name] of Object.entries(names)) {
  if (!name || Object.hasOwn(notes, id) || name.endsWith("(beta)")) continue;
  const key = itemKey(name);
  if (!itemIndex.has(key)) itemIndex.set(key, []);
  itemIndex.get(key).push(Number(id));
}
const variationsById = new Map();
for (const ids of Object.values(variants)) {
  for (const id of ids) variationsById.set(id, ids);
}

const sorted = [...overlays].sort((a, b) => a.y - b.y || a.x - b.x);
const entries = new Map();
for (const area of sorted) {
  const key = area.id.replace(/_\d+$/, "").replace(/\s\([bas]\)$/, "");
  if (entries.has(key)) {
    entries.get(key).mapIds.push(area.id);
    continue;
  }

  const links = area.links.filter(({ url }) => url?.startsWith(wikiBase));
  const wikiTitle = links[0] && decodeURIComponent(links[0].url.slice(wikiBase.length).split("#")[0]).replaceAll("_", " ");
  const directIds = itemIndex.get(itemKey(key));
  const override = overrides[key];
  const automatic = area.w < 600 && !/\+ (Total|Skill) Level/.test(key) && override?.[1] !== null;
  const target = override?.[0] ?? names[directIds?.[0]] ?? wikiTitle ?? key;
  const targets = automatic ? (override?.[1] ?? [target]) : [];
  const matchedIds = new Set();
  const matchedNames = new Set(targets);

  for (const name of targets) {
    const targetKey = itemKey(name);
    const exactIds = itemIndex.get(targetKey) ?? [];
    const specificImbue = typeof name === "string" && /\((ei|i)\)$/i.exec(name)?.[1].toLowerCase();
    const diaryUpgrade = name.match(/^(Ardougne cloak|Desert amulet|Explorer's ring|Falador shield|Fremennik sea boots|Kandarin headgear|Karamja gloves|Morytania legs|Rada's blessing|Varrock armour|Western banner|Wilderness sword) 3$/i);
    if (diaryUpgrade) {
      const elite = `${diaryUpgrade[1]} 4`;
      matchedNames.add(elite);
      for (const id of itemIndex.get(itemKey(elite)) ?? []) matchedIds.add(id);
    }
    for (const id of exactIds) {
      for (const variant of variationsById.get(id) ?? [id]) {
        const variantName = names[variant];
        if (!variantName || Object.hasOwn(notes, variant) || variantName.endsWith("(beta)")) continue;
        if (specificImbue && !variantName.toLowerCase().endsWith(`(${specificImbue})`)) continue;
        matchedIds.add(variant);
        matchedNames.add(variantName);
      }
    }
  }
  for (const [id, original] of Object.entries(notes)) {
    if (matchedIds.has(original)) matchedIds.add(Number(id));
  }

  const fallback = ["Blessed Boots", "Mage Arena II", "Barrows Legs", "Barrows Top"].includes(key)
    ? links[0]?.url
    : `${wikiBase}${encodeURIComponent(target.replaceAll(" ", "_"))}`;
  const wiki = override?.[2] ? wikiBase + override[2] : (override && automatic ? fallback : links[0]?.url) ?? fallback;
  entries.set(key, {
    key,
    name: target,
    section: sectionFor(area),
    wiki,
    goal: key === "Venator Shard" ? 5 : 1,
    mapIds: [area.id],
    ...(automatic && { names: [...matchedNames], ids: [...matchedIds].sort((a, b) => a - b) }),
  });
}

const output = [
  "// Generated by scripts/build-checklist.mjs from the guide and RuneLite's public item metadata.",
  `export const sections = ${JSON.stringify(sections)};`,
  "export const entries = [",
  ...[...entries.values()].map((entry) => `  ${JSON.stringify(entry)},`),
  "];",
  "",
].join("\n");
writeFileSync(new URL("../js/checklist-data.js", import.meta.url), output);
