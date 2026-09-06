import { useState, useEffect } from 'react';
import api from '../services/api';
import { useConfig } from '../contexts/ConfigContext';
import AutomacoesPainel from '../components/AutomacoesPainel';

// ── Toggle ────────────────────────────────────────────────────
function Toggle({ ativo, onChange, carregando }) {
  return (
    <button
      onClick={() => onChange(!ativo)}
      disabled={carregando}
      aria-pressed={ativo}
      style={{
        width: '48px', height: '26px', borderRadius: '13px', border: 'none',
        padding: '3px', cursor: carregando ? 'wait' : 'pointer',
        background: ativo ? 'var(--accent)' : 'var(--text-faint)',
        transition: 'background 0.2s',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          display: 'block', width: '20px', height: '20px', borderRadius: '50%',
          background: 'var(--surface)',
          transform: ativo ? 'translateX(22px)' : 'translateX(0)',
          transition: 'transform 0.2s',
        }}
      />
    </button>
  );
}

// ── Perfis disponíveis ────────────────────────────────────────
const PERFIS = ['corretor', 'operador', 'gerente', 'diretor', 'editor'];

const PERFIL_BADGE = {
  corretor:  { bg: 'rgba(var(--blue-rgb), 0.15)',  color: 'var(--blue)' },
  operador:  { bg: 'rgba(var(--warning-rgb), 0.15)', color: 'var(--warning)' },
  gerente:   { bg: 'rgba(var(--accent-rgb), 0.15)',  color: 'var(--accent-hover)' },
  diretor:   { bg: 'rgba(var(--purple-rgb), 0.15)', color: 'var(--purple)' },
  editor:    { bg: 'rgba(var(--success-rgb), 0.15)',  color: 'var(--success)' },
};

function PerfilBadge({ perfil }) {
  const s = PERFIL_BADGE[perfil] || PERFIL_BADGE.corretor;
  return (
    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full capitalize"
      style={{ background: s.bg, color: s.color }}>
      {perfil}
    </span>
  );
}

// ── Modal criar/editar usuário ────────────────────────────────
function UsuarioModal({ usuario, onClose, onSalvo }) {
  const editando = Boolean(usuario?.id);
  const [form, setForm] = useState({
    nome:   usuario?.nome   || '',
    email:  usuario?.email  || '',
    perfil: usuario?.perfil || 'corretor',
    ativo:  usuario?.ativo  ?? true,
    senha:  '',
  });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function salvar(e) {
    e.preventDefault();
    setErro('');
    if (!form.nome.trim() || !form.email.trim()) { setErro('Nome e e-mail são obrigatórios.'); return; }
    if (!editando && !form.senha.trim()) { setErro('Informe uma senha para o novo usuário.'); return; }
    setSalvando(true);
    try {
      const body = { nome: form.nome, email: form.email, perfil: form.perfil, ativo: form.ativo };
      if (form.senha.trim()) body.senha = form.senha;
      if (editando) {
        await api.patch(`/usuarios/${usuario.id}`, body);
      } else {
        await api.post('/usuarios', { ...body, senha: form.senha });
      }
      onSalvo();
    } catch (err) {
      setErro(err.response?.data?.erro || 'Erro ao salvar usuário.');
      setSalvando(false);
    }
  }

  const inputStyle = {
    background: 'rgba(var(--ink-rgb), 0.05)', color: 'var(--text)',
    border: '1px solid rgba(var(--ink-rgb), 0.08)',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.8)' }} onClick={onClose}>
      <form onSubmit={salvar}
        className="w-full max-w-sm rounded-xl p-5 space-y-3 max-h-[90vh] overflow-y-auto"
        style={{ background: 'var(--surface-3)', border: '1px solid rgba(var(--ink-rgb), 0.08)' }}
        onClick={(e) => e.stopPropagation()}>

        <div className="flex items-center justify-between">
          <h2 className="font-bold text-base" style={{ color: 'var(--text)' }}>
            {editando ? 'Editar usuário' : 'Novo usuário'}
          </h2>
          <button type="button" onClick={onClose} style={{ color: 'var(--text-muted)' }}>
            <i className="ti ti-x text-lg" />
          </button>
        </div>

        <div>
          <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Nome *</label>
          <input type="text" value={form.nome} onChange={(e) => set('nome', e.target.value)} required
            className="w-full text-sm px-3 py-2 rounded outline-none" style={inputStyle} />
        </div>

        <div>
          <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>E-mail *</label>
          <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} required
            className="w-full text-sm px-3 py-2 rounded outline-none" style={inputStyle} />
        </div>

        <div>
          <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>
            {editando ? 'Nova senha (deixe em branco para manter)' : 'Senha *'}
          </label>
          <input type="password" value={form.senha} onChange={(e) => set('senha', e.target.value)}
            placeholder={editando ? '••••••••' : ''}
            className="w-full text-sm px-3 py-2 rounded outline-none" style={inputStyle} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Perfil</label>
            <select value={form.perfil} onChange={(e) => set('perfil', e.target.value)}
              className="w-full text-sm px-2 py-2 rounded outline-none capitalize" style={inputStyle}>
              {PERFIS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Status</label>
            <select value={form.ativo ? 'ativo' : 'inativo'} onChange={(e) => set('ativo', e.target.value === 'ativo')}
              className="w-full text-sm px-2 py-2 rounded outline-none" style={inputStyle}>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </select>
          </div>
        </div>

        {erro && (
          <p className="text-xs px-3 py-2 rounded"
            style={{ background: 'rgba(var(--accent-rgb), 0.1)', color: 'var(--accent-hover)', border: '1px solid rgba(var(--accent-rgb), 0.2)' }}>
            {erro}
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose}
            className="flex-1 text-sm py-2 rounded font-medium"
            style={{ background: 'rgba(var(--ink-rgb), 0.06)', color: 'var(--text)' }}>
            Cancelar
          </button>
          <button type="submit" disabled={salvando}
            className="flex-1 text-sm py-2 rounded font-medium"
            style={{ background: 'var(--accent)', color: '#fff', opacity: salvando ? 0.7 : 1 }}>
            {salvando ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Seção gestão de usuários ──────────────────────────────────
function GestaoUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [modal, setModal] = useState(null); // null | { usuario } (usuario=undefined → novo)

  async function carregar() {
    setCarregando(true);
    try {
      const r = await api.get('/usuarios');
      setUsuarios(r.data);
    } catch {}
    setCarregando(false);
  }

  useEffect(() => { carregar(); }, []);

  async function remover(u) {
    if (!window.confirm(`Remover "${u.nome}" (${u.email})? Esta ação não pode ser desfeita.`)) return;
    try {
      await api.delete(`/usuarios/${u.id}`);
      setUsuarios((prev) => prev.filter((x) => x.id !== u.id));
    } catch (err) {
      alert(err.response?.data?.erro || 'Erro ao remover usuário.');
    }
  }

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold" style={{ color: 'var(--text)' }}>Usuários do sistema</h2>
        <button onClick={() => setModal({ usuario: undefined })}
          className="text-xs px-3 py-1.5 rounded font-medium"
          style={{ background: 'var(--accent)', color: '#fff' }}>
          <i className="ti ti-plus mr-1" />Novo
        </button>
      </div>

      {carregando ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : usuarios.length === 0 ? (
        <p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>Nenhum usuário encontrado</p>
      ) : (
        <div className="space-y-2">
          {usuarios.map((u) => (
            <div key={u.id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
              style={{ background: 'rgba(var(--ink-rgb), 0.04)', border: '1px solid rgba(var(--ink-rgb), 0.06)' }}>
              {/* Avatar inicial */}
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(var(--accent-rgb), 0.12)' }}>
                <span className="text-xs font-bold" style={{ color: 'var(--accent-hover)' }}>
                  {u.nome?.charAt(0).toUpperCase()}
                </span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>{u.nome}</p>
                  <PerfilBadge perfil={u.perfil} />
                  {!u.ativo && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                      style={{ background: 'rgba(var(--ink-rgb), 0.4)', color: 'var(--text-tertiary)' }}>
                      inativo
                    </span>
                  )}
                </div>
                <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>{u.email}</p>
              </div>

              {/* Ações */}
              <div className="flex gap-1.5 flex-shrink-0">
                <button onClick={() => setModal({ usuario: u })}
                  className="p-1.5 rounded transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                  title="Editar">
                  <i className="ti ti-pencil text-base" />
                </button>
                <button onClick={() => remover(u)}
                  className="p-1.5 rounded transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                  title="Remover">
                  <i className="ti ti-trash text-base" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal !== null && (
        <UsuarioModal
          usuario={modal.usuario}
          onClose={() => setModal(null)}
          onSalvo={() => { setModal(null); carregar(); }}
        />
      )}
    </div>
  );
}

// ── GodPainel principal ───────────────────────────────────────
export default function GodPainel() {
  const { modoSolo, setModoSolo } = useConfig();
  const [togglingModo, setTogglingModo] = useState(false);

  const [config, setConfig] = useState(null);
  const [salvandoConfig, setSalvandoConfig] = useState(false);
  const [simLoading, setSimLoading] = useState(false);
  const [simMsg, setSimMsg] = useState('');

  useEffect(() => { carregarDados(); }, []);

  async function carregarDados() {
    const configRes = await api.get('/sorteio/config');
    setConfig(configRes.data);
  }

  async function toggleModoSolo(valor) {
    setTogglingModo(true);
    try { await setModoSolo(valor); } finally { setTogglingModo(false); }
  }

  // Distribuição automática: interruptor geral — desativado, nenhum lead
  // novo é atribuído sozinho (todos ficam represados, como se fora da
  // janela de atendimento). Horários de check-in/sorteio deixaram de ser
  // configuráveis aqui (fixos em config/janelaFila.js do backend, um
  // lugar só, sem espalhar pelo código nem expor como ajuste).
  async function toggleDistribuicaoAtiva(valor) {
    setSalvandoConfig(true);
    try {
      const res = await api.put('/sorteio/config', { distribuicaoAtiva: valor });
      setConfig(res.data.config);
    } finally { setSalvandoConfig(false); }
  }

  async function simularLead() {
    setSimLoading(true);
    setSimMsg('');
    try {
      const res = await api.post('/webhook/meta-leads/simular', {});
      setSimMsg(`Lead criado: ${res.data.lead.nome} → ${res.data.lead.corretorNome || 'fila de espera'}`);
    } catch (e) {
      setSimMsg('Erro ao simular lead: ' + (e.response?.data?.erro || e.message));
    } finally { setSimLoading(false); }
  }

  if (!config) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>GOD Painel</h1>
        <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Controle total do sistema NRC</p>
      </div>

      {/* ── Modo Solo ───────────────────────────────────────── */}
      <div className="card">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h2 className="font-bold" style={{ color: 'var(--text)' }}>Modo Solo</h2>
            <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>
              Otimiza o sistema para uso individual: esconde fila de distribuição e check-in de equipe,
              ativa dashboard de carteira pessoal. Desative quando contratar a equipe — nenhum dado é perdido.
            </p>
            <p className="text-xs mt-2 font-medium"
              style={{ color: modoSolo ? 'var(--accent)' : 'var(--text-muted)' }}>
              {modoSolo ? 'MODO SOLO ATIVO' : 'Modo equipe ativo'}
            </p>
          </div>
          <Toggle ativo={modoSolo} onChange={toggleModoSolo} carregando={togglingModo} />
        </div>
      </div>

      {/* ── Automações (Fase 5) ─────────────────────────────── */}
      <AutomacoesPainel />

      {/* ── Gestão de usuários ──────────────────────────────── */}
      <GestaoUsuarios />

      {/* ── Fila do dia ───────────────────────────────────────
          Horários de check-in (09:00-09:59) e sorteio (10:00) deixaram de
          ser configuráveis aqui — fixos em config/janelaFila.js no
          backend, um lugar só. Ordem sorteada, próximo, quem ficou de
          fora e os controles de incluir/mover ficam na tela "Fila". Aqui
          só o interruptor geral. */}
      <div className="card">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h2 className="font-bold" style={{ color: 'var(--text)' }}>Distribuição automática</h2>
            <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>
              Desativada, nenhum lead novo é atribuído sozinho — todos ficam represados, aguardando.
              Check-in (09:00-09:59) e sorteio da fila (10:00) continuam em <a href="/operador" className="underline">Fila</a>.
            </p>
          </div>
          <Toggle ativo={config.distribuicaoAtiva} onChange={toggleDistribuicaoAtiva} carregando={salvandoConfig} />
        </div>
      </div>

      {/* ── Simulador de lead ───────────────────────────────── */}
      <div className="card space-y-3">
        <h2 className="font-bold" style={{ color: 'var(--text)' }}>Simulador de lead Meta</h2>
        <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
          Injeta um lead fake como se viesse do Meta Lead Ads, para testar o fluxo de ponta a ponta.
        </p>
        <button onClick={simularLead} disabled={simLoading} className="btn-secondary">
          {simLoading ? 'Simulando...' : '⚡ Simular lead'}
        </button>
        {simMsg && (
          <p className="text-sm font-medium"
            style={{ color: simMsg.startsWith('Erro') ? 'var(--accent-hover)' : 'var(--success)' }}>
            {simMsg}
          </p>
        )}
      </div>
    </div>
  );
}
