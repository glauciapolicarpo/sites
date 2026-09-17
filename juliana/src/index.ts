import fs from 'node:fs';
import path from 'node:path';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import estaticos from '@fastify/static';
import { caminhos, config, garantirPastas } from './config';
import { banco, fecharBanco } from './db/index';
import { rotaBusca } from './rotas/busca';
import { rotaChat } from './rotas/chat';
import { rotaCompose } from './rotas/compose';
import { rotaSaude } from './rotas/saude';
import { encerrarTodas, varrerInativas } from './chat/sessoes';
import { varrerLimites } from './lib/limites';
import { apagarComposicoesVencidas } from './lib/limpeza';

export async function construirServidor() {
  garantirPastas();

  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? 'info',
      // Nunca logar corpo de requisicao: o /compose carrega a foto do cliente.
      redact: ['req.headers.authorization', 'req.headers.cookie'],
    },
    // Teto do corpo: a foto vai em base64, que infla cerca de 4/3.
    bodyLimit: Math.round(config.maxUploadBytes * 1.4) + 64 * 1024,
    trustProxy: true,
  });

  await app.register(cors, {
    origin(origem, callback) {
      // Sem Origin: curl, monitoramento, healthcheck do VPS.
      if (!origem) return callback(null, true);
      callback(null, config.origensPermitidas.includes(origem));
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    maxAge: 86_400,
  });

  // Composicoes geradas, servidas por URL publica com nome aleatorio.
  await app.register(estaticos, {
    root: caminhos.composicoes,
    prefix: '/composicoes/',
    decorateReply: false,
    cacheControl: true,
    maxAge: '30d',
    index: false,
  });

  // Recortes das obras, usados pelo preview do widget.
  await app.register(estaticos, {
    root: caminhos.obras,
    prefix: '/obras/',
    decorateReply: false,
    cacheControl: true,
    maxAge: '1d',
    index: false,
  });

  // Bundle do widget. Cache curto: a versao vai na query da tag do GTM.
  if (fs.existsSync(caminhos.widget)) {
    await app.register(estaticos, {
      root: caminhos.widget,
      prefix: '/',
      decorateReply: false,
      cacheControl: true,
      maxAge: '5m',
      index: false,
    });
  } else {
    app.log.warn(`Bundle do widget ausente em ${caminhos.widget}. Rode "npm run build:widget".`);
  }

  await app.register(rotaSaude);
  await app.register(rotaBusca);
  await app.register(rotaChat);
  await app.register(rotaCompose);

  app.get('/', async () => ({
    servico: 'juliana',
    versao: config.versao,
    endpoints: ['/health', '/search', '/chat', '/compose', '/widget.js'],
  }));

  return app;
}

async function principal(): Promise<void> {
  const app = await construirServidor();

  // Aquece o banco no boot: e melhor falhar agora do que no primeiro visitante.
  try {
    banco();
  } catch (erro) {
    app.log.error({ erro: (erro as Error).message }, 'banco indisponivel no boot');
  }

  const manutencao = setInterval(() => {
    try {
      const encerradas = varrerInativas();
      varrerLimites();
      if (encerradas > 0) app.log.info({ encerradas }, 'sessoes inativas gravadas em transcricao');
    } catch (erro) {
      app.log.error({ erro }, 'falha na manutencao periodica');
    }
  }, 5 * 60_000);
  manutencao.unref();

  // Limpeza diaria das composicoes vencidas, caso nao haja cron externo.
  const limpeza = setInterval(() => {
    try {
      const apagadas = apagarComposicoesVencidas();
      if (apagadas > 0) app.log.info({ apagadas }, 'composicoes vencidas removidas');
    } catch (erro) {
      app.log.error({ erro }, 'falha na limpeza de composicoes');
    }
  }, 24 * 60 * 60_000);
  limpeza.unref();

  const desligar = async (sinal: string) => {
    app.log.info({ sinal }, 'desligando');
    encerrarTodas();
    await app.close();
    fecharBanco();
    process.exit(0);
  };
  process.on('SIGTERM', () => void desligar('SIGTERM'));
  process.on('SIGINT', () => void desligar('SIGINT'));

  await app.listen({ port: config.porta, host: config.host });
}

const executadoDiretamente =
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname);

if (executadoDiretamente) {
  principal().catch((erro: Error) => {
    process.stderr.write(`Falha ao subir o servico: ${erro.message}\n`);
    process.exit(1);
  });
}
