import { CONFIG } from './config.js';
import { formatNum, formatTime } from './game.js';

export class UI {
  constructor(game, callbacks) {
    this.game = game;
    this.callbacks = callbacks;
    this._lastSeason = null;

    this.els = {
      sunlight: document.getElementById('sunlight-count'),
      rate: document.getElementById('sunlight-rate'),
      plantCount: document.getElementById('plant-count'),
      seasonName: document.getElementById('season-name'),
      panelToggle: document.getElementById('panel-toggle'),
      panel: document.getElementById('panel'),
      tabs: document.querySelectorAll('#panel-tabs .tab'),
      tabPlants: document.getElementById('tab-plants'),
      tabUpgrades: document.getElementById('tab-upgrades'),
      tabStats: document.getElementById('tab-stats'),
      notifications: document.getElementById('notifications'),
      modal: document.getElementById('welcome-modal'),
      offlineMsg: document.getElementById('offline-message'),
      closeModal: document.getElementById('close-modal'),
      musicToggle: document.getElementById('music-toggle'),
      musicVolume: document.getElementById('music-volume'),
    };

    this._buildPlantButtons();
    this._buildUpgradeButtons();
    this._buildStatsPanel();
    this._bindEvents();
  }

  _bindEvents() {
    this.els.panelToggle.addEventListener('click', () => {
      this.els.panel.classList.toggle('open');
    });

    this.els.tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        this.els.tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
      });
    });

    this.els.closeModal.addEventListener('click', () => {
      this.els.modal.classList.remove('show');
    });

    this.els.musicToggle.addEventListener('click', () => this.callbacks.onMusicToggle());
    this.els.musicVolume.addEventListener('input', (e) => {
      this.callbacks.onMusicVolume(parseInt(e.target.value, 10));
    });

    document.getElementById('btn-export').addEventListener('click', () => {
      const data = this.callbacks.onExport();
      navigator.clipboard.writeText(data).then(() => {
        this.toast('Save copied to clipboard!');
      }).catch(() => {
        prompt('Copy this save data:', data);
      });
    });

    document.getElementById('btn-import').addEventListener('click', () => {
      const data = prompt('Paste save data:');
      if (data) this.callbacks.onImport(data);
    });

    document.getElementById('btn-reset').addEventListener('click', () => {
      if (confirm('Reset ALL progress? This cannot be undone.')) {
        this.callbacks.onReset();
      }
    });
  }

  _buildPlantButtons() {
    const container = this.els.tabPlants;
    container.innerHTML = '';
    for (const [type, cfg] of Object.entries(CONFIG.PLANT_TYPES)) {
      const div = document.createElement('div');
      div.className = 'shop-item';
      div.dataset.type = type;
      div.innerHTML = `
        <div class="shop-dot" style="background:${cfg.color}"></div>
        <div class="shop-info">
          <div class="shop-name">${cfg.name} <span class="shop-count" id="count-${type}">×0</span></div>
          <div class="shop-desc">${cfg.description}</div>
        </div>
        <button class="shop-buy" id="buy-${type}">
          <span class="shop-cost" id="cost-${type}">10</span> ☀
        </button>
      `;
      div.querySelector('button').addEventListener('click', () => this.callbacks.onBuyPlant(type));
      container.appendChild(div);
    }
  }

  _buildUpgradeButtons() {
    const container = this.els.tabUpgrades;
    container.innerHTML = '';
    for (const [id, cfg] of Object.entries(CONFIG.UPGRADES)) {
      const div = document.createElement('div');
      div.className = 'shop-item';
      div.dataset.upgrade = id;
      div.innerHTML = `
        <div class="shop-icon">${cfg.icon}</div>
        <div class="shop-info">
          <div class="shop-name">${cfg.name} <span class="shop-count" id="ulvl-${id}">0/${cfg.maxLevel}</span></div>
          <div class="shop-desc">${cfg.description}</div>
        </div>
        <button class="shop-buy" id="ubuy-${id}">
          <span class="shop-cost" id="ucost-${id}">0</span> ☀
        </button>
      `;
      div.querySelector('button').addEventListener('click', () => this.callbacks.onBuyUpgrade(id));
      container.appendChild(div);
    }
  }

  _buildStatsPanel() {
    this.els.tabStats.innerHTML = `
      <div class="stats-grid">
        <div class="stat-row"><span>Total Harvested</span><span id="stat-total">0</span></div>
        <div class="stat-row"><span>Total Plants</span><span id="stat-plants">0</span></div>
        <div class="stat-row"><span>Time Gardening</span><span id="stat-time">0s</span></div>
        <div class="stat-row"><span>Current Season</span><span id="stat-season">Spring</span></div>
      </div>
      <div class="stats-actions">
        <button id="btn-export" class="action-btn">Export Save</button>
        <button id="btn-import" class="action-btn">Import Save</button>
        <button id="btn-reset" class="action-btn danger">Reset Garden</button>
      </div>
    `;
  }

  refresh() {
    const g = this.game;

    this.els.sunlight.textContent = formatNum(g.sunlight);
    this.els.rate.textContent = formatNum(g.generationRate) + '/s';
    this.els.plantCount.textContent = g.totalPlants;
    this.els.seasonName.textContent = g.currentSeason.name;

    const season = g.currentSeason;
    if (this._lastSeason !== season.name) {
      this._lastSeason = season.name;
      document.getElementById('stats-bar').style.color = season.text;
    }

    for (const [type] of Object.entries(CONFIG.PLANT_TYPES)) {
      const item = this.els.tabPlants.querySelector(`[data-type="${type}"]`);
      const unlocked = g.isUnlocked(type);
      item.classList.toggle('locked', !unlocked);
      item.classList.toggle('affordable', unlocked && g.sunlight >= g.plantCost(type));
      document.getElementById(`count-${type}`).textContent = `×${g.plants[type]}`;
      document.getElementById(`cost-${type}`).textContent = formatNum(g.plantCost(type));
    }

    for (const [id, cfg] of Object.entries(CONFIG.UPGRADES)) {
      const maxed = g.upgrades[id] >= cfg.maxLevel;
      const btn = document.getElementById(`ubuy-${id}`);
      const item = btn.closest('.shop-item');
      item.classList.toggle('maxed', maxed);
      item.classList.toggle('affordable', !maxed && g.sunlight >= g.upgradeCost(id));
      document.getElementById(`ulvl-${id}`).textContent = `${g.upgrades[id]}/${cfg.maxLevel}`;
      document.getElementById(`ucost-${id}`).textContent = maxed ? 'MAX' : formatNum(g.upgradeCost(id));
      btn.disabled = maxed;
    }

    document.getElementById('stat-total').textContent = formatNum(g.totalSunlight);
    document.getElementById('stat-plants').textContent = g.totalPlants;
    document.getElementById('stat-time').textContent = formatTime(Date.now() - g.startTime);
    document.getElementById('stat-season').textContent = season.name;
  }

  updateMusicBtn(playing) {
    this.els.musicToggle.textContent = playing ? '⏸ Lofi' : '▶ Lofi';
    this.els.musicToggle.classList.toggle('playing', playing);
  }

  showWelcomeBack(elapsed, earned) {
    this.els.offlineMsg.textContent =
      `You were away for ${formatTime(elapsed)} and your garden grew ${formatNum(earned)} sunlight!`;
    this.els.modal.classList.add('show');
  }

  toast(message) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = message;
    this.els.notifications.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 400);
    }, 3500);
  }
}
