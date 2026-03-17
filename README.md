# Idle Agents ✦

A calming, lightweight browser idle game where autonomous agents grow and thrive while you work.

Watch your colony of glowing agents drift across a peaceful world, generating stardust as they go. No pressure, no penalties — just gentle, endless growth.

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

- **Agents** wander your world autonomously, each generating stardust per second
- **Stardust** is your currency — spend it to recruit more agents or buy upgrades
- **Eras** change the visual theme as your total stardust grows (Dawn → Garden → Ocean → Cosmos → Ethereal)
- **Offline progress** — close the tab, come back later, and collect what your agents earned while you were away
- **Click anywhere** on the canvas for a burst of particles and a small stardust bonus

## Agent Types

| Agent | Stardust/s | Unlock At | Description |
|-------|-----------|-----------|-------------|
| Wanderer | 1 | Start | A gentle drifter |
| Gatherer | 5 | 500 total | A keen collector |
| Seeker | 20 | 10K total | Forms networks with nearby agents |
| Sage | 100 | 200K total | Orbits in enlightened patterns |
| Architect | 500 | 5M total | Shapes reality itself |

## Upgrades

- **Generation Boost** — +50% stardust generation per level
- **Swift Movement** — Agents move 20% faster (visual flair)
- **Auto Spawn** — Automatically spawn wanderers over time
- **Offline Mastery** — Earn more stardust while away

## Controls

| Action | Effect |
|--------|--------|
| Click canvas | Particle burst + stardust bonus |
| ☰ button / Tab | Toggle shop panel |
| Escape | Close panel |

## Technical Details

- **Zero dependencies** — pure vanilla HTML, CSS, and JavaScript
- **Zero build step** — just static files, works with any HTTP server
- **~1400 lines total** — small, readable, hackable
- **30 FPS cap** — gentle on your CPU, won't drain your battery
- **ES Modules** — clean, modern code organization
- **localStorage** — auto-saves every 30 seconds, saves on tab close
- **Export/Import** — backup your save as a portable string
- **Responsive** — works on desktop and mobile

## Project Structure

```
├── index.html          Main page
├── css/
│   └── style.css       All styles (glassmorphic UI)
├── js/
│   ├── config.js       Game constants and definitions
│   ├── game.js         Core game state, logic, save/load
│   ├── world.js        Canvas rendering, agents, particles
│   ├── ui.js           DOM interface, shop, notifications
│   └── main.js         Entry point, game loop, events
├── LICENSE             MIT
└── README.md
```

## Contributing

This is open source and free forever. Contributions welcome!

Some ideas for future enhancements:

- Prestige system (reset for permanent multipliers)
- Achievements
- More agent types and behaviors
- Ambient sound toggle
- Themes / custom color palettes
- Statistics graphs
- Touch gestures for mobile

## License

MIT — see [LICENSE](LICENSE).
