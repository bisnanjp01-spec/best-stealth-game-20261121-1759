// Lantern Thief — canvas drawing: floor, cover, vision cones, night light.
import { TILE, isSolidAt } from './levels.js';
import { CONE_RANGE } from './guards.js';

const FLOOR_A = '#221d33';
const FLOOR_B = '#1d1930';
const WALL = '#453d63';
const WALL_TOP = '#5b5178';

export function drawLevel(ctx, level, time) {
  for (let y = 0; y < level.rows; y++) {
    for (let x = 0; x < level.cols; x++) {
      const px = x * TILE;
      const py = y * TILE;
      const ch = level.def.map[y][x];
      if (ch === '#') {
        ctx.fillStyle = WALL;
        ctx.fillRect(px, py, TILE, TILE);
        ctx.fillStyle = WALL_TOP;
        ctx.fillRect(px, py, TILE, 6);
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(px, py + TILE - 5, TILE, 5);
      } else {
        ctx.fillStyle = (x + y) % 2 === 0 ? FLOOR_A : FLOOR_B;
        ctx.fillRect(px, py, TILE, TILE);
        // faint floorboards
        ctx.fillStyle = 'rgba(255,255,255,0.025)';
        ctx.fillRect(px, py + 15, TILE, 1);
      }
      if (ch === 'C') {
        ctx.fillStyle = '#6b4a2a';
        ctx.fillRect(px + 3, py + 3, TILE - 6, TILE - 6);
        ctx.strokeStyle = '#8a6238';
        ctx.lineWidth = 2;
        ctx.strokeRect(px + 5, py + 5, TILE - 10, TILE - 10);
        ctx.beginPath();
        ctx.moveTo(px + 3, py + 3);
        ctx.lineTo(px + TILE - 3, py + TILE - 3);
        ctx.moveTo(px + TILE - 3, py + 3);
        ctx.lineTo(px + 3, py + TILE - 3);
        ctx.stroke();
      }
      if (ch === 'B') {
        ctx.fillStyle = '#1e4d2a';
        ctx.beginPath();
        ctx.arc(px + 10, py + 12, 10, 0, Math.PI * 2);
        ctx.arc(px + 22, py + 10, 11, 0, Math.PI * 2);
        ctx.arc(px + 16, py + 22, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#2f7a3e';
        ctx.beginPath();
        ctx.arc(px + 12, py + 10, 5, 0, Math.PI * 2);
        ctx.arc(px + 21, py + 18, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

export function drawSeals(ctx, level, time) {
  for (const s of level.seals) {
    if (s.taken) continue;
    const bob = Math.sin(time * 2 + s.bob) * 3;
    const glow = 14 + Math.sin(time * 3 + s.bob) * 4;
    const g = ctx.createRadialGradient(s.x, s.y + bob, 2, s.x, s.y + bob, glow);
    g.addColorStop(0, 'rgba(242,193,78,0.85)');
    g.addColorStop(1, 'rgba(242,193,78,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(s.x, s.y + bob, glow, 0, Math.PI * 2);
    ctx.fill();
    // the ink-seal: a glowing scroll
    ctx.fillStyle = '#f2c14e';
    ctx.fillRect(s.x - 7, s.y - 9 + bob, 14, 18);
    ctx.fillStyle = '#8a6d1f';
    ctx.fillRect(s.x - 7, s.y - 9 + bob, 14, 3);
    ctx.fillRect(s.x - 7, s.y + 6 + bob, 14, 3);
    ctx.strokeStyle = '#5d4a12';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(s.x - 4, s.y - 3 + bob);
    ctx.lineTo(s.x + 4, s.y - 3 + bob);
    ctx.moveTo(s.x - 4, s.y + 1 + bob);
    ctx.lineTo(s.x + 1, s.y + 1 + bob);
    ctx.stroke();
  }
}

export function drawExit(ctx, level, open, time) {
  const e = level.exit;
  const pulse = open ? 0.75 + Math.sin(time * 4) * 0.25 : 0.3;
  ctx.save();
  ctx.globalAlpha = pulse;
  ctx.fillStyle = open ? '#37d67a' : '#3f7a58';
  ctx.fillRect(e.x - 15, e.y - 15, 30, 30);
  ctx.restore();
  ctx.strokeStyle = open ? '#8fe3a0' : '#5a8a6a';
  ctx.lineWidth = 3;
  ctx.strokeRect(e.x - 15, e.y - 15, 30, 30);
  ctx.fillStyle = '#0b0a12';
  ctx.font = 'bold 15px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(open ? 'EXIT' : 'LOCK', e.x, e.y + 1);
  if (open) {
    ctx.fillStyle = '#e8ddc0';
    ctx.font = '11px Georgia, serif';
    ctx.fillText('the way out is open', e.x, e.y + 26);
  }
}

export function drawCone(ctx, guard, level) {
  const range = guard.state === 'chase' ? 260 : CONE_RANGE;
  const half = 0.61;
  const color = guard.state === 'chase' ? '255,70,70' : guard.suspicion > 25 ? '242,193,78' : '250,220,120';
  // Raycast the cone so walls and crates clip it: a warden cannot see
  // through a wall, and the cone on screen must match what canSee() checks.
  const steps = 26;
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const ang = guard.facing - half + (2 * half * i) / steps;
    let r = range;
    for (let d = 10; d <= range; d += 6) {
      if (isSolidAt(level, guard.x + Math.cos(ang) * d, guard.y + Math.sin(ang) * d)) { r = d; break; }
    }
    pts.push([guard.x + Math.cos(ang) * r, guard.y + Math.sin(ang) * r]);
  }
  const grad = ctx.createRadialGradient(guard.x, guard.y, 10, guard.x, guard.y, range);
  grad.addColorStop(0, `rgba(${color},0.34)`);
  grad.addColorStop(1, `rgba(${color},0.02)`);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(guard.x, guard.y);
  for (const [x, y] of pts) ctx.lineTo(x, y);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = `rgba(${color},0.35)`;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

export function drawGuard(ctx, guard, time) {
  const bob = Math.sin(guard.stepPhase) * 1.5;
  // robe
  ctx.fillStyle = guard.state === 'chase' ? '#7a1f1f' : '#3d2f5e';
  ctx.beginPath();
  ctx.moveTo(guard.x, guard.y - 13 + bob * 0.3);
  ctx.lineTo(guard.x + 11, guard.y + 10);
  ctx.lineTo(guard.x - 11, guard.y + 10);
  ctx.closePath();
  ctx.fill();
  // head + helmet plume
  ctx.fillStyle = '#d9c9a3';
  ctx.beginPath();
  ctx.arc(guard.x, guard.y - 8 + bob * 0.3, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#c0392b';
  ctx.fillRect(guard.x - 2, guard.y - 18 + bob * 0.3, 4, 7);
  // facing tick
  ctx.strokeStyle = '#e8ddc0';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(guard.x, guard.y - 8);
  ctx.lineTo(guard.x + Math.cos(guard.facing) * 12, guard.y - 8 + Math.sin(guard.facing) * 12);
  ctx.stroke();
  // suspicion eye
  if (guard.suspicion > 4) {
    const w = 30;
    const pct = guard.suspicion / 100;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(guard.x - w / 2, guard.y - 32, w, 6);
    ctx.fillStyle = guard.suspicion >= 100 ? '#ff5d5d' : '#f2c14e';
    ctx.fillRect(guard.x - w / 2, guard.y - 32, w * pct, 6);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(guard.state === 'chase' ? '!' : '?', guard.x, guard.y - 36);
  }
}

export function drawPlayer(ctx, player, time) {
  // lantern glow
  const g = ctx.createRadialGradient(player.x, player.y, 4, player.x, player.y, 70);
  g.addColorStop(0, 'rgba(242,193,78,0.28)');
  g.addColorStop(1, 'rgba(242,193,78,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(player.x, player.y, 70, 0, Math.PI * 2);
  ctx.fill();
  // noise ring while moving loud
  if (player.moving && !player.sneaking) {
    ctx.strokeStyle = 'rgba(232,221,192,0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.noise, 0, Math.PI * 2);
    ctx.stroke();
  }
  // hooded cloak
  ctx.fillStyle = player.hidden ? '#2f7a3e' : '#274b63';
  ctx.beginPath();
  ctx.moveTo(player.x, player.y - 13);
  ctx.lineTo(player.x + 11, player.y + 10);
  ctx.lineTo(player.x - 11, player.y + 10);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#e8ddc0';
  ctx.beginPath();
  ctx.arc(player.x, player.y - 7, 6, 0, Math.PI * 2);
  ctx.fill();
  // little lantern in hand
  const lx = player.x + Math.cos(player.facing) * 14;
  const ly = player.y + Math.sin(player.facing) * 14;
  ctx.fillStyle = '#f2c14e';
  ctx.beginPath();
  ctx.arc(lx, ly, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff3c4';
  ctx.beginPath();
  ctx.arc(lx, ly, 2, 0, Math.PI * 2);
  ctx.fill();
  if (player.sneaking) {
    ctx.fillStyle = '#8fe3a0';
    ctx.font = '10px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('sneaking', player.x, player.y + 24);
  }
  // pebbles in flight
  for (const p of player.pebbleFlights) {
    const x = p.fromX + (p.x - p.fromX) * p.t;
    const y = p.fromY + (p.y - p.fromY) * p.t - Math.sin(p.t * Math.PI) * 26;
    ctx.fillStyle = '#cfc4a8';
    ctx.beginPath();
    ctx.arc(x, y, 3.5, 0, Math.PI * 2);
    ctx.fill();
    if (p.landed) {
      ctx.strokeStyle = 'rgba(242,193,78,0.7)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.ring, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

export function drawNight(ctx, player, w, h) {
  // Darkness everywhere except a pool of light around the thief.
  const g = ctx.createRadialGradient(player.x, player.y, 60, player.x, player.y, 260);
  g.addColorStop(0, 'rgba(5,4,10,0)');
  g.addColorStop(0.55, 'rgba(5,4,10,0.28)');
  g.addColorStop(1, 'rgba(5,4,10,0.62)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}
