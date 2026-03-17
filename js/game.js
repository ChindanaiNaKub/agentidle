import { CONFIG } from './config.js';

export class Game {
  constructor() {
    this.sunlight = 0;
    this.totalSunlight = 0;
    this.plants = {};
    this.upgrades = {};
    this.milestonesSeen = [];
    this.startTime = Date.now();
    this.lastSave = Date.now();

    for (const t of Object.keys(CONFIG.PLANT_TYPES)) this.plants[t] = 0;
    for (const u of Object.keys(CONFIG.UPGRADES)) this.upgrades[u] = 0;

    this.plants.herb = 1;
    this._autoPlantTimer = 0;
  }

  get totalPlants() {
    let n = 0;
    for (const v of Object.values(this.plants)) n += v;
    return n;
  }

  get currentSeason() {
    for (let i = CONFIG.SEASONS.length - 1; i >= 0; i--) {
      if (this.totalSunlight >= CONFIG.SEASONS[i].threshold) return CONFIG.SEASONS[i];
    }
    return CONFIG.SEASONS[0];
  }

  get generationRate() {
    let base = 0;
    for (const [type, count] of Object.entries(this.plants)) {
      base += CONFIG.PLANT_TYPES[type].generation * count;
    }
    return base * (1 + (this.upgrades.growthSpeed || 0) * 0.5);
  }

  get glowMultiplier() {
    return 1 + (this.upgrades.gardenBeauty || 0) * 0.2;
  }

  plantCost(type) {
    const c = CONFIG.PLANT_TYPES[type];
    return Math.floor(c.baseCost * Math.pow(c.costScale, this.plants[type]));
  }

  upgradeCost(id) {
    const c = CONFIG.UPGRADES[id];
    return Math.floor(c.baseCost * Math.pow(c.costScale, this.upgrades[id]));
  }

  isUnlocked(type) {
    return this.totalSunlight >= CONFIG.PLANT_TYPES[type].unlockAt;
  }

  buyPlant(type) {
    const cost = this.plantCost(type);
    if (this.sunlight < cost || !this.isUnlocked(type)) return false;
    this.sunlight -= cost;
    this.plants[type]++;
    return true;
  }

  buyUpgrade(id) {
    const c = CONFIG.UPGRADES[id];
    const cost = this.upgradeCost(id);
    if (this.sunlight < cost || this.upgrades[id] >= c.maxLevel) return false;
    this.sunlight -= cost;
    this.upgrades[id]++;
    return true;
  }

  tick(dtMs) {
    const dtSec = dtMs / 1000;
    const earned = this.generationRate * dtSec;
    this.sunlight += earned;
    this.totalSunlight += earned;

    if (this.upgrades.autoPlant > 0) {
      const interval = Math.max(6, 30 - this.upgrades.autoPlant * 2);
      this._autoPlantTimer += dtSec;
      if (this._autoPlantTimer >= interval) {
        this._autoPlantTimer -= interval;
        this.plants.herb++;
        return { autoPlanted: true };
      }
    }
    return { autoPlanted: false };
  }

  offlineProgress(savedTime) {
    const now = Date.now();
    const elapsed = now - savedTime;
    if (elapsed < 2000) return null;
    const mult = 0.5 + (this.upgrades.offlineGrowth || 0) * 0.1;
    const earned = this.generationRate * (elapsed / 1000) * mult;
    this.sunlight += earned;
    this.totalSunlight += earned;
    this.lastSave = now;
    return { elapsed, earned };
  }

  checkMilestones() {
    const fresh = [];
    CONFIG.MILESTONES.forEach((m, i) => {
      if (this.totalSunlight >= m.at && !this.milestonesSeen.includes(i)) {
        this.milestonesSeen.push(i);
        fresh.push(m);
      }
    });
    return fresh;
  }

  toJSON() {
    return {
      v: 2,
      sunlight: this.sunlight,
      totalSunlight: this.totalSunlight,
      plants: { ...this.plants },
      upgrades: { ...this.upgrades },
      milestonesSeen: [...this.milestonesSeen],
      startTime: this.startTime,
      lastSave: Date.now(),
    };
  }

  static fromJSON(d) {
    const g = new Game();
    if (!d || d.v !== 2) return g;
    g.sunlight = d.sunlight || 0;
    g.totalSunlight = d.totalSunlight || 0;
    g.startTime = d.startTime || Date.now();
    g.lastSave = d.lastSave || Date.now();
    g.milestonesSeen = d.milestonesSeen || [];
    if (d.plants) for (const t of Object.keys(CONFIG.PLANT_TYPES)) g.plants[t] = d.plants[t] || 0;
    if (d.upgrades) for (const u of Object.keys(CONFIG.UPGRADES)) g.upgrades[u] = d.upgrades[u] || 0;
    return g;
  }
}

const SAVE_KEY = 'idle_garden_save';

export function saveGame(game) {
  try {
    game.lastSave = Date.now();
    localStorage.setItem(SAVE_KEY, JSON.stringify(game.toJSON()));
  } catch (_) {}
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (!d || d.v !== 2) return null;
    return Game.fromJSON(d);
  } catch (_) {
    return null;
  }
}

export function exportSave(game) {
  return btoa(JSON.stringify(game.toJSON()));
}

export function importSave(str) {
  try {
    const d = JSON.parse(atob(str));
    if (!d || d.v !== 2) return null;
    return Game.fromJSON(d);
  } catch (_) {
    return null;
  }
}

export function wipeSave() {
  localStorage.removeItem(SAVE_KEY);
}

export function formatNum(n) {
  if (n < 0) return '-' + formatNum(-n);
  if (n < 1000) return Math.floor(n).toString();
  const suffixes = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi'];
  const tier = Math.min(Math.floor(Math.log10(n) / 3), suffixes.length - 1);
  const scaled = n / Math.pow(10, tier * 3);
  return scaled.toFixed(scaled < 10 ? 2 : scaled < 100 ? 1 : 0) + suffixes[tier];
}

export function formatTime(ms) {
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ${sec % 60}s`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ${min % 60}m`;
  const days = Math.floor(hr / 24);
  return `${days}d ${hr % 24}h`;
}
