import { CONFIG } from './config.js';

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
    this.angle = Math.random() * Math.PI * 2;
    this.targetAngle = this.angle;
    this.turnTimer = 0;
    this.turnInterval = 1 + Math.random() * 3;
    this.particleTimer = Math.random() * 2;
  }

  update(dt, speedMult, w, h) {
    this.turnTimer += dt;
    if (this.turnTimer >= this.turnInterval) {
      this.turnTimer = 0;
      this.turnInterval = 1 + Math.random() * 3;
      this.targetAngle = this.angle + (Math.random() - 0.5) * Math.PI;
    }

    const turnSpeed = 1.5 * dt;
    let diff = this.targetAngle - this.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.angle += Math.sign(diff) * Math.min(Math.abs(diff), turnSpeed);

    const margin = 40;
    if (this.x < margin) this.targetAngle = 0;
    else if (this.x > w - margin) this.targetAngle = Math.PI;
    if (this.y < margin) this.targetAngle = Math.PI / 2;
    else if (this.y > h - margin) this.targetAngle = -Math.PI / 2;

    const speed = this.baseSpeed * speedMult * 60;
    this.x += Math.cos(this.angle) * speed * dt;
    this.y += Math.sin(this.angle) * speed * dt;

    this.x = Math.max(4, Math.min(w - 4, this.x));
    this.y = Math.max(4, Math.min(h - 4, this.y));

    this.particleTimer -= dt;
  }
}

class Particle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 10;
    this.vy = -12 - Math.random() * 18;
    this.life = 1;
    this.decay = 0.4 + Math.random() * 0.4;
    this.color = color;
    this.size = 1 + Math.random();
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
      const desired = Math.max(1, Math.round(count * scale));
      if (count === 0) continue;
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
    for (const a of this.agents) {
      a.update(dt, speedMult, this.w, this.h);
      if (a.particleTimer <= 0 && this.particles.length < CONFIG.MAX_PARTICLES) {
        a.particleTimer = 1.5 + Math.random() * 2;
        this.particles.push(new Particle(a.x, a.y, a.color));
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

    if (!this._bgCanvas || this._bgEra !== era.name) this._buildBg(era);
    ctx.drawImage(this._bgCanvas, 0, 0);

    ctx.globalAlpha = 1;
    for (const d of this.ambientDots) {
      if (d.x > this.w || d.y > this.h) continue;
      ctx.globalAlpha = d.alpha;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
    }

    const seekers = [];
    for (const a of this.agents) {
      if (a.type === 'seeker') seekers.push(a);

      ctx.globalAlpha = 0.15;
      ctx.beginPath();
      ctx.arc(a.x, a.y, a.radius * 3.5, 0, Math.PI * 2);
      ctx.fillStyle = a.glowColor;
      ctx.fill();

      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.arc(a.x, a.y, a.radius, 0, Math.PI * 2);
      ctx.fillStyle = a.color;
      ctx.fill();
    }

    if (seekers.length > 1) {
      ctx.globalAlpha = 0.08;
      ctx.strokeStyle = CONFIG.AGENT_TYPES.seeker.color;
      ctx.lineWidth = 0.5;
      for (let i = 0; i < seekers.length; i++) {
        for (let j = i + 1; j < seekers.length; j++) {
          const dx = seekers[j].x - seekers[i].x;
          const dy = seekers[j].y - seekers[i].y;
          if (dx * dx + dy * dy < 40000) {
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
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
    }

    ctx.globalAlpha = 1;
  }
}
