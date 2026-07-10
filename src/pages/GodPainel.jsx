import { useState, useEffect } from 'react';
import api from '../services/api';
import { useConfig } from '../contexts/ConfigContext';

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
        background: ativo ? '#C0392B' : '#1E1E24',
        transition: 'background 0.2s',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          display: 'block', width: '20px', height: '20px', borderRadius: '50%',
          background: '#F4F4F8',
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
  corretor:  { bg: 'rgba(58,90,200,0.15)',  color: '#6C8EF0' },
  operador:  { bg: 'rgba(230,126,34,0.15)', color: '#E67E22' },
  gerente:   { bg: 'rgba(192,57,43,0.15)',  color: '#E74C3C' },
  diretor:   { bg: 'rgba(155,89,182,0.15)', color: '#9B59B6' },
  editor:    { bg: 'rgba(39,174,96,0.15)',  color: '#27AE60' },
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
    background: 'rgba(244,244,248,0.05)', color: '#F4F4F8',
    border: '1px solid rgba(244,244,248,0.08)',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.8)' }} onClick={onClose}>
      <form onSubmit={salvar}
        className="w-full max-w-sm rounded-xl p-5 space-y-3 max-h-[90vh] overflow-y-auto"
        style={{ background: '#13131A', border: '1px solid rgba(244,244,248,0.08)' }}
        onClick={(e) => e.stopPropagation()}>

        <div className="flex items-center justify-between">
          <h2 className="font-bold text-base" style={{ color: '#F4F4F8' }}>
            {editando ? 'Editar usuário' : 'Novo usuário'}
          </h2>
          <button type="button" onClick={onClose} style={{ color: '#3A3A42' }}>
            <i className="ti ti-x text-lg" />
          </button>
        </div>

        <div>
          <label className="text-xs block mb-1" style={{ color: '#3A3A42' }}>Nome *</label>
          <input type="text" value={form.nome} onChange={(e) => set('nome', e.target.value)} required
            className="w-full text-sm px-3 py-2 rounded outline-none" style={inputStyle} />
        </div>

        <div>
          <label className="text-xs block mb-1" style={{ color: '#3A3A42' }}>E-mail *</label>
          <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} required
            className="w-full text-sm px-3 py-2 rounded outline-none" style={inputStyle} />
        </div>

        <div>
          <label className="text-xs block mb-1" style={{ color: '#3A3A42' }}>
            {editando ? 'Nova senha (deixe em branco para manter)' : 'Senha *'}
          </label>
          <input type="password" value={form.senha} onChange={(e) => set('senha', e.target.value)}
            placeholder={editando ? '••••••••' : ''}
            className="w-full text-sm px-3 py-2 rounded outline-none" style={inputStyle} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs block mb-1" style={{ color: '#3A3A42' }}>Perfil</label>
            <select value={form.perfil} onChange={(e) => set('perfil', e.target.value)}
              className="w-full text-sm px-2 py-2 rounded outline-none capitalize" style={inputStyle}>
              {PERFIS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: '#3A3A42' }}>Status</label>
            <select value={form.ativo ? 'ativo' : 'inativo'} onChange={(e) => set('ativo', e.target.value === 'ativo')}
              className="w-full text-sm px-2 py-2 rounded outline-none" style={inputStyle}>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </select>
          </div>
        </div>

        {erro && (
          <p className="text-xs px-3 py-2 rounded"
            style={{ background: 'rgba(192,57,43,0.1)', color: '#E74C3C', border: '1px solid rgba(192,57,43,0.2)' }}>
            {erro}
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose}
            className="flex-1 text-sm py-2 rounded font-medium"
            style={{ background: 'rgba(244,244,248,0.06)', color: '#F4F4F8' }}>
            Cancelar
          </button>
          <button type="submit" disabled={salvando}
            className="flex-1 text-sm py-2 rounded font-medium"
            style={{ background: '#C0392B', color: '#fff', opacity: salvando ? 0.7 : 1 }}>
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
        <h2 className="font-bold" style={{ color: '#F4F4F8' }}>Usuários do sistema</h2>
        <button onClick={() => setModal({ usuario: undefined })}
          className="text-xs px-3 py-1.5 rounded font-medium"
          style={{ background: '#C0392B', color: '#fff' }}>
          <i className="ti ti-plus mr-1" />Novo
        </button>
      </div>

      {carregando ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-[#C0392B] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : usuarios.length === 0 ? (
        <p className="text-sm text-center py-6" style={{ color: '#3A3A42' }}>Nenhum usuário encontrado</p>
      ) : (
        <div className="space-y-2">
          {usuarios.map((u) => (
            <div key={u.id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
              style={{ background: 'rgba(244,244,248,0.04)', border: '1px solid rgba(244,244,248,0.06)' }}>
              {/* Avatar inicial */}
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(192,57,43,0.12)' }}>
                <span className="text-xs font-bold" style={{ color: '#E74C3C' }}>
                  {u.nome?.charAt(0).toUpperCase()}
                </span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-sm font-semibold truncate" style={{ color: '#F4F4F8' }}>{u.nome}</p>
                  <PerfilBadge perfil={u.perfil} />
                  {!u.ativo && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                      style={{ background: 'rgba(58,58,66,0.4)', color: '#6B6B78' }}>
                      inativo
                    </span>
                  )}
                </div>
                <p className="text-xs truncate mt-0.5" style={{ color: '#3A3A42' }}>{u.email}</p>
              </div>

              {/* Ações */}
              <div className="flex gap-1.5 flex-shrink-0">
                <button onClick={() => setModal({ usuario: u })}
                  className="p-1.5 rounded transition-colors"
                  style={{ color: '#3A3A42' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#F4F4F8')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#3A3A42')}
                  title="Editar">
                  <i className="ti ti-pencil text-base" />
                </button>
                <button onClick={() => remover(u)}
                  className="p-1.5 rounded transition-colors"
                  style={{ color: '#3A3A42' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#E74C3C')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#3A3A42')}
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
  const [fila, setFila] = useState(null);
  const [simLoading, setSimLoading] = useState(false);
  const [simMsg, setSimMsg] = useState('');
  const [sorteioLoading, setSorteioLoading] = useState(false);
  const [periodo, setPeriodo] = useState('manual');

  useEffect(() => { carregarDados(); }, []);

  async function carregarDados() {
    const [configRes, filaRes] = await Promise.all([
      api.get('/sorteio/config'),
      api.get('/sorteio/fila').catch(() => ({ data: null })),
    ]);
    setConfig(configRes.data);
    setFila(filaRes.data);
  }

  async function toggleModoSolo(valor) {
    setTogglingModo(true);
    try { await setModoSolo(valor); } finally { setTogglingModo(false); }
  }

  async function salvarConfig() {
    await api.put('/sorteio/config', config);
    alert('Configuração salva e agendador atualizado!');
  }

  async function dispararSorteio() {
    setSorteioLoading(true);
    try {
      const res = await api.post('/sorteio/disparar', { periodo });
      setFila(res.data);
      alert(`Sorteio "${periodo}" realizado com sucesso!`);
    } catch (e) {
      alert(e.response?.data?.erro || 'Erro ao disparar sorteio.');
    } finally { setSorteioLoading(false); }
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

  function atualizarHorario(idx, campo, valor) {
    const novos = [...config.horarios];
    novos[idx] = { ...novos[idx], [campo]: valor };
    setConfig({ ...config, horarios: novos });
  }

  function adicionarHorario() {
    setConfig({ ...config, horarios: [...config.horarios, { label: 'novo', hora: '10:00' }] });
  }

  function removerHorario(idx) {
    setConfig({ ...config, horarios: config.horarios.filter((_, i) => i !== idx) });
  }

  if (!config) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-4 border-[#C0392B] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#F4F4F8' }}>GOD Painel</h1>
        <p className="text-sm" style={{ color: '#6A6A70' }}>Controle total do sistema NRC</p>
      </div>

      {/* ── Modo Solo ───────────────────────────────────────── */}
      <div className="card">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h2 className="font-bold" style={{ color: '#F4F4F8' }}>Modo Solo</h2>
            <p className="text-sm mt-1" style={{ color: '#6A6A70' }}>
              Otimiza o sistema para uso individual: esconde fila de distribuição e check-in de equipe,
              ativa dashboard de carteira pessoal. Desative quando contratar a equipe — nenhum dado é perdido.
            </p>
            <p className="text-xs mt-2 font-medium"
              style={{ color: modoSolo ? '#C0392B' : '#3A3A42' }}>
              {modoSolo ? 'MODO SOLO ATIVO' : 'Modo equipe ativo'}
            </p>
          </div>
          <Toggle ativo={modoSolo} onChange={toggleModoSolo} carregando={togglingModo} />
        </div>
      </div>

      {/* ── Gestão de usuários ──────────────────────────────── */}
      <GestaoUsuarios />

      {/* ── Configuração de sorteios ─────────────────────────── */}
      <div className="card space-y-4">
        <h2 className="font-bold" style={{ color: '#F4F4F8' }}>Horários dos sorteios</h2>
        {config.horarios.map((h, i) => (
          <div key={i} className="flex items-center gap-3 flex-wrap">
            <input className="input w-32" placeholder="Label (ex: manha)"
              value={h.label} onChange={(e) => atualizarHorario(i, 'label', e.target.value)} />
            <input type="time" className="input w-32"
              value={h.hora} onChange={(e) => atualizarHorario(i, 'hora', e.target.value)} />
            <button onClick={() => removerHorario(i)}
              className="text-sm font-medium" style={{ color: '#E74C3C' }}>
              Remover
            </button>
          </div>
        ))}
        <button onClick={adicionarHorario} className="btn-secondary text-sm">+ Horário</button>

        <label className="flex items-center gap-2 text-sm" style={{ color: '#A0A0A8' }}>
          <input type="checkbox" checked={config.distribuicaoAtiva}
            onChange={(e) => setConfig({ ...config, distribuicaoAtiva: e.target.checked })}
            className="rounded accent-[#C0392B]" />
          Distribuição automática ativa
        </label>

        <div className="flex items-center gap-2">
          <label className="text-sm" style={{ color: '#A0A0A8' }}>Tolerância (min):</label>
          <input type="number" className="input w-24" value={config.toleranciaMinutos}
            onChange={(e) => setConfig({ ...config, toleranciaMinutos: parseInt(e.target.value) })}
            min={0} />
        </div>

        <button onClick={salvarConfig} className="btn-primary">Salvar configuração</button>
      </div>

      {/* ── Sorteio manual ──────────────────────────────────── */}
      <div className="card space-y-3">
        <h2 className="font-bold" style={{ color: '#F4F4F8' }}>Disparar sorteio manualmente</h2>
        <div className="flex items-center gap-3 flex-wrap">
          <input className="input w-40" placeholder="Período (ex: manha)"
            value={periodo} onChange={(e) => setPeriodo(e.target.value)} />
          <button onClick={dispararSorteio} disabled={sorteioLoading} className="btn-primary">
            {sorteioLoading ? 'Sorteando...' : 'Disparar sorteio'}
          </button>
        </div>

        {fila && fila.ordem && (
          <div>
            <p className="text-sm mb-2" style={{ color: '#6A6A70' }}>Fila atual — {fila.periodo}:</p>
            <div className="flex flex-wrap gap-2">
              {(() => {
                const pos = fila.posicaoAtual % fila.ordem.length;
                return [...fila.ordem.slice(pos), ...fila.ordem.slice(0, pos)].map((c, i) => (
                  <div key={c.corretorId} className="px-3 py-1 rounded-full text-xs font-medium"
                    style={i === 0
                      ? { background: '#C0392B', color: '#fff' }
                      : { background: '#141418', color: '#6A6A70' }}>
                    #{i + 1} {c.corretorNome}
                  </div>
                ));
              })()}
            </div>
          </div>
        )}
      </div>

      {/* ── Simulador de lead ───────────────────────────────── */}
      <div className="card space-y-3">
        <h2 className="font-bold" style={{ color: '#F4F4F8' }}>Simulador de lead Meta</h2>
        <p className="text-sm" style={{ color: '#6A6A70' }}>
          Injeta um lead fake como se viesse do Meta Lead Ads, para testar o fluxo de ponta a ponta.
        </p>
        <button onClick={simularLead} disabled={simLoading} className="btn-secondary">
          {simLoading ? 'Simulando...' : '⚡ Simular lead'}
        </button>
        {simMsg && (
          <p className="text-sm font-medium"
            style={{ color: simMsg.startsWith('Erro') ? '#E74C3C' : '#2ECC71' }}>
            {simMsg}
          </p>
        )}
      </div>
    </div>
  );
}
