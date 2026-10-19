import { useState } from 'react';
import api from '../services/api';

// GOD Painel: diagnóstico dos envios de push (coleção push_log, retenção de 14 dias). Só carrega quando o editor clica
// (uma consulta) — nada é lido ao abrir a tela. Mostra usuário, tipo e resultado: nenhum dado de cliente.
const ROTULO_RESULTADO = { enviado: 'Enviado', sem_token: 'Sem push no aparelho', erro: 'Erro do FCM' };
const COR_RESULTADO = { enviado: 'var(--success)', sem_token: 'var(--warning)', erro: 'var(--accent-hover)' };

function fmtHora(iso) {
  return iso ? new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
}

export default function SaudeDoPush({ usuarios }) {
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const nome = (id) => (usuarios || []).find((u) => u.id === id)?.nome || 'Usuário removido';

  async function carregar() {
    setCarregando(true); setErro('');
    try { setDados((await api.get('/push/saude')).data); }
    catch (e) { setErro(e.response?.data?.erro || 'Não foi possível carregar o diagnóstico.'); }
    setCarregando(false);
  }

  return (
    <div className="rounded-lg px-3 py-2.5 space-y-2" style={{ background: 'rgba(var(--ink-rgb), 0.04)', border: '1px solid rgba(var(--ink-rgb), 0.06)' }}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Saúde do push (últimas 24 h)</p>
        <button onClick={carregar} disabled={carregando} className="text-xs px-3 py-1.5 rounded font-medium"
          style={{ background: 'var(--accent)', color: '#fff', opacity: carregando ? 0.6 : 1 }}>
          {carregando ? 'Carregando…' : dados ? 'Atualizar' : 'Ver diagnóstico'}
        </button>
      </div>
      {erro && <p className="text-xs" style={{ color: 'var(--accent-hover)' }}>{erro}</p>}
      {dados && (
        <div className="space-y-2">
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {dados.total} tentativa(s) de envio{dados.truncado ? ' (lista truncada)' : ''}.{' '}
            {Object.entries(dados.porResultado).map(([r, n]) => (
              <span key={r} className="mr-2" style={{ color: COR_RESULTADO[r] }}>{ROTULO_RESULTADO[r] || r}: <b>{n}</b></span>
            ))}
          </p>
          {Object.keys(dados.porUsuario).length > 0 && (
            <div className="text-xs space-y-0.5" style={{ color: 'var(--text-secondary)' }}>
              {Object.entries(dados.porUsuario).map(([id, c]) => (
                <p key={id}><b>{nome(id)}</b>: {c.enviado || 0} enviado(s), {c.sem_token || 0} sem push, {c.erro || 0} com erro</p>
              ))}
            </div>
          )}
          {Object.keys(dados.porCodigo).length > 0 && (
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              Códigos de erro do FCM: {Object.entries(dados.porCodigo).map(([c, n]) => `${c} (${n})`).join(', ')}
            </p>
          )}
          {dados.ultimasFalhas.length > 0 && (
            <div className="text-[11px] space-y-0.5" style={{ color: 'var(--text-muted)' }}>
              <p className="font-semibold">Últimas ocorrências:</p>
              {dados.ultimasFalhas.map((f, i) => (
                <p key={i}>{fmtHora(f.criadoEm)} · {nome(f.usuarioId)} · {f.tipo} · {ROTULO_RESULTADO[f.resultado] || f.resultado}{f.codigos.length ? ` (${f.codigos.join(', ')})` : ''}</p>
              ))}
            </div>
          )}
          {dados.total === 0 && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Nenhum envio registrado neste período.</p>}
        </div>
      )}
    </div>
  );
}
