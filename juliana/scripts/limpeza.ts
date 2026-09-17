import { apagarComposicoesVencidas } from '../src/lib/limpeza';

const apagadas = apagarComposicoesVencidas();
process.stdout.write(`Composicoes removidas: ${apagadas}\n`);
