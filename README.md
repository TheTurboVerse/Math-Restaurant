# 67-Day 2D Math Restaurant

Planner, 2D pixel-art restaurant game, Google Drive vault and searchable archive for the
Oct 26 – Dec 31, 2026 campaign. ©Syed Ashaz Ahmed

## Run it

**Easiest:** double-click `index.html`. It opens in your browser.

**Or with a local server** (recommended if your browser blocks something):

```
cd math-restaurant
python3 -m http.server 8000
```

Then open http://localhost:8000

Needs an internet connection the first time for Tailwind CSS and Google Fonts (loaded from CDNs),
and for Google Drive previews. Your data never leaves your browser.

## Controls

- Move the chef: Arrow keys / WASD, or click anywhere on the floor
- Click a dish on a counter to inspect its recipe (prerequisites, unlocks)
- Walk to the Dining Table and press **E** to eat the selected dish (logs a session on the active day)
- **M** toggles sound

## Project layout

```
math-restaurant/
├── index.html        Page shell: 4 views, 2 modals, script includes
├── css/style.css     Plate styles, drop zones, scrollbars
└── js/               Plain scripts, loaded in this order
    ├── state.js      Default dishes, 67 days, save/load, prerequisite engine, helpers
    ├── game.js       Canvas engine, recipe card, HUD, XP/levels/streaks, sound
    ├── planner.js    Drag & drop pass, presets, dish editor modal
    ├── vault.js      Day vault, Drive previewer, search database, backup/restore
    └── main.js       View switching and startup
```

## Your data

Everything is saved in your browser's localStorage. It is per browser and per file location,
so opening the project from a different folder or server address starts empty.
Use **Share Context → Backup JSON File** regularly, and **Restore JSON** to move to another device.

## Customising

- Edit the menu: `getDefaultDishes()` in `js/state.js` (each line: id, title, domain, slot, source, hard prereqs, soft prereqs)
- Presets: `PRESETS` in `js/planner.js`
- XP rules and level names: `computeGameStats()` and `LEVEL_TITLES` in `js/game.js`
