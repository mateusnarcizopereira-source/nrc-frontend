// Identifica o aparelho para diagnóstico do push. Regras puras, sem dado pessoal: não usa nome, número nem nada do cliente.
const CHAVE_ID = 'nrc_aparelho_id';

export function descreverAparelho(ua = '', instalado = false) {
  const plataforma = /Android/i.test(ua) ? 'Android'
    : /iPhone|iPad|iPod/i.test(ua) ? 'iOS'
    : /Windows/i.test(ua) ? 'Windows'
    : /Mac OS X/i.test(ua) ? 'Mac'
    : /Linux/i.test(ua) ? 'Linux' : 'desconhecida';
  const navegador = /SamsungBrowser/i.test(ua) ? 'Samsung'
    : /EdgA?\/|Edg\//i.test(ua) ? 'Edge'
    : /OPR\//i.test(ua) ? 'Opera'
    : /Firefox\/|FxiOS/i.test(ua) ? 'Firefox'
    : /Chrome\/|CriOS/i.test(ua) ? 'Chrome'
    : /Safari\//i.test(ua) ? 'Safari' : 'desconhecido';
  return { plataforma, navegador, instalado: Boolean(instalado), ua: String(ua).slice(0, 200) };
}

// Id aleatório, gerado uma vez por aparelho e navegador. Sem armazenamento disponível: null (o token anterior ainda funciona).
export function idDoAparelho(storage, gerar = () => crypto.randomUUID()) {
  try {
    let id = storage.getItem(CHAVE_ID);
    if (!id) { id = gerar(); storage.setItem(CHAVE_ID, id); }
    return id;
  } catch { return null; }
}
