/**
 * Cliente HTTP do widget. Nenhuma credencial passa por aqui: a chave da API do
 * modelo fica no servidor, e o widget so conversa com o nosso dominio.
 */

export function criarApi(base) {
  const raiz = String(base || '').replace(/\/+$/, '');

  async function postar(caminho, corpo, { sinal } = {}) {
    const resposta = await fetch(`${raiz}${caminho}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(corpo),
      signal: sinal,
      credentials: 'omit',
      mode: 'cors',
    });

    let dados = null;
    try {
      dados = await resposta.json();
    } catch {
      dados = null;
    }

    if (!resposta.ok) {
      const erro = new Error((dados && dados.erro) || `Falha ${resposta.status}`);
      erro.status = resposta.status;
      erro.dados = dados;
      throw erro;
    }
    return dados;
  }

  return {
    raiz,
    conversar: (sessionId, mensagem, opcoes) =>
      postar('/chat', { session_id: sessionId, mensagem }, opcoes),
    encerrar: (sessionId) =>
      postar('/chat/encerrar', { session_id: sessionId }).catch(() => null),
    compor: (pedido, opcoes) => postar('/compose', pedido, opcoes),
    urlDaObra: (obra) => {
      // O recorte com transparencia, quando existe, ambienta muito melhor que
      // a foto de produto original, que costuma vir com fundo de estudio.
      if (obra.imagem_local) {
        const nome = String(obra.imagem_local).split('/').pop();
        return `${raiz}/obras/${encodeURIComponent(nome)}`;
      }
      return obra.imagem_url;
    },
  };
}
