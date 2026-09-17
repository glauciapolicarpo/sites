/**
 * Eventos para o dataLayer do GTM. Todos levam `session_id`.
 * A lista e fechada: sao os oito eventos do briefing, e as tags de GA4 no
 * container sao mapeadas um para um a partir daqui.
 */

export const EVENTOS = {
  aberta: 'juliana_aberta',
  triagem: 'triagem_concluida',
  recomendada: 'obra_recomendada',
  ambientacaoIniciada: 'ambientacao_iniciada',
  ambientacaoGerada: 'ambientacao_gerada',
  imagemBaixada: 'imagem_baixada',
  handoff: 'handoff_whatsapp',
  cliqueProduto: 'clique_produto',
};

let idDaSessao = '';

export function definirSessao(id) {
  idDaSessao = id || '';
}

export function empurrar(evento, parametros = {}) {
  try {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: evento, session_id: idDaSessao, ...parametros });
  } catch {
    // dataLayer indisponivel nunca pode derrubar o atendimento.
  }
}
