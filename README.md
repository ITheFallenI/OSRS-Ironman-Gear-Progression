# OSRS Ironman Gear Tracker

[Open the checklist](https://ithefalleni.github.io/OSRS-Ironman-Gear-Progression/) · [Original progression guide](https://github.com/scottymartin1992/OSRS-Ironman-Gear-Progression)

Paste a bank export with item ID, item name and item quantity columns. The checklist matches bank items by ID with a name fallback. Tick boss kills, unlocks and other milestones by hand. Both views share your progress in the same browser.

The site processes the bank export in the browser. It stores checklist matches and manual ticks locally. Pasting a new export updates bank matches. Use **Clear bank import** to remove them.

To run locally, serve the repository root with `python -m http.server 8000` and open [localhost:8000](http://localhost:8000/).

To rebuild the item catalog with Node.js 22, download the RuneLite [names and notes data](https://github.com/runelite/static.runelite.net/tree/master/cache/item) and [item variations](https://github.com/runelite/runelite/blob/master/runelite-client/src/main/resources/item_variations.json).

```sh
node scripts/build-checklist.mjs names.json notes.json item_variations.json
```

Guide and map by [Scotty Martin](https://github.com/scottymartin1992/OSRS-Ironman-Gear-Progression). Item references link to the [Old School RuneScape Wiki](https://oldschool.runescape.wiki/).
