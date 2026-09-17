import type { MolduraId } from './molduras';

/** Tag estetica atribuida na ingestao por regras de palavra-chave. */
export type TagEstetica =
  | 'geometrico'
  | 'organico'
  | 'figurativo'
  | 'cor_forte'
  | 'preto_e_branco';

export interface Obra {
  id: string;
  titulo: string;
  artista: string;
  descricao: string;
  tecnica: string;
  edicao: string | null;
  largura_cm: number | null;
  altura_cm: number | null;
  preco: number;
  disponivel: boolean;
  url: string;
  imagem_url: string;
  imagem_local: string | null;
  tags_estetica: TagEstetica[];
  cores: string[];
  atualizado_em: string;
}

export interface FiltroBusca {
  texto?: string;
  preco_min?: number;
  preco_max?: number;
  tecnica?: string;
  artista?: string;
  tags?: string[];
  largura_max_cm?: number;
  limite?: number;
}

export interface RespostaBusca {
  obras: Obra[];
  total: number;
}

export type TipoAcao = 'abrir_ambientacao' | 'chamar_consultor';

export interface Acao {
  tipo: TipoAcao;
  obra_id?: string;
  motivo?: string;
  whatsapp_url?: string;
}

export interface RespostaChat {
  session_id: string;
  resposta: string;
  obras: Obra[];
  acoes: Acao[];
  restante_na_sessao: number;
}

export interface EntradaCompose {
  obra_id: string;
  foto: string;
  quad: [[number, number], [number, number], [number, number], [number, number]];
  posicao: { x: number; y: number };
  parede_cm: number;
  moldura: MolduraId;
}
