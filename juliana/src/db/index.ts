import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { caminhos } from '../config';
import type { Obra, TagEstetica } from '../compartilhado/tipos';

export type BancoJuliana = Database.Database;

let instancia: BancoJuliana | null = null;

const ESQUEMA = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS obras (
  id            TEXT PRIMARY KEY,
  titulo        TEXT NOT NULL DEFAULT '',
  artista       TEXT NOT NULL DEFAULT '',
  descricao     TEXT NOT NULL DEFAULT '',
  tecnica       TEXT NOT NULL DEFAULT '',
  edicao        TEXT,
  largura_cm    REAL,
  altura_cm     REAL,
  preco         REAL NOT NULL DEFAULT 0,
  disponivel    INTEGER NOT NULL DEFAULT 1,
  url           TEXT NOT NULL DEFAULT '',
  imagem_url    TEXT NOT NULL DEFAULT '',
  imagem_local  TEXT,
  tags_estetica TEXT NOT NULL DEFAULT '[]',
  cores         TEXT NOT NULL DEFAULT '[]',
  atualizado_em TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_obras_disponivel ON obras (disponivel);
CREATE INDEX IF NOT EXISTS idx_obras_preco      ON obras (preco);
CREATE INDEX IF NOT EXISTS idx_obras_artista    ON obras (artista);
CREATE INDEX IF NOT EXISTS idx_obras_tecnica    ON obras (tecnica);
CREATE INDEX IF NOT EXISTS idx_obras_largura    ON obras (largura_cm);

-- Indice de texto. Tabela propria (nao external content) reconstruida a cada
-- ingestao: com menos de mil itens o custo e irrelevante e evita triggers.
CREATE VIRTUAL TABLE IF NOT EXISTS obras_fts USING fts5(
  id UNINDEXED,
  titulo,
  artista,
  descricao,
  tags,
  tokenize = "unicode61 remove_diacritics 2"
);

CREATE TABLE IF NOT EXISTS meta (
  chave TEXT PRIMARY KEY,
  valor TEXT NOT NULL
);
`;

export function abrirBanco(arquivo: string = caminhos.banco): BancoJuliana {
  fs.mkdirSync(path.dirname(arquivo), { recursive: true });
  const db = new Database(arquivo);
  db.exec(ESQUEMA);
  return db;
}

export function banco(): BancoJuliana {
  if (!instancia) instancia = abrirBanco();
  return instancia;
}

export function fecharBanco(): void {
  instancia?.close();
  instancia = null;
}

/** Linha crua como sai do SQLite, antes de desserializar os campos JSON. */
interface LinhaObra {
  id: string;
  titulo: string;
  artista: string;
  descricao: string;
  tecnica: string;
  edicao: string | null;
  largura_cm: number | null;
  altura_cm: number | null;
  preco: number;
  disponivel: number;
  url: string;
  imagem_url: string;
  imagem_local: string | null;
  tags_estetica: string;
  cores: string;
  atualizado_em: string;
}

function jsonSeguro<T>(bruto: string, padrao: T): T {
  try {
    const v = JSON.parse(bruto);
    return Array.isArray(v) ? (v as T) : padrao;
  } catch {
    return padrao;
  }
}

export function linhaParaObra(linha: LinhaObra): Obra {
  return {
    id: linha.id,
    titulo: linha.titulo,
    artista: linha.artista,
    descricao: linha.descricao,
    tecnica: linha.tecnica,
    edicao: linha.edicao,
    largura_cm: linha.largura_cm,
    altura_cm: linha.altura_cm,
    preco: linha.preco,
    disponivel: linha.disponivel === 1,
    url: linha.url,
    imagem_url: linha.imagem_url,
    imagem_local: linha.imagem_local,
    tags_estetica: jsonSeguro<TagEstetica[]>(linha.tags_estetica, []),
    cores: jsonSeguro<string[]>(linha.cores, []),
    atualizado_em: linha.atualizado_em,
  };
}

export function obraPorId(db: BancoJuliana, id: string): Obra | null {
  const linha = db.prepare('SELECT * FROM obras WHERE id = ?').get(id) as LinhaObra | undefined;
  return linha ? linhaParaObra(linha) : null;
}

/** So devolve obras disponiveis: regra dura do briefing. */
export function obraDisponivelPorId(db: BancoJuliana, id: string): Obra | null {
  const linha = db
    .prepare('SELECT * FROM obras WHERE id = ? AND disponivel = 1')
    .get(id) as LinhaObra | undefined;
  return linha ? linhaParaObra(linha) : null;
}

export function gravarMeta(db: BancoJuliana, chave: string, valor: string): void {
  db.prepare(
    'INSERT INTO meta (chave, valor) VALUES (?, ?) ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor',
  ).run(chave, valor);
}

export function lerMeta(db: BancoJuliana, chave: string): string | null {
  const linha = db.prepare('SELECT valor FROM meta WHERE chave = ?').get(chave) as
    | { valor: string }
    | undefined;
  return linha?.valor ?? null;
}

export function totalDeObras(db: BancoJuliana, apenasDisponiveis = false): number {
  const sql = apenasDisponiveis
    ? 'SELECT COUNT(*) AS n FROM obras WHERE disponivel = 1'
    : 'SELECT COUNT(*) AS n FROM obras';
  return (db.prepare(sql).get() as { n: number }).n;
}

/** Substitui o catalogo inteiro numa transacao. */
export function regravarCatalogo(db: BancoJuliana, obras: Obra[]): void {
  const inserir = db.prepare(`
    INSERT INTO obras (
      id, titulo, artista, descricao, tecnica, edicao, largura_cm, altura_cm,
      preco, disponivel, url, imagem_url, imagem_local, tags_estetica, cores, atualizado_em
    ) VALUES (
      @id, @titulo, @artista, @descricao, @tecnica, @edicao, @largura_cm, @altura_cm,
      @preco, @disponivel, @url, @imagem_url, @imagem_local, @tags_estetica, @cores, @atualizado_em
    )
  `);
  const inserirFts = db.prepare(
    'INSERT INTO obras_fts (id, titulo, artista, descricao, tags) VALUES (?, ?, ?, ?, ?)',
  );

  const transacao = db.transaction((itens: Obra[]) => {
    db.prepare('DELETE FROM obras').run();
    db.prepare('DELETE FROM obras_fts').run();
    for (const o of itens) {
      inserir.run({
        id: o.id,
        titulo: o.titulo,
        artista: o.artista,
        descricao: o.descricao,
        tecnica: o.tecnica,
        edicao: o.edicao,
        largura_cm: o.largura_cm,
        altura_cm: o.altura_cm,
        preco: o.preco,
        disponivel: o.disponivel ? 1 : 0,
        url: o.url,
        imagem_url: o.imagem_url,
        imagem_local: o.imagem_local,
        tags_estetica: JSON.stringify(o.tags_estetica),
        cores: JSON.stringify(o.cores),
        atualizado_em: o.atualizado_em,
      });
      inserirFts.run(
        o.id,
        o.titulo,
        o.artista,
        `${o.descricao} ${o.tecnica} ${o.edicao ?? ''}`.trim(),
        o.tags_estetica.join(' '),
      );
    }
  });

  transacao(obras);
}
