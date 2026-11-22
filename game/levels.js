// Lantern Thief — level maps and patrol routes.
// Legend: # wall, . floor, B bush (hides you), C crate (blocks sight),
// * ink-seal to collect, E exit, P player start, G guard start.
// Patrol waypoints are tile coordinates {x, y}; guards walk them in order.
export const TILE = 32;

export const LEVELS = [
  {
    name: 'I — The Reading Room',
    intro: 'Two wardens patrol the reading room. Take both ink-seals, then reach the green door.',
    seals: 2,
    map: [
      '##############################',
      '#P....#.......#......*.......#',
      '#.....#.......#..............#',
      '#..C..#...B...#...C..........#',
      '#.....#.......#......####....#',
      '#.....#.......#......#..#....#',
      '#..B......C.........#....#...#',
      '####.######.######..#....#..E#',
      '#....#......#....#..#....#...#',
      '#....#..*...#....#..#....#...#',
      '#....#......#....#......##...#',
      '#..C....B...#....#..........##',
      '#....#......#....#....C......#',
      '#....#......#....#...........#',
      '#....######.#....####.####...#',
      '#....#......#....#...........#',
      '#....#..C...#....#..B....C...#',
      '#....#......#....#...........#',
      '#....#......#....#...........#',
      '##############################',
    ],
    patrols: [
      { waypoints: [{ x: 8, y: 2 }, { x: 12, y: 2 }, { x: 12, y: 5 }, { x: 8, y: 5 }], speed: 52, pause: 1.2 },
      { waypoints: [{ x: 22, y: 18 }, { x: 22, y: 10 }, { x: 26, y: 10 }, { x: 26, y: 18 }], speed: 58, pause: 0.9 },
    ],
  },
  {
    name: 'II — The Ink Vault',
    intro: 'Three wardens, tighter shelves. The vault seals glow behind the crates.',
    seals: 3,
    map: [
      '##############################',
      '#P...#......B....#.....#....E#',
      '#....#...........#.....#.....#',
      '#.C..#..*....C...#..B..#..C..#',
      '#....#...........#.....#.....#',
      '#....####.########.....#.....#',
      '#....#........#...C....#.....#',
      '#.B..#...C....#........#.....#',
      '#....#........#...######.....#',
      '#....#........#........#.....#',
      '#####.#####...#...C....#..C..#',
      '#....#.....#..#........#.....#',
      '#.*..#..B..#..####.#####.....#',
      '#....#.....#........#........#',
      '#....#..C..#...*....#....B...#',
      '#....#.....#........#........#',
      '#....###.###...C....#...C....#',
      '#....#......#.......#........#',
      '#....#.......#....B..#.......#',
      '##############################',
    ],
    patrols: [
      { waypoints: [{ x: 8, y: 6 }, { x: 11, y: 6 }, { x: 11, y: 9 }, { x: 8, y: 9 }], speed: 60, pause: 1.0 },
      { waypoints: [{ x: 14, y: 14 }, { x: 17, y: 14 }, { x: 17, y: 18 }, { x: 14, y: 18 }], speed: 64, pause: 0.8 },
      { waypoints: [{ x: 25, y: 18 }, { x: 25, y: 5 }, { x: 27, y: 5 }, { x: 27, y: 18 }], speed: 56, pause: 1.4 },
    ],
  },
  {
    name: 'III — The Curator’s Gallery',
    intro: 'The final gallery. Four wardens, long sight-lines, one last seal behind the hedges.',
    seals: 3,
    map: [
      '##############################',
      '#P....B.....#....*....#.....E#',
      '#...........#.........#...C..#',
      '#..C....#...#....B....#......#',
      '#.......#...#.........#......#',
      '####.####...####.#######.....#',
      '#....#....C.....#.....#......#',
      '#.B..#....#.....#..B..#..C...#',
      '#....#....#.....#.....#......#',
      '#....#....#.....#.....####.###',
      '#....####.####..#.....#......#',
      '#....#........#.#..C..#..B...#',
      '#.*..#..C.....#.#.....#......#',
      '#....#........#.#.....#......#',
      '#....#.######.#.#..####......#',
      '#....#.#....#.#.#.....#..C...#',
      '#.B..#.#.*..#.#.#..B..#......#',
      '#....#.#....#.#.#.....#......#',
      '#....#......#...#.....#......#',
      '##############################',
    ],
    patrols: [
      { waypoints: [{ x: 14, y: 8 }, { x: 14, y: 2 }, { x: 20, y: 2 }, { x: 20, y: 8 }], speed: 66, pause: 0.8 },
      { waypoints: [{ x: 26, y: 13 }, { x: 26, y: 6 }, { x: 24, y: 6 }, { x: 24, y: 13 }], speed: 62, pause: 1.0 },
      { waypoints: [{ x: 26, y: 18 }, { x: 18, y: 18 }, { x: 18, y: 12 }, { x: 26, y: 12 }], speed: 70, pause: 0.7 },
      { waypoints: [{ x: 6, y: 12 }, { x: 11, y: 12 }, { x: 11, y: 6 }, { x: 6, y: 6 }], speed: 58, pause: 1.2 },
    ],
  },
];

// Parse a level map into walkable grids and entity starts.
export function parseLevel(def) {
  const rows = def.map.length;
  const cols = def.map[0].length;
  const solid = [];
  const bush = [];
  const seals = [];
  let player = null;
  let exit = null;
  for (let y = 0; y < rows; y++) {
    solid.push([]);
    bush.push([]);
    for (let x = 0; x < cols; x++) {
      const ch = def.map[y][x];
      solid[y][x] = ch === '#' || ch === 'C';
      bush[y][x] = ch === 'B';
      if (ch === 'P') player = { x: x * TILE + TILE / 2, y: y * TILE + TILE / 2 };
      if (ch === 'E') exit = { x: x * TILE + TILE / 2, y: y * TILE + TILE / 2, tx: x, ty: y };
      if (ch === '*') seals.push({ x: x * TILE + TILE / 2, y: y * TILE + TILE / 2, taken: false, bob: ((x * 7 + y * 13) % 6) });
    }
  }
  return { def, rows, cols, solid, bush, seals, player, exit };
}

export function tileAt(level, px, py) {
  const tx = Math.floor(px / TILE);
  const ty = Math.floor(py / TILE);
  if (tx < 0 || ty < 0 || tx >= level.cols || ty >= level.rows) return '#';
  return level.def.map[ty][tx];
}

export function isSolidAt(level, px, py) {
  const tx = Math.floor(px / TILE);
  const ty = Math.floor(py / TILE);
  if (tx < 0 || ty < 0 || tx >= level.cols || ty >= level.rows) return true;
  return level.solid[ty][tx];
}

export function isBushAt(level, px, py) {
  const tx = Math.floor(px / TILE);
  const ty = Math.floor(py / TILE);
  if (tx < 0 || ty < 0 || tx >= level.cols || ty >= level.rows) return false;
  return level.bush[ty][tx];
}
