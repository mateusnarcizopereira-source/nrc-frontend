// Tarja borrada no lugar do telefone/e-mail quando o servidor marcou o lead com `contatoOculto` (conta com restrição de dados).
// O texto é FICTÍCIO (só pontos): nenhum dado do cliente chega ao navegador, e a tarja não é um campo vazio — deixa claro que há um contato restrito.
const FALSO = { telefone: '(••) •••••-••••', email: '••••••••@••••••.•••' };

export default function ContatoOculto({ tipo = 'telefone' }) {
  return (
    <span
      role="img"
      aria-label="Contato restrito"
      title="Contato restrito"
      className="inline-block select-none rounded-sm px-1.5"
      style={{ filter: 'blur(3.5px)', background: 'rgba(var(--ink-rgb), 0.12)', color: 'var(--text-muted)', cursor: 'not-allowed' }}
    >
      {FALSO[tipo] || FALSO.telefone}
    </span>
  );
}
