import { CONFIG } from './config.js';
import { Game, saveGame, loadGame, exportSave, importSave, wipeSave } from './game.js';
import { World } from './world.js';
import { UI } from './ui.js';
import { MusicPlayer } from './music.js';

let game, world, ui, music;
let lastFrame = 0;
let lastUIUpdate = 0;
let lastAutoSave = 0;
let running = true;

function showSaveIndicator() {
  const el = document.getElementById('save-indicator');
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 1500);
}

function hideHint() {
  const el = document.getElementById('hint');
  if (el) el.classList.add('hidden');
}

function doSave() {
  saveGame(game);
  showSaveIndicator();
}

function init() {
  const canvas = document.getElementById('world');
  const saved = loadGame();

  music = new MusicPlayer((state) => {
    ui.updateMusicBtn(music.isPlaying());
  });
  music.init();

  if (saved) {
    game = saved;
    hideHint();
    const offline = game.offlineProgress(game.lastSave);
    world = new World(canvas);
    ui = new UI(game, uiCallbacks());
    world.syncPlants(game.plants);
    if (offline) {
      ui.showWelcomeBack(offline.elapsed, offline.earned);
    }
  } else {
    game = new Game();
    world = new World(canvas);
    ui = new UI(game, uiCallbacks());
    world.syncPlants(game.plants);
    ui.toast('Welcome to your garden! Your first herb is planted.');
    setTimeout(hideHint, 15000);
  }

  window.addEventListener('resize', () => world.resize());

  canvas.addEventListener('click', (e) => {
    hideHint();
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    world.burstAt(x, y);
    const bonus = Math.max(1, game.generationRate * 0.5);
    game.sunlight += bonus;
    game.totalSunlight += bonus;
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.getElementById('panel').classList.remove('open');
    }
    if (e.key === 'Tab' && !e.ctrlKey && !e.metaKey) {
      if (document.activeElement === document.body || document.activeElement === canvas) {
        e.preventDefault();
        document.getElementById('panel').classList.toggle('open');
        hideHint();
      }
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      doSave();
      running = false;
    } else {
      const offline = game.offlineProgress(game.lastSave);
      if (offline && offline.earned > 0) {
        ui.toast(`+${fmtQuick(offline.earned)} sunlight while away`);
      }
      running = true;
      lastFrame = performance.now();
    }
  });

  window.addEventListener('beforeunload', () => doSave());

  lastFrame = performance.now();
  requestAnimationFrame(loop);
}

function uiCallbacks() {
  return {
    onBuyPlant(type) {
      if (game.buyPlant(type)) {
        world.syncPlants(game.plants);
        ui.refresh();
      }
    },
    onBuyUpgrade(id) {
      if (game.buyUpgrade(id)) {
        ui.refresh();
      }
    },
    onExport() {
      return exportSave(game);
    },
    onImport(data) {
      const imported = importSave(data);
      if (imported) {
        game = imported;
        ui.game = game;
        world.syncPlants(game.plants);
        ui.refresh();
        ui.toast('Save imported successfully!');
      } else {
        ui.toast('Invalid save data.');
      }
    },
    onReset() {
      wipeSave();
      game = new Game();
      ui.game = game;
      world.syncPlants(game.plants);
      ui.refresh();
      ui.toast('Garden cleared. A fresh start.');
    },
    onMusicToggle() {
      music.toggle();
      setTimeout(() => ui.updateMusicBtn(music.isPlaying()), 200);
    },
    onMusicVolume(v) {
      music.setVolume(v);
    },
  };
}

const frameInterval = 1000 / CONFIG.CANVAS_FPS;
let lastRender = 0;

function loop(now) {
  requestAnimationFrame(loop);
  if (!running) return;

  const rawDt = Math.min(now - lastFrame, 200);
  lastFrame = now;

  const result = game.tick(rawDt);

  if (result.autoPlanted) {
    world.syncPlants(game.plants);
  }

  const milestones = game.checkMilestones();
  for (const m of milestones) ui.toast(m.msg);

  if (now - lastRender >= frameInterval) {
    lastRender = now;
    const dt = rawDt / 1000;
    world.update(dt, game.glowMultiplier);
    world.draw(game.currentSeason, game.glowMultiplier);
  }

  if (now - lastUIUpdate > CONFIG.UI_UPDATE_MS) {
    lastUIUpdate = now;
    ui.refresh();
  }

  if (now - lastAutoSave > CONFIG.AUTO_SAVE_MS) {
    lastAutoSave = now;
    doSave();
  }
}

function fmtQuick(n) {
  if (n < 1000) return Math.floor(n).toString();
  const s = ['', 'K', 'M', 'B', 'T'];
  const t = Math.min(Math.floor(Math.log10(n) / 3), s.length - 1);
  return (n / Math.pow(10, t * 3)).toFixed(1) + s[t];
}

init();
