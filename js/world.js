import { CONFIG } from './config.js';

const TAU = Math.PI * 2;
function lerp(a, b, t) { return a + (b - a) * Math.min(1, Math.max(0, t)); }

class VisualPlant {
  constructor(type, x, groundY) {
    this.type = type;
    this.x = x;
    this.groundY = groundY;
    this.growth = 0;
    this.phase = Math.random() * TAU;
    this.swaySpeed = 0.7 + Math.random() * 0.5;
    this.swayAmt = 1.2 + Math.random() * 1.8;
  }

  update(dt) {
    const gt = CONFIG.PLANT_TYPES[this.type].growTime;
    if (this.growth < 1) this.growth = Math.min(1, this.growth + dt / gt);
  }

  get stage() {
    if (this.growth < 0.08) return 0;
    if (this.growth < 0.25) return 1;
    if (this.growth < 0.55) return 2;
    if (this.growth < 0.85) return 3;
    return 4;
  }
}

class Particle {
  constructor(x, y, color, vx, vy, life, size) {
    this.x = x; this.y = y;
    this.color = color;
    this.vx = vx; this.vy = vy;
    this.life = life; this.maxLife = life;
    this.size = size;
  }
  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
  }
  get alive() { return this.life > 0; }
}

export class World {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.plants = [];
    this.particles = [];
    this.time = 0;
    this._bgCache = null;
    this._bgSeason = null;
    this._grass = [];
    this.resize();
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
    this.groundY = Math.floor(this.h * (1 - CONFIG.GROUND_RATIO));
    this._bgCache = null;
    this._genGrass();
  }

  _genGrass() {
    this._grass = [];
    for (let x = 0; x < this.w; x += 6 + Math.random() * 4) {
      this._grass.push({
        x,
        h: 3 + Math.random() * 6,
        lean: (Math.random() - 0.5) * 0.3,
      });
    }
  }

  _buildBg(season) {
    const c = document.createElement('canvas');
    c.width = this.w; c.height = this.h;
    const ctx = c.getContext('2d');

    const skyGrad = ctx.createLinearGradient(0, 0, 0, this.groundY);
    skyGrad.addColorStop(0, season.sky[0]);
    skyGrad.addColorStop(1, season.sky[1]);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, this.w, this.groundY + 10);

    const gndGrad = ctx.createLinearGradient(0, this.groundY, 0, this.h);
    gndGrad.addColorStop(0, season.ground[0]);
    gndGrad.addColorStop(1, season.ground[1]);
    ctx.fillStyle = gndGrad;
    ctx.beginPath();
    ctx.moveTo(0, this.groundY);
    for (let x = 0; x <= this.w; x += 15) {
      const y = this.groundY + Math.sin(x * 0.012) * 6 + Math.sin(x * 0.005 + 1) * 4;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(this.w, this.h);
    ctx.lineTo(0, this.h);
    ctx.closePath();
    ctx.fill();

    this._bgCache = c;
    this._bgSeason = season.name;
  }

  burstAt(x, y) {
    const colors = ['#ffd54f', '#81c784', '#ffab91', '#ce93d8', '#fff59d'];
    for (let i = 0; i < 8 && this.particles.length < CONFIG.MAX_PARTICLES + 20; i++) {
      this.particles.push(new Particle(
        x, y,
        colors[Math.floor(Math.random() * colors.length)],
        (Math.random() - 0.5) * 40,
        -20 - Math.random() * 30,
        0.8 + Math.random() * 0.6,
        1.5 + Math.random() * 1.5,
      ));
    }
  }

  syncPlants(plantCounts) {
    const typeMap = {};
    for (const p of this.plants) {
      if (!typeMap[p.type]) typeMap[p.type] = [];
      typeMap[p.type].push(p);
    }

    const maxV = CONFIG.MAX_VISUAL_PLANTS;
    let total = 0;
    for (const v of Object.values(plantCounts)) total += v;
    const scale = total > maxV ? maxV / total : 1;

    const next = [];
    const margin = 30;
    const groundRange = this.h - this.groundY;

    for (const [type, count] of Object.entries(plantCounts)) {
      if (count === 0) continue;
      const desired = Math.max(1, Math.round(count * scale));
      const existing = typeMap[type] || [];

      for (let i = 0; i < Math.min(desired, existing.length); i++) {
        next.push(existing[i]);
      }
      for (let i = existing.length; i < desired; i++) {
        const x = margin + Math.random() * (this.w - margin * 2);
        const yOff = 10 + Math.random() * groundRange * 0.45;
        next.push(new VisualPlant(type, x, this.groundY + yOff));
      }
    }

    next.sort((a, b) => a.groundY - b.groundY);
    this.plants = next;
  }

  update(dt, glowMult) {
    this.time += dt;

    for (const p of this.plants) {
      p.update(dt);
      if (p.stage >= 3 && Math.random() < dt * 0.15 && this.particles.length < CONFIG.MAX_PARTICLES) {
        const cfg = CONFIG.PLANT_TYPES[p.type];
        const h = cfg.maxH * p.growth;
        this.particles.push(new Particle(
          p.x + (Math.random() - 0.5) * 10,
          p.groundY - h + Math.random() * 5,
          cfg.color,
          (Math.random() - 0.5) * 8,
          -6 - Math.random() * 10,
          1.5 + Math.random(),
          1 + Math.random(),
        ));
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update(dt);
      if (!this.particles[i].alive) this.particles.splice(i, 1);
    }
  }

  draw(season, glowMult) {
    const ctx = this.ctx;
    const t = this.time;

    if (!this._bgCache || this._bgSeason !== season.name) this._buildBg(season);
    ctx.drawImage(this._bgCache, 0, 0);

    this._drawSun(ctx, t);
    this._drawClouds(ctx, t);
    this._drawGrass(ctx, t, season);

    for (const p of this.plants) {
      const sway = Math.sin(t * p.swaySpeed + p.phase) * p.swayAmt * p.growth;
      PLANT_DRAW[p.type](ctx, p.x, p.groundY, p.stage, sway, t, glowMult, p.growth);
    }

    for (const p of this.particles) {
      ctx.globalAlpha = (p.life / p.maxLife) * 0.6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, TAU);
      ctx.fillStyle = p.color;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  _drawSun(ctx, t) {
    const sx = this.w * 0.82;
    const sy = this.groundY * 0.22;
    const pulse = 1 + Math.sin(t * 0.5) * 0.05;
    ctx.fillStyle = 'rgba(255,236,179,0.25)';
    ctx.beginPath();
    ctx.arc(sx, sy, 42 * pulse, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,236,179,0.7)';
    ctx.beginPath();
    ctx.arc(sx, sy, 22, 0, TAU);
    ctx.fill();
  }

  _drawClouds(ctx, t) {
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    this._cloud(ctx, this.w * 0.15 + Math.sin(t * 0.06) * 25, this.groundY * 0.28, 0.9);
    this._cloud(ctx, this.w * 0.55 + Math.sin(t * 0.04 + 2) * 20, this.groundY * 0.18, 1.1);
    this._cloud(ctx, this.w * 0.85 + Math.sin(t * 0.05 + 5) * 15, this.groundY * 0.35, 0.7);
  }

  _cloud(ctx, x, y, s) {
    ctx.beginPath();
    ctx.arc(x, y, 14 * s, 0, TAU);
    ctx.arc(x + 13 * s, y - 5 * s, 11 * s, 0, TAU);
    ctx.arc(x + 24 * s, y, 9 * s, 0, TAU);
    ctx.arc(x - 9 * s, y + 2 * s, 9 * s, 0, TAU);
    ctx.fill();
  }

  _drawGrass(ctx, t, season) {
    ctx.strokeStyle = season.ground[0];
    ctx.lineWidth = 1;
    for (const g of this._grass) {
      const sway = Math.sin(t * 1.2 + g.x * 0.05) * 1.5;
      ctx.beginPath();
      ctx.moveTo(g.x, this.groundY + 3);
      ctx.lineTo(g.x + g.lean * g.h + sway, this.groundY + 3 - g.h);
      ctx.stroke();
    }
  }
}

function drawLeaf(ctx, x, y, angle, len, w) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.ellipse(len * 0.5, 0, len * 0.5, w * 0.5, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
}

const PLANT_DRAW = {
  herb(ctx, x, y, stage, sway, t, glow, growth) {
    const h = lerp(2, 18, growth);
    const tx = x + sway;

    ctx.strokeStyle = '#4a7c3f';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + sway * 0.4, y - h * 0.5, tx, y - h);
    ctx.stroke();

    if (stage >= 1) {
      ctx.fillStyle = '#6abf69';
      drawLeaf(ctx, x + sway * 0.2 - 3, y - h * 0.4, -0.5, 6, 3);
      drawLeaf(ctx, x + sway * 0.2 + 3, y - h * 0.4, 0.5, 6, 3);
    }
    if (stage >= 2) {
      ctx.fillStyle = '#81c784';
      drawLeaf(ctx, x + sway * 0.5 - 4, y - h * 0.65, -0.3, 7, 4);
      drawLeaf(ctx, x + sway * 0.5 + 4, y - h * 0.65, 0.3, 7, 4);
    }
    if (stage >= 3) {
      ctx.fillStyle = '#5a9c4a';
      ctx.beginPath();
      ctx.arc(tx, y - h, 6, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#6abf69';
      ctx.beginPath();
      ctx.arc(tx - 3, y - h + 2, 4.5, 0, TAU);
      ctx.fill();
    }
    if (stage >= 4) {
      ctx.globalAlpha = 0.25 * glow;
      ctx.fillStyle = '#a5d6a7';
      ctx.beginPath();
      ctx.arc(tx, y - h, 10 + Math.sin(t * 2) * 2, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  },

  sunflower(ctx, x, y, stage, sway, t, glow, growth) {
    const h = lerp(3, 42, growth);
    const tx = x + sway;

    ctx.strokeStyle = '#558b2f';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + sway * 0.3, y - h * 0.5, tx, y - h);
    ctx.stroke();

    if (stage >= 2) {
      ctx.fillStyle = '#66bb6a';
      drawLeaf(ctx, x + sway * 0.15 - 5, y - h * 0.35, -0.4, 11, 5);
      drawLeaf(ctx, x + sway * 0.15 + 5, y - h * 0.35, 0.4, 11, 5);
    }
    if (stage >= 1) {
      ctx.fillStyle = '#81c784';
      drawLeaf(ctx, x + sway * 0.1 - 3, y - h * 0.2, -0.6, 6, 3);
      drawLeaf(ctx, x + sway * 0.1 + 3, y - h * 0.2, 0.6, 6, 3);
    }
    if (stage >= 3) {
      const cx = tx, cy = y - h;
      ctx.fillStyle = '#ffd600';
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * TAU + Math.sin(t * 0.5 + i) * 0.04;
        ctx.save();
        ctx.translate(cx + Math.cos(a) * 7, cy + Math.sin(a) * 7);
        ctx.rotate(a);
        ctx.beginPath();
        ctx.ellipse(0, 0, 5.5, 2.8, 0, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = '#5d4037';
      ctx.beginPath();
      ctx.arc(cx, cy, 5, 0, TAU);
      ctx.fill();
    }
    if (stage >= 4) {
      ctx.globalAlpha = 0.15 * glow;
      ctx.fillStyle = '#ffd600';
      ctx.beginPath();
      ctx.arc(tx, y - h, 18, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  },

  lavender(ctx, x, y, stage, sway, t, glow, growth) {
    const h = lerp(2, 30, growth);
    const stems = stage >= 2 ? 3 : 1;

    for (let s = 0; s < stems; s++) {
      const off = (s - (stems - 1) / 2) * 5;
      const sx = x + off + sway;

      ctx.strokeStyle = '#7cb342';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x + off, y);
      ctx.quadraticCurveTo(sx, y - h * 0.5, sx, y - h);
      ctx.stroke();

      if (stage >= 3) {
        ctx.fillStyle = '#b39ddb';
        for (let i = 0; i < 5; i++) {
          ctx.beginPath();
          ctx.arc(sx, y - h + i * 3.5, 2.8 - i * 0.3, 0, TAU);
          ctx.fill();
        }
      }
    }
    if (stage >= 1) {
      ctx.fillStyle = '#a5d6a7';
      drawLeaf(ctx, x - 3, y - h * 0.25, -0.5, 5, 2.5);
      drawLeaf(ctx, x + 3, y - h * 0.25, 0.5, 5, 2.5);
    }
    if (stage >= 4) {
      ctx.globalAlpha = 0.18 * glow;
      ctx.fillStyle = '#ce93d8';
      ctx.beginPath();
      ctx.arc(x + sway, y - h, 14, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  },

  maple(ctx, x, y, stage, sway, t, glow, growth) {
    const h = lerp(3, 58, growth);
    const tw = lerp(1, 6, growth);

    ctx.fillStyle = '#6d4c41';
    const bx = x + sway * 0.2;
    ctx.fillRect(bx - tw / 2, y - h * 0.55, tw, h * 0.55);

    if (stage >= 2) {
      const cr = lerp(5, 24, (growth - 0.3) / 0.7);
      const cx = x + sway * 0.4, cy = y - h;

      ctx.fillStyle = '#ff8a65';
      ctx.beginPath();
      ctx.arc(cx, cy, cr, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#ff7043';
      ctx.beginPath();
      ctx.arc(cx - cr * 0.3, cy + cr * 0.15, cr * 0.7, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#e64a19';
      ctx.beginPath();
      ctx.arc(cx + cr * 0.25, cy + cr * 0.1, cr * 0.5, 0, TAU);
      ctx.fill();
    }
    if (stage >= 1 && stage < 3) {
      ctx.fillStyle = '#a5d6a7';
      drawLeaf(ctx, bx - 3, y - h * 0.3, -0.4, 5, 3);
      drawLeaf(ctx, bx + 3, y - h * 0.3, 0.4, 5, 3);
    }
    if (stage >= 4) {
      ctx.globalAlpha = 0.1 * glow;
      ctx.fillStyle = '#ff7043';
      ctx.beginPath();
      ctx.arc(x + sway * 0.4, y - h, 32, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  },

  cherry(ctx, x, y, stage, sway, t, glow, growth) {
    const h = lerp(3, 65, growth);
    const tw = lerp(1, 7, growth);

    ctx.fillStyle = '#5d4037';
    const bx = x + sway * 0.15;
    ctx.fillRect(bx - tw / 2, y - h * 0.5, tw, h * 0.5);

    if (stage >= 2) {
      ctx.strokeStyle = '#5d4037';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(bx, y - h * 0.45);
      ctx.lineTo(bx - 16 + sway * 0.2, y - h * 0.65);
      ctx.moveTo(bx, y - h * 0.45);
      ctx.lineTo(bx + 16 + sway * 0.2, y - h * 0.65);
      ctx.stroke();
    }
    if (stage >= 3) {
      const cr = lerp(8, 28, (growth - 0.4) / 0.6);
      const cx = x + sway * 0.2, cy = y - h + 6;

      ctx.fillStyle = '#f48fb1';
      ctx.beginPath();
      ctx.arc(cx, cy, cr, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#f8bbd0';
      ctx.beginPath();
      ctx.arc(cx - cr * 0.4, cy + cr * 0.2, cr * 0.6, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx + cr * 0.4, cy + cr * 0.2, cr * 0.55, 0, TAU);
      ctx.fill();
    }
    if (stage >= 1 && stage < 3) {
      ctx.fillStyle = '#a5d6a7';
      drawLeaf(ctx, bx - 3, y - h * 0.25, -0.5, 5, 3);
      drawLeaf(ctx, bx + 3, y - h * 0.25, 0.5, 5, 3);
    }
    if (stage >= 4) {
      ctx.globalAlpha = 0.1 * glow;
      ctx.fillStyle = '#f48fb1';
      ctx.beginPath();
      ctx.arc(x + sway * 0.2, y - h + 6, 38, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  },
};
