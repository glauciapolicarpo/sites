import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import sharp from 'sharp';
import { caminhos, config } from '../config';
import { banco, obraDisponivelPorId } from '../db/index';
import { ehMolduraValida, MOLDURA_PADRAO } from '../compartilhado/molduras';
import { caminhoAbsolutoDaImagem } from '../ingest/imagens';
import { compor } from '../compose/render';
import { ipDoPedido, limitarPorIp } from '../lib/limites';
import type { EntradaCompose } from '../compartilhado/tipos';

/**
 * POST /compose
 * Gera o PNG final, e so quando o cliente pede para salvar ou enviar. Esta e a
 * unica rota que recebe a foto do visitante.
 */

const TIPOS_ACEITOS = new Set(['jpeg', 'jpg', 'png', 'webp', 'heif', 'avif', 'gif', 'tiff']);

/** Valida o tipo real do arquivo pelo conteudo, nao pela extensao nem pelo rotulo. */
async function fotoValida(buffer: Buffer): Promise<{ ok: true } | { ok: false; motivo: string }> {
  try {
    const meta = await sharp(buffer, { failOn: 'none' }).metadata();
    if (!meta.format || !TIPOS_ACEITOS.has(meta.format)) {
      return { ok: false, motivo: 'O arquivo enviado nao e uma imagem reconhecida.' };
    }
    if (!meta.width || !meta.height || meta.width < 200 || meta.height < 200) {
      return { ok: false, motivo: 'A foto e pequena demais para ambientar.' };
    }
    return { ok: true };
  } catch {
    return { ok: false, motivo: 'O arquivo enviado nao e uma imagem valida.' };
  }
}

function decodificarFoto(bruto: unknown): Buffer | null {
  if (typeof bruto !== 'string' || bruto.length === 0) return null;
  const semPrefixo = bruto.replace(/^data:image\/[a-zA-Z.+-]+;base64,/, '');
  if (!/^[A-Za-z0-9+/=\s]+$/.test(semPrefixo)) return null;
  try {
    const buffer = Buffer.from(semPrefixo, 'base64');
    return buffer.length > 0 ? buffer : null;
  } catch {
    return null;
  }
}

function quadValido(bruto: unknown): bruto is EntradaCompose['quad'] {
  return (
    Array.isArray(bruto) &&
    bruto.length === 4 &&
    bruto.every(
      (p) =>
        Array.isArray(p) &&
        p.length === 2 &&
        p.every((n) => typeof n === 'number' && Number.isFinite(n) && n >= -0.5 && n <= 1.5),
    )
  );
}

export async function rotaCompose(app: FastifyInstance): Promise<void> {
  app.post('/compose', async (pedido, resposta) => {
    const ip = ipDoPedido(pedido.headers as Record<string, unknown>, pedido.ip);
    const porIp = limitarPorIp(ip);
    if (!porIp.permitido) return resposta.status(429).send({ erro: porIp.motivo });

    const corpo = (pedido.body ?? {}) as Partial<EntradaCompose>;

    const obraId = typeof corpo.obra_id === 'string' ? corpo.obra_id : '';
    const obra = obraId ? obraDisponivelPorId(banco(), obraId) : null;
    if (!obra) return resposta.status(404).send({ erro: 'Obra nao encontrada ou indisponivel.' });

    if (!obra.largura_cm || !obra.altura_cm) {
      return resposta.status(422).send({
        erro: 'Esta obra ainda nao tem medida cadastrada, entao nao da para gerar a imagem em escala real.',
      });
    }

    if (!quadValido(corpo.quad)) {
      return resposta.status(400).send({ erro: 'Os quatro cantos da parede estao invalidos.' });
    }

    const paredeCm = Number(corpo.parede_cm);
    if (!Number.isFinite(paredeCm) || paredeCm < 50 || paredeCm > 2000) {
      return resposta.status(400).send({ erro: 'A largura da parede precisa estar entre 50 e 2000 cm.' });
    }

    const posicao = corpo.posicao;
    if (
      !posicao ||
      typeof posicao.x !== 'number' ||
      typeof posicao.y !== 'number' ||
      !Number.isFinite(posicao.x) ||
      !Number.isFinite(posicao.y)
    ) {
      return resposta.status(400).send({ erro: 'Posicao da obra invalida.' });
    }

    const foto = decodificarFoto(corpo.foto);
    if (!foto) return resposta.status(400).send({ erro: 'Foto ausente ou mal codificada.' });
    if (foto.length > config.maxUploadBytes) {
      return resposta.status(413).send({
        erro: `A foto passa de ${Math.round(config.maxUploadBytes / (1024 * 1024))} MB. Envie uma imagem menor.`,
      });
    }

    const verificacao = await fotoValida(foto);
    if (!verificacao.ok) return resposta.status(415).send({ erro: verificacao.motivo });

    const recorte = caminhoAbsolutoDaImagem(obra.imagem_local);
    if (!recorte) {
      return resposta.status(422).send({
        erro: 'A imagem desta obra ainda nao foi preparada. Rode a ingestao ou coloque o recorte em data/obras/.',
      });
    }

    const molduraId = ehMolduraValida(corpo.moldura) ? corpo.moldura : MOLDURA_PADRAO;

    try {
      const resultado = await compor({
        foto,
        obra: fs.readFileSync(recorte),
        larguraObraCm: obra.largura_cm,
        alturaObraCm: obra.altura_cm,
        quadNormalizado: corpo.quad,
        posicao: { x: posicao.x, y: posicao.y },
        paredeCm,
        moldura: molduraId,
        ladoMaiorPx: config.composeLadoMaiorPx,
        marcaDagua: 'Simulacao. Multiplos Mayer Mizrahi.',
      });

      fs.mkdirSync(caminhos.composicoes, { recursive: true });
      const nome = `${crypto.randomBytes(16).toString('hex')}.png`;
      fs.writeFileSync(path.join(caminhos.composicoes, nome), resultado.png);

      const expiraEm = new Date(Date.now() + config.composeValidadeDias * 86_400_000);
      return {
        url: `${config.baseUrlPublica}/composicoes/${nome}`,
        expira_em: expiraEm.toISOString(),
        largura: resultado.largura,
        altura: resultado.altura,
        medida_com_moldura_cm: {
          largura: resultado.larguraTotalCm,
          altura: resultado.alturaTotalCm,
        },
        fracao_da_parede: Number(resultado.fracaoDaLargura.toFixed(4)),
      };
    } catch (erro) {
      pedido.log.error({ erro: (erro as Error).message }, 'falha ao compor');
      return resposta.status(500).send({ erro: 'Nao foi possivel gerar a imagem. Tente reposicionar a obra.' });
    }
  });
}
