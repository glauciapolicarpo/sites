import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type Anthropic from '@anthropic-ai/sdk';
import { caminhos, config } from '../config';

/**
 * Historico de conversa em memoria, por session_id, com teto de turnos.
 * Cada conversa encerrada e gravada em JSON diario em `data/transcricoes/`,
 * para a revisao semanal da cliente. Nao ha banco de usuarios: o MVP nao tem
 * painel administrativo nem login, por decisao de escopo.
 */

export interface Sessao {
  id: string;
  mensagens: Anthropic.MessageParam[];
  /** Quantas mensagens o visitante ja mandou; alimenta o rate limit por sessao. */
  mensagensDoVisitante: number;
  criadaEm: number;
  ultimaEm: number;
  /** Ids de obra que ja foram mostradas, para a transcricao. */
  obrasMostradas: string[];
  encerrada: boolean;
}

const sessoes = new Map<string, Sessao>();

export function novoIdDeSessao(): string {
  return crypto.randomUUID();
}

export function obterSessao(id: string): Sessao {
  const existente = sessoes.get(id);
  if (existente) return existente;
  const nova: Sessao = {
    id,
    mensagens: [],
    mensagensDoVisitante: 0,
    criadaEm: Date.now(),
    ultimaEm: Date.now(),
    obrasMostradas: [],
    encerrada: false,
  };
  sessoes.set(id, nova);
  return nova;
}

/**
 * Mantem no maximo `config.maxTurnos` turnos. O corte respeita o pareamento
 * entre `tool_use` e `tool_result`: cortar no meio de um par faz a API recusar
 * a requisicao inteira, entao o inicio da janela sempre cai numa mensagem de
 * usuario que nao seja um bloco de resultados de ferramenta.
 */
export function podarHistorico(mensagens: Anthropic.MessageParam[]): Anthropic.MessageParam[] {
  const teto = config.maxTurnos * 2;
  if (mensagens.length <= teto) return mensagens;

  let corte = mensagens.length - teto;
  while (corte < mensagens.length && !inicioValido(mensagens[corte])) corte += 1;
  return mensagens.slice(corte);
}

function inicioValido(mensagem: Anthropic.MessageParam | undefined): boolean {
  if (!mensagem || mensagem.role !== 'user') return false;
  if (typeof mensagem.content === 'string') return true;
  return !mensagem.content.some((bloco) => bloco.type === 'tool_result');
}

export function registrarObras(sessao: Sessao, ids: string[]): void {
  for (const id of ids) {
    if (!sessao.obrasMostradas.includes(id)) sessao.obrasMostradas.push(id);
  }
}

/** Grava a transcricao no arquivo do dia e libera a sessao da memoria. */
export function encerrarSessao(id: string, motivo: 'inatividade' | 'pedido' | 'desligamento'): void {
  const sessao = sessoes.get(id);
  if (!sessao || sessao.encerrada) return;
  sessao.encerrada = true;
  sessoes.delete(id);

  try {
    fs.mkdirSync(caminhos.transcricoes, { recursive: true });
    const dia = new Date().toISOString().slice(0, 10);
    const arquivo = path.join(caminhos.transcricoes, `${dia}.jsonl`);
    const registro = {
      session_id: sessao.id,
      motivo,
      criada_em: new Date(sessao.criadaEm).toISOString(),
      encerrada_em: new Date().toISOString(),
      mensagens_do_visitante: sessao.mensagensDoVisitante,
      obras_mostradas: sessao.obrasMostradas,
      conversa: sessao.mensagens.map(resumirMensagem),
    };
    fs.appendFileSync(arquivo, `${JSON.stringify(registro)}\n`, 'utf8');
  } catch {
    // Transcricao e material de revisao, nunca motivo para derrubar atendimento.
  }
}

/** Reduz a mensagem ao que a cliente precisa ler na revisao semanal. */
function resumirMensagem(m: Anthropic.MessageParam): { papel: string; texto: string } {
  if (typeof m.content === 'string') return { papel: m.role, texto: m.content };
  const partes: string[] = [];
  for (const bloco of m.content) {
    if (bloco.type === 'text') partes.push(bloco.text);
    else if (bloco.type === 'tool_use') partes.push(`[ferramenta ${bloco.name} ${JSON.stringify(bloco.input)}]`);
    else if (bloco.type === 'tool_result') partes.push('[resultado da ferramenta]');
  }
  return { papel: m.role, texto: partes.join(' ') };
}

/** Sessoes paradas ha mais de `MINUTOS_ATE_ENCERRAR` viram transcricao. */
export function varrerInativas(): number {
  const limite = Date.now() - config.minutosAteEncerrar * 60_000;
  let encerradas = 0;
  for (const [id, sessao] of [...sessoes]) {
    if (sessao.ultimaEm < limite) {
      encerrarSessao(id, 'inatividade');
      encerradas += 1;
    }
  }
  return encerradas;
}

export function encerrarTodas(): void {
  for (const id of [...sessoes.keys()]) encerrarSessao(id, 'desligamento');
}

export function sessoesAtivas(): number {
  return sessoes.size;
}
