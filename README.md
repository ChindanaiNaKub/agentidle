# Idle Garden 🌱

A cozy, lightweight idle farming game with lofi beats. Grow your garden while you work.

Plant herbs, sunflowers, lavender, maples, and cherry blossoms. Watch them sprout, grow, and bloom as your garden fills with life. Seasons change as you progress. Put on the lofi music and let your garden grow.

## Play

Open `index.html` with any local HTTP server:

```bash
# Python
python3 -m http.server 8080

# Node.js
npx serve .

# Or deploy to GitHub Pages, Netlify, Vercel — it's all static files
```

Then visit `http://localhost:8080`.

> **Note:** ES modules require an HTTP server. Opening the file directly (`file://`) won't work in most browsers.

## How It Works

- **Plants** grow in your garden, each generating sunlight per second
- **Sunlight** is your currency — spend it on more plants or upgrades
- **Seasons** change the visual theme as your total sunlight grows (Spring → Summer → Autumn → Winter → Eternal)
- **Offline progress** — close the tab, come back later, and collect what grew while you were away
- **Click anywhere** on the garden for a burst of particles and a sunlight bonus
- **Lofi music** — built-in YouTube player for lofi beats while you garden

## Plant Types

| Plant | Sunlight/s | Unlock At | Grow Time |
|-------|-----------|-----------|-----------|
| Herb | 1 | Start | 20s |
| Sunflower | 5 | 500 total | 40s |
| Lavender | 20 | 10K total | 60s |
| Maple Tree | 100 | 200K total | 120s |
| Cherry Blossom | 500 | 5M total | 240s |

## Upgrades

- **Fertile Soil** — +50% sunlight generation per level
- **Golden Light** — Plants glow 20% brighter (visual)
- **Nature's Way** — Auto-plant herbs over time
- **Dream Garden** — Earn more sunlight while away

## Controls

| Action | Effect |
|--------|--------|
| Click garden | Particle burst + sunlight bonus |
| ☰ button / Tab | Toggle shop panel |
| Escape | Close panel |
| ▶ Lofi button | Play/pause lofi beats |
| Volume slider | Adjust music volume |

## Technical Details

- **Zero dependencies** — pure vanilla HTML, CSS, and JavaScript
- **Zero build step** — just static files
- **30 FPS cap** — gentle on CPU and battery
- **ES Modules** — clean code organization
- **localStorage** — auto-saves every 30 seconds
- **Export/Import** — portable save strings
- **Responsive** — works on desktop and mobile
- **YouTube IFrame API** — lofi music integration (optional, game works without it)

## Project Structure

```
├── index.html          Main page
├── css/
│   └── style.css       All styles
├── js/
│   ├── config.js       Game constants and definitions
│   ├── game.js         Core state, logic, save/load
│   ├── world.js        Canvas garden rendering
│   ├── ui.js           DOM interface, shop, notifications
│   ├── music.js        YouTube lofi music player
│   └── main.js         Entry point, game loop
├── LICENSE             MIT
└── README.md
```

## Contributing

Open source and free forever. Ideas for future enhancements:

- More plant varieties and visual stages
- Prestige system (reset for permanent bonuses)
- Garden layout customization (drag plants)
- Weather effects (rain, wind)
- Achievements
- Custom music playlist support
- Day/night cycle

## License

MIT — see [LICENSE](LICENSE).
