// Lantern Thief — The Ink Vault: boot, loop, input, levels and overlays.
import { LEVELS, parseLevel, TILE } from './levels.js';
import { Guard } from './guards.js';
import { Player } from './player.js';
import { SoundBank } from './audio.js';
import { drawLevel, drawSeals, drawExit, drawCone, drawGuard, drawPlayer, drawNight } from './render.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('overlay');
const hudLevel = document.getElementById('hud-level');
const hudSeals = document.getElementById('hud-seals');
const hudLives = document.getElementById('hud-lives');
const hudTime = document.getElementById('hud-time');
const hudAlert = document.getElementById('hud-alert');

const sounds = new SoundBank();
const params = new URLSearchParams(location.search);
const shotMode = params.get('shot'); // 1..4: frozen demo frames for screenshots

const game = {
  state: 'menu', // menu | play | levelclear | caught | gameover | win
  levelIndex: 0,
  level: null,
  player: null,
  guards: [],
  sealsGot: 0,
  lives: 3,
  time: 0,
  levelTime: 0,
  caughtFlash: 0,
  message: '',
};

const keys = new Set();
let lastTs = 0;

function loadLevel(index) {
  const def = LEVELS[index];
  const level = parseLevel(def);
  game.levelIndex = index;
  game.level = level;
  game.player = new Player(level.player);
  game.guards = def.patrols.map((p) => new Guard(p, level));
  game.sealsGot = 0;
  game.levelTime = 0;
  game.message = def.intro;
  updateHud();
}

function startGame() {
  game.lives = 3;
  game.time = 0;
  loadLevel(0);
  game.state = 'play';
  sounds.levelStart();
  showOverlay('');
}

function updateHud() {
  const def = LEVELS[game.levelIndex];
  hudLevel.textContent = `Level ${game.levelIndex + 1}/3 — ${def.name}`;
  hudSeals.textContent = `Seals ${game.sealsGot}/${def.seals}`;
  hudLives.textContent = `Lanterns ${'\u2726'.repeat(Math.max(0, game.lives))}`;
  const t = Math.floor(game.time);
  hudTime.textContent = `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
  const chasing = game.guards.some((g) => g.state === 'chase');
  const wary = game.guards.some((g) => g.suspicion > 25);
  hudAlert.textContent = chasing ? 'SPOTTED — RUN!' : wary ? 'SUSPICIOUS…' : 'UNSEEN';
  hudAlert.className = chasing ? 'alarm' : wary ? 'suspicious' : '';
}

function showOverlay(html) {
  overlay.innerHTML = html ? `<div class="panel">${html}</div>` : '';
}

function showMenu() {
  game.state = 'menu';
  showOverlay(`
    <h2>LANTERN THIEF</h2>
    <p>You are Wren, a thief who steals only stories. Tonight the Ink Vault
    keeps its manuscripts under lamplight and warden patrols.</p>
    <p>Take every glowing <b>ink-seal</b>, then slip out through the green
    <b>exit</b> — unseen. Bushes hide you. Crates block a warden's sight.
    A pebble, thrown with a click, draws a guard away.</p>
    <p class="keys">WASD / Arrows — move &nbsp;·&nbsp; Shift — sneak &nbsp;·&nbsp; Click — throw pebble &nbsp;·&nbsp; M — mute</p>
    <p><b>Click or press Enter to begin.</b></p>`);
}

function levelClear() {
  game.state = 'levelclear';
  sounds.win();
  const last = game.levelIndex === LEVELS.length - 1;
  showOverlay(last ? `
    <h2>THE VAULT IS YOURS</h2>
    <p>You slipped out of the Curator's Gallery with every seal and never
    once raised the alarm. The manuscripts will be read again tonight.</p>
    <p>Finished in ${fmtTime(game.time)} with ${game.lives} lantern${game.lives === 1 ? '' : 's'} to spare.</p>
    <p><b>Press Enter to steal again.</b></p>` : `
    <h2>LEVEL CLEAR</h2>
    <p>${LEVELS[game.levelIndex].name} — out clean in ${fmtTime(game.levelTime)}.
    ${LEVELS[game.levelIndex + 1].name} waits below.</p>
    <p><b>Press Enter for the next level.</b></p>`);
}

function fmtTime(s) {
  const t = Math.floor(s);
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
}

function onCaught() {
  if (game.state !== 'play') return;
  game.lives -= 1;
  sounds.caught();
  game.caughtFlash = 0.6;
  if (game.lives <= 0) {
    game.state = 'gameover';
    showOverlay(`
      <h2>CAUGHT IN THE LAMPLIGHT</h2>
      <p>The wardens found you three times, and the vault keeps its stories.
      But a thief who knows every patrol is only one quiet night from winning.</p>
      <p><b>Press Enter to try again.</b></p>`);
  } else {
    game.state = 'caught';
    showOverlay(`
      <h2>SPOTTED!</h2>
      <p>A warden laid hands on you. You slipped away in the dark, but one
      lantern is spent — ${game.lives} left.</p>
      <p><b>Press Enter to try this level again.</b></p>`);
  }
  updateHud();
}

const events = {
  onSpotted() { sounds.alert(); updateHud(); },
  onCaught() { onCaught(); },
};

function update(dt) {
  if (game.state !== 'play') return;
  game.time += dt;
  game.levelTime += dt;
  if (game.caughtFlash > 0) game.caughtFlash -= dt;

  const p = game.player;
  p.sneaking = keys.has('ShiftLeft') || keys.has('ShiftRight');
  let dx = 0;
  let dy = 0;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) dx -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) dx += 1;
  if (keys.has('KeyW') || keys.has('ArrowUp')) dy -= 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) dy += 1;
  const stepped = p.move(dx, dy, game.level, dt);
  if (stepped > 0) sounds.step(p.sneaking);
  p.update(game.level, dt);

  // Pebbles that just landed draw guards to the noise.
  for (const peb of p.landedPebbles()) {
    if (!peb.announced) {
      peb.announced = true;
      sounds.pebble();
      for (const g of game.guards) g.hearNoise(peb.x, peb.y, 220);
    }
  }
  // Loud running is heard too.
  if (p.moving && !p.sneaking) {
    for (const g of game.guards) g.hearNoise(p.x, p.y, 46);
  }

  for (const g of game.guards) g.update(dt, p, game.level, events);
  if (game.state !== 'play') return;

  // Seals.
  for (const s of game.level.seals) {
    if (!s.taken && Math.hypot(s.x - p.x, s.y - p.y) < 24) {
      s.taken = true;
      game.sealsGot += 1;
      sounds.pickup();
      if (game.sealsGot === LEVELS[game.levelIndex].seals) {
        sounds.exitOpen();
        game.message = 'The exit is open — go, quietly.';
      }
    }
  }

  // Exit.
  const exitOpen = game.sealsGot === LEVELS[game.levelIndex].seals;
  const e = game.level.exit;
  if (exitOpen && Math.hypot(e.x - p.x, e.y - p.y) < 24) {
    if (game.levelIndex === LEVELS.length - 1) {
      game.state = 'win';
      levelClear();
    } else {
      levelClear();
    }
    updateHud();
    return;
  }
  updateHud();
}

function render(time) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawLevel(ctx, game.level, time);
  drawSeals(ctx, game.level, time);
  const exitOpen = game.sealsGot === LEVELS[game.levelIndex].seals;
  drawExit(ctx, game.level, exitOpen, time);
  drawNight(ctx, game.player, canvas.width, canvas.height);
  for (const g of game.guards) drawCone(ctx, g, game.level);
  for (const g of game.guards) drawGuard(ctx, g, time);
  drawPlayer(ctx, game.player, time);
  // Message toast.
  if (game.message && game.state === 'play') {
    ctx.fillStyle = 'rgba(11,10,18,0.8)';
    ctx.fillRect(180, 8, 600, 26);
    ctx.fillStyle = '#f2c14e';
    ctx.font = '14px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(game.message, 480, 26);
  }
  if (game.caughtFlash > 0) {
    ctx.fillStyle = `rgba(255,40,40,${game.caughtFlash * 0.5})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

function loop(ts) {
  const dt = Math.min(0.05, (ts - lastTs) / 1000 || 0.016);
  lastTs = ts;
  if (!shotMode) update(dt);
  // Frozen clock in shot mode so two screenshot runs are byte-identical.
  render(shotMode ? 1.234 : ts / 1000);
  requestAnimationFrame(loop);
}

// ---- Frozen demo frames for the screenshots (same code, fixed states) ----
function applyShot(n) {
  if (n === 1) {
    loadLevel(0);
    game.state = 'play';
    game.player.x = 9 * TILE + 16;
    game.player.y = 6 * TILE + 16;
    game.player.sneaking = true;
    game.guards[0].x = 11 * TILE + 16;
    game.guards[0].y = 3 * TILE + 16;
    game.guards[0].facing = Math.PI / 2;
    game.guards[0].suspicion = 30;
    game.guards[1].x = 24 * TILE + 16;
    game.guards[1].y = 14 * TILE + 16;
    game.guards[1].facing = -Math.PI / 2;
    game.message = 'Two wardens patrol the reading room. Take both ink-seals…';
  } else if (n === 2) {
    loadLevel(0);
    game.state = 'play';
    game.player.x = 12 * TILE + 16;
    game.player.y = 4 * TILE + 16;
    game.guards[0].x = 11 * TILE + 16;
    game.guards[0].y = 7 * TILE + 16;
    game.guards[0].facing = -Math.PI / 2;
    game.guards[0].state = 'chase';
    game.guards[0].suspicion = 100;
    game.guards[1].x = 22 * TILE + 16;
    game.guards[1].y = 12 * TILE + 16;
    game.guards[1].facing = Math.PI;
    game.guards[1].suspicion = 55;
    game.message = 'Spotted! Break the line of sight and hide.';
    updateHud();
  } else if (n === 3) {
    loadLevel(1);
    game.state = 'play';
    game.sealsGot = 2;
    game.level.seals[0].taken = true;
    game.level.seals[1].taken = true;
    game.player.x = 24 * TILE + 16; // tucked in the bushes by the exit
    game.player.y = 2 * TILE + 16;
    game.player.sneaking = true;
    game.guards[0].x = 10 * TILE + 16;
    game.guards[0].y = 7 * TILE + 16;
    game.guards[0].facing = 0;
    game.guards[1].x = 16 * TILE + 16;
    game.guards[1].y = 16 * TILE + 16;
    game.guards[1].facing = 0;
    game.guards[2].x = 26 * TILE + 16;
    game.guards[2].y = 8 * TILE + 16;
    game.guards[2].facing = Math.PI / 2;
    game.message = 'Two seals taken — one more glows below. The exit stays locked until then.';
    updateHud();
  } else {
    loadLevel(2);
    game.state = 'play';
    game.sealsGot = 3;
    for (const s of game.level.seals) s.taken = true;
    game.player.x = 20 * TILE + 16;
    game.player.y = 2 * TILE + 16;
    game.player.sneaking = true;
    game.guards[0].x = 17 * TILE + 16;
    game.guards[0].y = 5 * TILE + 16;
    game.guards[0].facing = Math.PI / 2;
    game.guards[1].x = 25 * TILE + 16;
    game.guards[1].y = 10 * TILE + 16;
    game.guards[1].facing = Math.PI / 2;
    game.guards[2].x = 20 * TILE + 16;
    game.guards[2].y = 15 * TILE + 16;
    game.guards[2].facing = Math.PI / 2;
    game.guards[3].x = 8 * TILE + 16;
    game.guards[3].y = 9 * TILE + 16;
    game.guards[3].facing = -Math.PI / 2;
    game.guards[3].suspicion = 40;
    game.message = 'The final gallery — four wardens, one open exit.';
    updateHud();
  }
  showOverlay('');
}

// ---- Input ----
window.addEventListener('keydown', (e) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  keys.add(e.code);
  if (e.code === 'KeyM') sounds.toggleMute();
  if (e.code === 'KeyR' && game.state === 'play') loadLevel(game.levelIndex);
  if (e.code === 'Enter' || e.code === 'Space') {
    sounds.ensure();
    if (game.state === 'menu' || game.state === 'gameover') startGame();
    else if (game.state === 'caught') { loadLevel(game.levelIndex); game.state = 'play'; showOverlay(''); }
    else if (game.state === 'levelclear') {
      if (game.levelIndex === LEVELS.length - 1) startGame();
      else { loadLevel(game.levelIndex + 1); game.state = 'play'; showOverlay(''); }
    } else if (game.state === 'win') startGame();
  }
});
window.addEventListener('keyup', (e) => keys.delete(e.code));
canvas.addEventListener('mousedown', (e) => {
  sounds.ensure();
  if (game.state === 'menu') { startGame(); return; }
  if (game.state !== 'play') return;
  const rect = canvas.getBoundingClientRect();
  const tx = ((e.clientX - rect.left) / rect.width) * canvas.width;
  const ty = ((e.clientY - rect.top) / rect.height) * canvas.height;
  const peb = game.player.throwPebble(tx, ty);
  if (peb) sounds.pebble();
});
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

// ---- Boot ----
if (shotMode) {
  document.body.classList.add('shot');
  loadLevel(0);
  applyShot(Number(shotMode) || 1);
} else {
  loadLevel(0);
  showMenu();
}
requestAnimationFrame(loop);
