import { build } from 'esbuild';
import { gzipSync } from 'node:zlib';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Empacota o widget num arquivo unico, sem framework.
 * Teto do briefing: 100 KB comprimido.
 */

const aqui = path.dirname(fileURLToPath(import.meta.url));
const saida = path.join(aqui, 'dist', 'widget.js');
const TETO_GZIP = 100 * 1024;

await build({
  entryPoints: [path.join(aqui, 'src', 'index.js')],
  outfile: saida,
  bundle: true,
  minify: true,
  format: 'iife',
  // Navegadores atuais de desktop e celular. Safari do iPhone e obrigatorio:
  // e onde a foto vai ser tirada.
  target: ['chrome100', 'safari15', 'firefox100', 'edge100'],
  legalComments: 'none',
  resolveExtensions: ['.js', '.ts'],
  loader: { '.ts': 'ts' },
  define: { 'process.env.NODE_ENV': '"production"' },
});

const bruto = fs.readFileSync(saida);
const comprimido = gzipSync(bruto).length;
const kb = (n) => `${(n / 1024).toFixed(1)} KB`;

process.stdout.write(
  `widget.js  ${kb(bruto.length)} bruto  ${kb(comprimido)} comprimido  (teto ${kb(TETO_GZIP)})\n`,
);

if (comprimido > TETO_GZIP) {
  process.stderr.write(`\nBundle acima do teto de ${kb(TETO_GZIP)} comprimido.\n`);
  process.exit(1);
}
