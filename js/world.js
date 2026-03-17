import { CONFIG } from './config.js';

const TAU = Math.PI * 2;

class VisualAgent {
  constructor(type, w, h) {
    const cfg = CONFIG.AGENT_TYPES[type];
    this.type = type;
    this.x = Math.random() * w;
    this.y = Math.random() * h;
    this.radius = cfg.radius;
    this.color = cfg.color;
    this.glowColor = cfg.glowColor;
    this.baseSpeed = cfg.speed;
    this.angle = Math.random() * TAU;
    this.targetAngle = this.angle;
    this.turnTimer = 0;
    this.turnInterval = 1 + Math.random() * 3;
    this.particleTimer = Math.random() * 2;
    this.phase = Math.random() * TAU;
    this.orbitAngle = Math.random() * TAU;
    this.orbitCenter = { x: this.x, y: this.y };
  }

  update(dt, speedMult, w, h, time) {
    this.phase += dt * 2;

    if (this.type === 'sage') {
      this.orbitAngle += dt * 0.4 * speedMult;
      const orbitR = 50 + Math.sin(time * 0.3 + this.phase) * 20;
      const tx = this.orbitCenter.x + Math.cos(this.orbitAngle) * orbitR;
      const ty = this.orbitCenter.y + Math.sin(this.orbitAngle) * orbitR;
      this.x += (tx - this.x) * dt * 2;
      this.y += (ty - this.y) * dt * 2;

      if (this.orbitAngle > TAU * 3) {
        this.orbitAngle = 0;
        this.orbitCenter.x = 60 + Math.random() * (w - 120);
        this.orbitCenter.y = 80 + Math.random() * (h - 160);
      }
    } else {
      this.turnTimer += dt;
      if (this.turnTimer >= this.turnInterval) {
        this.turnTimer = 0;
        this.turnInterval = 1 + Math.random() * 3;
        this.targetAngle = this.angle + (Math.random() - 0.5) * Math.PI;
      }

      const turnSpeed = 1.5 * dt;
      let diff = this.targetAngle - this.angle;
      while (diff > Math.PI) diff -= TAU;
      while (diff < -Math.PI) diff += TAU;
      this.angle += Math.sign(diff) * Math.min(Math.abs(diff), turnSpeed);

      const margin = 40;
      if (this.x < margin) this.targetAngle = 0;
      else if (this.x > w - margin) this.targetAngle = Math.PI;
      if (this.y < margin) this.targetAngle = Math.PI / 2;
      else if (this.y > h - margin) this.targetAngle = -Math.PI / 2;

      const speed = this.baseSpeed * speedMult * 60;
      this.x += Math.cos(this.angle) * speed * dt;
      this.y += Math.sin(this.angle) * speed * dt;
    }

    this.x = Math.max(4, Math.min(w - 4, this.x));
    this.y = Math.max(4, Math.min(h - 4, this.y));
    this.particleTimer -= dt;
  }
}

class Particle {
  constructor(x, y, color, big) {
    this.x = x;
    this.y = y;
    const spread = big ? 30 : 10;
    const lift = big ? 25 : 18;
    this.vx = (Math.random() - 0.5) * spread;
    this.vy = -lift * (0.5 + Math.random());
    this.life = 1;
    this.decay = big ? 0.3 : (0.4 + Math.random() * 0.4);
    this.color = color;
    this.size = big ? (1.5 + Math.random() * 1.5) : (1 + Math.random());
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vy *= 0.98;
    this.life -= this.decay * dt;
  }

  get alive() {
    return this.life > 0;
  }
}

export class World {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.agents = [];
    this.particles = [];
    this.ambientDots = [];
    this._bgCanvas = null;
    this._bgEra = null;
    this.time = 0;
    this.resize();
    this._initAmbient();
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.canvas.width = this.w * dpr;
    this.canvas.height = this.h * dpr;
    this.canvas.style.width = this.w + 'px';
    this.canvas.style.height = this.h + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this._bgCanvas = null;
  }

  _initAmbient() {
    this.ambientDots = [];
    for (let i = 0; i < 30; i++) {
      this.ambientDots.push({
        x: Math.random() * this.w,
        y: Math.random() * this.h,
        r: 0.5 + Math.random() * 1.5,
        speed: 2 + Math.random() * 5,
        alpha: 0.05 + Math.random() * 0.1,
      });
    }
  }

  _buildBg(era) {
    const c = document.createElement('canvas');
    c.width = this.w;
    c.height = this.h;
    const ctx = c.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, this.w * 0.3, this.h);
    grad.addColorStop(0, era.bg[0]);
    grad.addColorStop(1, era.bg[1]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.w, this.h);
    this._bgCanvas = c;
    this._bgEra = era.name;
  }

  burstAt(x, y) {
    const colors = ['#ffb347', '#77dd77', '#79d4f1', '#b19cd9', '#fdfd96', '#fff'];
    for (let i = 0; i < 8; i++) {
      if (this.particles.length >= CONFIG.MAX_PARTICLES + 20) break;
      this.particles.push(new Particle(x, y, colors[Math.floor(Math.random() * colors.length)], true));
    }
  }

  syncAgents(gameCounts) {
    const typeMap = {};
    for (const a of this.agents) {
      if (!typeMap[a.type]) typeMap[a.type] = [];
      typeMap[a.type].push(a);
    }

    const maxVisual = CONFIG.MAX_VISUAL_AGENTS;
    let totalDesired = 0;
    for (const v of Object.values(gameCounts)) totalDesired += v;
    const scale = totalDesired > maxVisual ? maxVisual / totalDesired : 1;

    const next = [];
    for (const [type, count] of Object.entries(gameCounts)) {
      if (count === 0) continue;
      const desired = Math.max(1, Math.round(count * scale));
      const existing = typeMap[type] || [];
      for (let i = 0; i < Math.min(desired, existing.length); i++) {
        next.push(existing[i]);
      }
      for (let i = existing.length; i < desired; i++) {
        next.push(new VisualAgent(type, this.w, this.h));
      }
    }
    this.agents = next;
  }

  update(dt, speedMult) {
    this.time += dt;

    for (const a of this.agents) {
      a.update(dt, speedMult, this.w, this.h, this.time);
      if (a.particleTimer <= 0 && this.particles.length < CONFIG.MAX_PARTICLES) {
        a.particleTimer = 1.5 + Math.random() * 2;
        this.particles.push(new Particle(a.x, a.y, a.color, false));
      }
    }

    for (const d of this.ambientDots) {
      d.y -= d.speed * dt;
      if (d.y < -10) { d.y = this.h + 10; d.x = Math.random() * this.w; }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update(dt);
      if (!this.particles[i].alive) this.particles.splice(i, 1);
    }
  }

  draw(era) {
    const ctx = this.ctx;
    const t = this.time;

    if (!this._bgCanvas || this._bgEra !== era.name) this._buildBg(era);
    ctx.drawImage(this._bgCanvas, 0, 0);

    for (const d of this.ambientDots) {
      if (d.x > this.w || d.y > this.h || d.x < 0 || d.y < 0) continue;
      ctx.globalAlpha = d.alpha;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, TAU);
      ctx.fillStyle = '#fff';
      ctx.fill();
    }

    const seekers = [];
    for (const a of this.agents) {
      if (a.type === 'seeker') seekers.push(a);

      const pulse = 1 + Math.sin(t * 2 + a.phase) * 0.15;
      const glowR = a.radius * 3.5 * pulse;

      ctx.globalAlpha = 0.18 * pulse;
      ctx.beginPath();
      ctx.arc(a.x, a.y, glowR, 0, TAU);
      ctx.fillStyle = a.glowColor;
      ctx.fill();

      ctx.globalAlpha = 0.92;
      ctx.beginPath();
      ctx.arc(a.x, a.y, a.radius, 0, TAU);
      ctx.fillStyle = a.color;
      ctx.fill();

      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.arc(a.x - a.radius * 0.25, a.y - a.radius * 0.25, a.radius * 0.35, 0, TAU);
      ctx.fillStyle = '#fff';
      ctx.fill();
    }

    if (seekers.length > 1) {
      ctx.strokeStyle = CONFIG.AGENT_TYPES.seeker.color;
      ctx.lineWidth = 0.5;
      for (let i = 0; i < seekers.length; i++) {
        for (let j = i + 1; j < seekers.length; j++) {
          const dx = seekers[j].x - seekers[i].x;
          const dy = seekers[j].y - seekers[i].y;
          const distSq = dx * dx + dy * dy;
          if (distSq < 40000) {
            ctx.globalAlpha = 0.12 * (1 - distSq / 40000);
            ctx.beginPath();
            ctx.moveTo(seekers[i].x, seekers[i].y);
            ctx.lineTo(seekers[j].x, seekers[j].y);
            ctx.stroke();
          }
        }
      }
    }

    for (const p of this.particles) {
      ctx.globalAlpha = p.life * 0.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, TAU);
      ctx.fillStyle = p.color;
      ctx.fill();
    }

    ctx.globalAlpha = 1;
  }
}
