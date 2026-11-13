// Como o Dashboard aplica os eventos de lead em tempo real. O servidor já só manda o que a pessoa pode ver; o corretor, além
// disso, só mantém na lista os leads dele (a mesma regra do GET /leads), mesmo que chegue outra coisa.
const soOsDele = (usuario) => usuario?.perfil === 'corretor';

export function aplicarLeadNovo(lista, lead, usuario) {
  if (soOsDele(usuario) && lead.corretorId !== usuario.id) return lista;
  return [lead, ...lista.filter((l) => l.id !== lead.id)];
}

// Junta com o que veio da API, porque o evento não leva telefone, e-mail nem notas.
export function aplicarLeadAtualizado(lista, lead, usuario) {
  const existe = lista.some((l) => l.id === lead.id);
  if (soOsDele(usuario)) {
    if (lead.corretorId !== usuario.id) return lista.filter((l) => l.id !== lead.id); // repassado: saiu da mão dele
    if (!existe) return [lead, ...lista]; // distribuído agora a ele
  }
  return lista.map((l) => (l.id === lead.id ? { ...l, ...lead } : l));
}
