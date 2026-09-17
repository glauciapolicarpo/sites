/**
 * Triagem de no maximo tres perguntas, com chips de resposta rapida.
 * O campo de texto livre continua disponivel o tempo todo, em paralelo: quem
 * ja sabe o que quer nao precisa passar por aqui.
 */
export const PERGUNTAS = [
  {
    chave: 'ambiente',
    texto: 'Para comecar: onde essa obra vai ficar?',
    opcoes: ['Sala de estar', 'Quarto', 'Hall de entrada', 'Escritorio', 'Ainda nao sei'],
  },
  {
    chave: 'gosto',
    texto: 'E o que costuma atrair seu olhar?',
    opcoes: ['Formas geometricas', 'Traco organico', 'Figurativo', 'Cores fortes', 'Preto e branco'],
  },
  {
    chave: 'faixa',
    texto: 'Por ultimo, qual faixa de investimento faz sentido?',
    opcoes: ['Ate R$ 3.000', 'R$ 3.000 a R$ 6.000', 'R$ 6.000 a R$ 12.000', 'Acima de R$ 12.000', 'Prefiro nao dizer'],
  },
];

/** Monta a mensagem que vai ao modelo a partir das respostas da triagem. */
export function resumoDaTriagem(respostas) {
  const partes = [];
  if (respostas.ambiente && respostas.ambiente !== 'Ainda nao sei') {
    partes.push(`a obra vai para: ${respostas.ambiente.toLowerCase()}`);
  }
  if (respostas.gosto) partes.push(`gosto: ${respostas.gosto.toLowerCase()}`);
  if (respostas.faixa && respostas.faixa !== 'Prefiro nao dizer') {
    partes.push(`faixa de investimento: ${respostas.faixa}`);
  }
  if (partes.length === 0) return 'Ainda estou explorando. Pode me mostrar algumas obras?';
  return `${partes.join('; ')}. Com base nisso, o que voce sugere?`;
}
