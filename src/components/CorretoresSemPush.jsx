// GOD Painel: quais corretores ativos NÃO têm nenhum aparelho com push ativado — para o editor cobrar a ativação.
// Usa a lista de usuários que a tela já carregou (a API devolve só nTokens/temPush, nunca os tokens): zero leitura extra.
// Mostra apenas nomes de corretores e contagens — nenhum dado de cliente.
export default function CorretoresSemPush({ usuarios }) {
  const corretores = (usuarios || []).filter((u) => u.perfil === 'corretor' && u.ativo !== false);
  if (corretores.length === 0) return null;
  const sem = corretores.filter((u) => !u.temPush);
  const com = corretores.length - sem.length;

  return (
    <div className="rounded-lg px-3 py-2.5 space-y-1.5"
      style={{ background: sem.length ? 'rgba(var(--warning-rgb), 0.10)' : 'rgba(var(--success-rgb), 0.10)', border: '1px solid rgba(var(--ink-rgb), 0.06)' }}>
      <div className="flex items-center gap-2">
        <i className={`ti ti-${sem.length ? 'bell-off' : 'bell-check'} text-[16px]`} style={{ color: sem.length ? 'var(--warning)' : 'var(--success)' }} aria-hidden="true" />
        <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
          Notificações no aparelho: {com} de {corretores.length} corretores com push ativo
        </p>
      </div>
      {sem.length > 0 ? (
        <>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            Sem push (não recebem o aviso de lead novo no celular — só no sino, dentro do CRM):
          </p>
          <div className="flex flex-wrap gap-1.5">
            {sem.map((u) => (
              <span key={u.id} className="text-xs font-medium px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(var(--warning-rgb), 0.18)', color: 'var(--warning)' }}>{u.nome}</span>
            ))}
          </div>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            Peça para abrir <b>Notificações</b> no menu, ativar e tocar em “Enviar notificação de teste”.
          </p>
        </>
      ) : (
        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Todos os corretores ativos já ativaram o push em pelo menos um aparelho.</p>
      )}
    </div>
  );
}
