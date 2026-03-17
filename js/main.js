import { CONFIG } from './config.js';
import { Game, saveGame, loadGame, exportSave, importSave, wipeSave } from './game.js';
import { World } from './world.js';
import { UI } from './ui.js';

let game, world, ui;
let lastFrame = 0;
let lastUIUpdate = 0;
let lastAutoSave = 0;
let running = true;

function init() {
  const canvas = document.getElementById('world');
  const saved = loadGame();

  if (saved) {
    game = saved;
    const offline = game.offlineProgress(game.lastSave);
    world = new World(canvas);
    ui = new UI(game, uiCallbacks());
    world.syncAgents(game.agents);
    if (offline) {
      ui.showWelcomeBack(offline.elapsed, offline.earned);
    }
  } else {
    game = new Game();
    world = new World(canvas);
    ui = new UI(game, uiCallbacks());
    world.syncAgents(game.agents);
    ui.toast('Welcome! Your first agent has arrived.');
  }

  window.addEventListener('resize', () => world.resize());

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      saveGame(game);
      running = false;
    } else {
      const offline = game.offlineProgress(game.lastSave);
      if (offline && offline.earned > 0) {
        ui.toast(`+${formatNumQuick(offline.earned)} stardust while away`);
      }
      running = true;
      lastFrame = performance.now();
    }
  });

  lastFrame = performance.now();
  requestAnimationFrame(loop);
}

function uiCallbacks() {
  return {
    onBuyAgent(type) {
      if (game.buyAgent(type)) {
        world.syncAgents(game.agents);
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
        world.syncAgents(game.agents);
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
      world.syncAgents(game.agents);
      ui.refresh();
      ui.toast('Game reset. A new beginning.');
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

  game.tick(rawDt);

  const milestones = game.checkMilestones();
  for (const m of milestones) ui.toast(m.msg);

  if (now - lastRender >= frameInterval) {
    lastRender = now;
    const dt = rawDt / 1000;
    world.syncAgents(game.agents);
    world.update(dt, game.speedMultiplier);
    world.draw(game.currentEra);
  }

  if (now - lastUIUpdate > CONFIG.UI_UPDATE_MS) {
    lastUIUpdate = now;
    ui.refresh();
  }

  if (now - lastAutoSave > CONFIG.AUTO_SAVE_MS) {
    lastAutoSave = now;
    saveGame(game);
  }
}

function formatNumQuick(n) {
  if (n < 1000) return Math.floor(n).toString();
  const s = ['', 'K', 'M', 'B', 'T'];
  const t = Math.min(Math.floor(Math.log10(n) / 3), s.length - 1);
  return (n / Math.pow(10, t * 3)).toFixed(1) + s[t];
}

init();
