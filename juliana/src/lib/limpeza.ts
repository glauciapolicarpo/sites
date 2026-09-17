import fs from 'node:fs';
import path from 'node:path';
import { caminhos, config } from '../config';

/**
 * Apaga composicoes com mais de `COMPOSE_VALIDADE_DIAS`. Chamada pelo cron
 * diario e tambem por um temporizador interno, para o disco do VPS nao encher
 * caso o cron nao seja instalado.
 */
export function apagarComposicoesVencidas(
  pasta: string = caminhos.composicoes,
  dias: number = config.composeValidadeDias,
): number {
  if (!fs.existsSync(pasta)) return 0;
  const limite = Date.now() - dias * 86_400_000;
  let apagadas = 0;

  for (const nome of fs.readdirSync(pasta)) {
    if (!nome.endsWith('.png')) continue;
    const arquivo = path.join(pasta, nome);
    try {
      if (fs.statSync(arquivo).mtimeMs < limite) {
        fs.unlinkSync(arquivo);
        apagadas += 1;
      }
    } catch {
      // Arquivo some entre o readdir e o stat: nada a fazer.
    }
  }
  return apagadas;
}
