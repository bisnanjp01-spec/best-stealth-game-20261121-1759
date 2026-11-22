// Lantern Thief — The Ink Vault: hand-in program (Node 22, stdlib only).
// Copies game/ and screenshots/ from this repository into the output
// directory and writes /output/dossier.json with the kit's buildDossier.
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

const caps = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
};

function copyTree(name) {
  const src = join(repoRoot, name);
  const dst = join(outDir, name);
  if (!existsSync(src)) throw new Error(`main.ts: missing ${name}/ in the repository`);
  rmSync(dst, { recursive: true, force: true });
  cpSync(src, dst, { recursive: true });
}

mkdirSync(outDir, { recursive: true });
copyTree('game');
copyTree('screenshots');
const dossier = buildDossier(outDir, caps);
if (dossier.length > 1572864) throw new Error(`main.ts: dossier ${dossier.length} bytes, over the 1.5 MiB gate cap`);
writeFileSync(join(outDir, 'dossier.json'), dossier);
console.log(`dossier written: ${dossier.length} bytes to ${join(outDir, 'dossier.json')}`);
