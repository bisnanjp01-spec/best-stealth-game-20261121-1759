// Lantern Thief — guard patrols, vision cones and detection.
import { TILE, isSolidAt } from './levels.js';

export const CONE_RANGE = 185;
export const CONE_HALF_ANGLE = 0.61; // ~35 degrees each side
export const CHASE_RANGE = 260;

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// True when no wall or crate stands between the two points.
export function hasLineOfSight(level, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / 8));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (isSolidAt(level, ax + dx * t, ay + dy * t)) return false;
  }
  return true;
}

export function canSee(level, guard, px, py, hidden, sneaking) {
  const dx = px - guard.x;
  const dy = py - guard.y;
  const dist = Math.hypot(dx, dy);
  let range = CONE_RANGE;
  if (sneaking) range *= 0.62;
  if (hidden) range *= 0.35;
  if (dist > range) return 0;
  const ang = Math.atan2(dy, dx);
  if (Math.abs(angleDiff(ang, guard.facing)) > CONE_HALF_ANGLE) return 0;
  if (!hasLineOfSight(level, guard.x, guard.y, px, py)) return 0;
  // Closer and more exposed fills the eye faster.
  const closeness = 1 - dist / range;
  return 0.55 + closeness * 1.15;
}

export class Guard {
  constructor(patrol, level) {
    this.patrol = patrol;
    this.level = level;
    const start = patrol.waypoints[0];
    this.x = start.x * TILE + TILE / 2;
    this.y = start.y * TILE + TILE / 2;
    this.wpIndex = 1 % patrol.waypoints.length;
    this.facing = 0;
    this.pauseTimer = 0;
    this.state = 'patrol'; // patrol | suspicious | chase | investigate
    this.suspicion = 0; // 0..100, the eye above the guard
    this.alertTimer = 0;
    this.investigate = null;
    this.lookTimer = 0;
    // Fixed per guard so two renders of the same state are identical.
    this.stepPhase = (patrol.waypoints[0].x * 3 + patrol.waypoints[0].y * 5) % 6;
    this.lastHeard = null;
  }

  targetPoint() {
    const w = this.patrol.waypoints[this.wpIndex];
    return { x: w.x * TILE + TILE / 2, y: w.y * TILE + TILE / 2 };
  }

  moveToward(tx, ty, speed, dt) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 1) return true;
    const step = Math.min(dist, speed * dt);
    const nx = this.x + (dx / dist) * step;
    const ny = this.y + (dy / dist) * step;
    // Axis-separated slide so guards glide along walls instead of sticking.
    if (!isSolidAt(this.level, nx, this.y)) this.x = nx;
    if (!isSolidAt(this.level, this.x, ny)) this.y = ny;
    this.facing = Math.atan2(dy, dx);
    this.stepPhase += dt * 7;
    return dist <= step + 0.5;
  }

  hearNoise(x, y, loud) {
    if (this.state === 'chase') return;
    const d = Math.hypot(x - this.x, y - this.y);
    if (d < loud) {
      this.investigate = { x, y };
      if (this.state === 'patrol' || this.state === 'suspicious') this.state = 'investigate';
    }
  }

  update(dt, player, level, events) {
    const seen = canSee(level, this, player.x, player.y, player.hidden, player.sneaking);
    if (seen > 0) {
      this.suspicion = Math.min(100, this.suspicion + seen * dt * 55);
      if (this.suspicion >= 100 && this.state !== 'chase') {
        this.state = 'chase';
        this.alertTimer = 4;
        events.onSpotted(this);
      }
    } else {
      this.suspicion = Math.max(0, this.suspicion - dt * (this.state === 'chase' ? 12 : 30));
      if (this.suspicion > 25 && this.state === 'patrol') this.state = 'suspicious';
      if (this.suspicion <= 5 && this.state === 'suspicious') this.state = 'patrol';
    }

    if (this.state === 'chase') {
      const d = Math.hypot(player.x - this.x, player.y - this.y);
      if (d < 20) { events.onCaught(this); return; }
      if (seen > 0) this.alertTimer = 4;
      else {
        this.alertTimer -= dt;
        if (this.alertTimer <= 0) {
          this.state = 'investigate';
          this.investigate = { x: player.x, y: player.y };
        }
      }
      this.moveToward(player.x, player.y, this.patrol.speed * 1.55, dt);
      return;
    }

    if (this.state === 'investigate' && this.investigate) {
      const arrived = this.moveToward(this.investigate.x, this.investigate.y, this.patrol.speed * 1.25, dt);
      if (arrived) {
        this.lookTimer += dt;
        this.facing += dt * 1.6; // scan the room
        if (this.lookTimer > 2.2) {
          this.lookTimer = 0;
          this.investigate = null;
          this.state = 'patrol';
        }
      }
      return;
    }

    if (this.state === 'suspicious') {
      // Freeze, stare toward the player, then give up and resume.
      this.facing = Math.atan2(player.y - this.y, player.x - this.x);
      return;
    }

    // Patrol: walk to the next waypoint, pause and look around there.
    if (this.pauseTimer > 0) {
      this.pauseTimer -= dt;
      this.facing += Math.sin(this.stepPhase * 0.4) * dt * 0.5;
      return;
    }
    const t = this.targetPoint();
    const arrived = this.moveToward(t.x, t.y, this.patrol.speed, dt);
    if (arrived) {
      this.wpIndex = (this.wpIndex + 1) % this.patrol.waypoints.length;
      this.pauseTimer = this.patrol.pause;
    }
  }
}
