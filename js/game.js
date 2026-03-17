import { CONFIG } from './config.js';

export class Game {
  constructor() {
    this.stardust = 0;
    this.totalStardust = 0;
    this.agents = {};
    this.upgrades = {};
    this.milestonesSeen = [];
    this.startTime = Date.now();
    this.lastSave = Date.now();

    for (const t of Object.keys(CONFIG.AGENT_TYPES)) this.agents[t] = 0;
    for (const u of Object.keys(CONFIG.UPGRADES)) this.upgrades[u] = 0;

    this.agents.wanderer = 1;
    this._autoSpawnTimer = 0;
  }

  get totalAgents() {
    let n = 0;
    for (const v of Object.values(this.agents)) n += v;
    return n;
  }

  get currentEra() {
    for (let i = CONFIG.ERAS.length - 1; i >= 0; i--) {
      if (this.totalStardust >= CONFIG.ERAS[i].threshold) return CONFIG.ERAS[i];
    }
    return CONFIG.ERAS[0];
  }

  get generationRate() {
    let base = 0;
    for (const [type, count] of Object.entries(this.agents)) {
      base += CONFIG.AGENT_TYPES[type].generation * count;
    }
    return base * (1 + (this.upgrades.genRate || 0) * 0.5);
  }

  get speedMultiplier() {
    return 1 + (this.upgrades.agentSpeed || 0) * 0.2;
  }

  agentCost(type) {
    const c = CONFIG.AGENT_TYPES[type];
    return Math.floor(c.baseCost * Math.pow(c.costScale, this.agents[type]));
  }

  upgradeCost(id) {
    const c = CONFIG.UPGRADES[id];
    return Math.floor(c.baseCost * Math.pow(c.costScale, this.upgrades[id]));
  }

  isUnlocked(type) {
    return this.totalStardust >= CONFIG.AGENT_TYPES[type].unlockAt;
  }

  buyAgent(type) {
    const cost = this.agentCost(type);
    if (this.stardust < cost || !this.isUnlocked(type)) return false;
    this.stardust -= cost;
    this.agents[type]++;
    return true;
  }

  buyUpgrade(id) {
    const c = CONFIG.UPGRADES[id];
    const cost = this.upgradeCost(id);
    if (this.stardust < cost || this.upgrades[id] >= c.maxLevel) return false;
    this.stardust -= cost;
    this.upgrades[id]++;
    return true;
  }

  tick(dtMs) {
    const dtSec = dtMs / 1000;
    const earned = this.generationRate * dtSec;
    this.stardust += earned;
    this.totalStardust += earned;

    if (this.upgrades.autoSpawn > 0) {
      const interval = Math.max(6, 30 - this.upgrades.autoSpawn * 2);
      this._autoSpawnTimer += dtSec;
      if (this._autoSpawnTimer >= interval) {
        this._autoSpawnTimer -= interval;
        this.agents.wanderer++;
        return { autoSpawned: true };
      }
    }
    return { autoSpawned: false };
  }

  offlineProgress(savedTime) {
    const now = Date.now();
    const elapsed = now - savedTime;
    if (elapsed < 2000) return null;
    const mult = 0.5 + (this.upgrades.offlineBonus || 0) * 0.1;
    const earned = this.generationRate * (elapsed / 1000) * mult;
    this.stardust += earned;
    this.totalStardust += earned;
    this.lastSave = now;
    return { elapsed, earned };
  }

  checkMilestones() {
    const fresh = [];
    CONFIG.MILESTONES.forEach((m, i) => {
      if (this.totalStardust >= m.at && !this.milestonesSeen.includes(i)) {
        this.milestonesSeen.push(i);
        fresh.push(m);
      }
    });
    return fresh;
  }

  toJSON() {
    return {
      v: 1,
      stardust: this.stardust,
      totalStardust: this.totalStardust,
      agents: { ...this.agents },
      upgrades: { ...this.upgrades },
      milestonesSeen: [...this.milestonesSeen],
      startTime: this.startTime,
      lastSave: Date.now(),
    };
  }

  static fromJSON(d) {
    const g = new Game();
    g.stardust = d.stardust || 0;
    g.totalStardust = d.totalStardust || 0;
    g.startTime = d.startTime || Date.now();
    g.lastSave = d.lastSave || Date.now();
    g.milestonesSeen = d.milestonesSeen || [];
    if (d.agents) for (const t of Object.keys(CONFIG.AGENT_TYPES)) g.agents[t] = d.agents[t] || 0;
    if (d.upgrades) for (const u of Object.keys(CONFIG.UPGRADES)) g.upgrades[u] = d.upgrades[u] || 0;
    return g;
  }
}

const SAVE_KEY = 'idle_agents_save';

export function saveGame(game) {
  try {
    game.lastSave = Date.now();
    localStorage.setItem(SAVE_KEY, JSON.stringify(game.toJSON()));
  } catch (_) { /* storage full or unavailable */ }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return Game.fromJSON(JSON.parse(raw));
  } catch (_) {
    return null;
  }
}

export function exportSave(game) {
  return btoa(JSON.stringify(game.toJSON()));
}

export function importSave(str) {
  try {
    return Game.fromJSON(JSON.parse(atob(str)));
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
