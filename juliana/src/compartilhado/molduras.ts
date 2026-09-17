/**
 * Tabela unica de molduras. Consumida pelo preview no navegador (widget) e
 * pelo /compose no servidor, para que o PNG final nao divirja do preview.
 * Espessuras em centimetros reais, aplicadas em cada um dos quatro lados.
 */

export type MolduraId =
  | 'sem'
  | 'canaleta'
  | 'madeira'
  | 'preta'
  | 'branca'
  | 'classica'
  | 'metacrilato';

export interface Moldura {
  id: MolduraId;
  nome: string;
  /** Espessura real de cada lado, em cm. */
  espessuraCm: number;
  /** Cor da face da moldura. `null` significa ausencia de moldura. */
  cor: string | null;
  /** Cor da aresta interna, usada para dar volume ao chanfro. */
  corInterna: string | null;
}

export const MOLDURAS: readonly Moldura[] = [
  { id: 'sem', nome: 'Sem moldura', espessuraCm: 0, cor: null, corInterna: null },
  { id: 'canaleta', nome: 'Canaleta', espessuraCm: 2, cor: '#2A2B2E', corInterna: '#151618' },
  { id: 'madeira', nome: 'Madeira clara', espessuraCm: 4, cor: '#C49A63', corInterna: '#A07C4C' },
  { id: 'preta', nome: 'Preta', espessuraCm: 4, cor: '#17181A', corInterna: '#000000' },
  { id: 'branca', nome: 'Branca', espessuraCm: 4, cor: '#F4F3EE', corInterna: '#D9D7CE' },
  { id: 'classica', nome: 'Classica', espessuraCm: 7, cor: '#9A7B3C', corInterna: '#7A5F2A' },
  { id: 'metacrilato', nome: 'Metacrilato', espessuraCm: 1.5, cor: '#D8DBDD', corInterna: '#B4B9BC' },
];

export const MOLDURA_PADRAO: MolduraId = 'sem';

const PORid = new Map<string, Moldura>(MOLDURAS.map((m) => [m.id, m]));

export function moldura(id: string | null | undefined): Moldura {
  return PORid.get(String(id ?? '')) ?? PORid.get(MOLDURA_PADRAO)!;
}

export function ehMolduraValida(id: unknown): id is MolduraId {
  return typeof id === 'string' && PORid.has(id);
}

/**
 * Medida externa da peca emoldurada, em cm. A moldura cresce para fora da
 * obra: 50 x 70 com moldura classica (7 cm) vira 64 x 84.
 */
export function medidaComMoldura(
  larguraCm: number,
  alturaCm: number,
  id: string | null | undefined,
): { larguraCm: number; alturaCm: number; espessuraCm: number } {
  const m = moldura(id);
  return {
    larguraCm: larguraCm + 2 * m.espessuraCm,
    alturaCm: alturaCm + 2 * m.espessuraCm,
    espessuraCm: m.espessuraCm,
  };
}
