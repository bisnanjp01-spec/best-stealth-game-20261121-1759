// Lantern Thief — the player: movement, sneaking, noise and pebbles.
import { isSolidAt, isBushAt } from './levels.js';

export const WALK_SPEED = 150;
export const SNEAK_SPEED = 88;
export const PEBBLE_MAX = 5;

export class Player {
  constructor(start) {
    this.x = start.x;
    this.y = start.y;
    this.radius = 12;
    this.sneaking = false;
    this.hidden = false;
    this.facing = -Math.PI / 2;
    this.moving = false;
    this.stepTimer = 0;
    this.pebbles = PEBBLE_MAX;
    this.pebbleFlights = [];
    this.noise = 0; // current noise radius, drawn as a ring
  }

  // Move with axis-separated collision; returns distance actually travelled.
  move(dx, dy, level, dt) {
    const len = Math.hypot(dx, dy);
    if (len < 0.001) {
      this.moving = false;
      this.stepTimer = 0;
      this.noise = Math.max(0, this.noise - dt * 160);
      return 0;
    }
    const speed = this.sneaking ? SNEAK_SPEED : WALK_SPEED;
    const nx = this.x + (dx / len) * speed * dt;
    const ny = this.y + (dy / len) * speed * dt;
    const r = this.radius;
    let moved = 0;
    if (!this.hitsWall(level, nx, this.y, r)) { moved += Math.abs(nx - this.x); this.x = nx; }
    if (!this.hitsWall(level, this.x, ny, r)) { moved += Math.abs(ny - this.y); this.y = ny; }
    this.facing = Math.atan2(dy, dx);
    this.moving = moved > 0;
    const targetNoise = this.sneaking ? 14 : 46;
    this.noise += (targetNoise - this.noise) * Math.min(1, dt * 8);
    if (this.moving) {
      this.stepTimer -= dt;
      if (this.stepTimer <= 0) {
        this.stepTimer = this.sneaking ? 0.55 : 0.34;
        return moved; // a footstep happened this frame
      }
    }
    return 0;
  }

  hitsWall(level, x, y, r) {
    return isSolidAt(level, x - r, y - r) || isSolidAt(level, x + r, y - r)
      || isSolidAt(level, x - r, y + r) || isSolidAt(level, x + r, y + r);
  }

  update(level, dt) {
    this.hidden = isBushAt(level, this.x, this.y);
    for (const p of this.pebbleFlights) {
      p.t += dt * 2.2;
      if (p.t >= 1) {
        p.landed = true;
      }
    }
    this.pebbleFlights = this.pebbleFlights.filter((p) => !p.landed || p.ring > 0);
    for (const p of this.pebbleFlights) {
      if (p.landed) p.ring = Math.max(0, (p.ring || 90) - dt * 140);
    }
  }

  throwPebble(tx, ty) {
    if (this.pebbles <= 0) return null;
    this.pebbles -= 1;
    const p = { fromX: this.x, fromY: this.y, x: tx, y: ty, t: 0, landed: false, ring: 90 };
    this.pebbleFlights.push(p);
    return p;
  }

  landedPebbles() {
    return this.pebbleFlights.filter((p) => p.landed);
  }
}
