import { useState, useEffect, useRef } from 'react';
import api from '../services/api';

/**
 * Seletor de empreendimento: busca na lista cadastrada (Fase 1).
 * - value/onChange trabalham com o NOME (string) — mantém compatibilidade com
 *   campos que hoje guardam texto livre (ex.: visita).
 * - podeCriar (Editor/Gerente): permite criar um novo empreendimento na hora.
 *   Sem permissão, um nome novo é aceito como texto livre (retrocompatível).
 */
export default function SeletorEmpreendimento({
  value = '',
  onChange,
  podeCriar = false,
  placeholder = 'Buscar empreendimento...',
  className = 'input',
}) {
  const [lista, setLista] = useState([]);
  const [aberto, setAberto] = useState(false);
  const [criando, setCriando] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    api.get('/empreendimentos', { params: { ativo: 'true' } })
      .then((r) => setLista(r.data))
      .catch(() => {});
  }, []);

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    function onDocClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setAberto(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const termo = (value || '').toLowerCase().trim();
  const filtrados = termo
    ? lista.filter((e) => e.nome.toLowerCase().includes(termo))
    : lista;

  const existeExato = lista.some((e) => e.nome.toLowerCase().trim() === termo);
  const mostrarCriar = podeCriar && termo && !existeExato;

  async function criarNovo() {
    setCriando(true);
    try {
      const r = await api.post('/empreendimentos', { nome: value.trim() });
      setLista((prev) => [...prev, r.data].sort((a, b) => a.nome.localeCompare(b.nome)));
      onChange(r.data.nome);
      setAberto(false);
    } catch {
      // sem permissão ou erro: mantém como texto livre
      setAberto(false);
    } finally {
      setCriando(false);
    }
  }

  return (
    <div ref={wrapRef} className="relative">
      <input
        className={className}
        placeholder={placeholder}
        value={value}
        onChange={(e) => { onChange(e.target.value); setAberto(true); }}
        onFocus={() => setAberto(true)}
        autoComplete="off"
      />

      {aberto && (filtrados.length > 0 || mostrarCriar) && (
        <div
          className="absolute z-30 mt-1 w-full max-h-52 overflow-y-auto rounded shadow-xl"
          style={{ background: '#0D0D0F', border: '1px solid rgba(244,244,248,0.12)' }}
        >
          {filtrados.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => { onChange(e.nome); setAberto(false); }}
              className="w-full text-left px-3 py-2 text-sm transition-colors"
              style={{ color: '#D4D4D8' }}
              onMouseEnter={(ev) => (ev.currentTarget.style.background = 'rgba(192,57,43,0.10)')}
              onMouseLeave={(ev) => (ev.currentTarget.style.background = 'transparent')}
            >
              <span className="font-medium">{e.nome}</span>
              {(e.bairro || e.cidade) && (
                <span className="text-xs ml-2" style={{ color: '#4A4A52' }}>
                  {[e.bairro, e.cidade].filter(Boolean).join(' · ')}
                </span>
              )}
            </button>
          ))}

          {mostrarCriar && (
            <button
              type="button"
              onClick={criarNovo}
              disabled={criando}
              className="w-full text-left px-3 py-2 text-sm border-t transition-colors"
              style={{ color: '#E74C3C', borderColor: 'rgba(244,244,248,0.08)' }}
              onMouseEnter={(ev) => (ev.currentTarget.style.background = 'rgba(192,57,43,0.10)')}
              onMouseLeave={(ev) => (ev.currentTarget.style.background = 'transparent')}
            >
              <i className="ti ti-plus mr-1.5" aria-hidden="true" />
              {criando ? 'Criando...' : `Criar "${value.trim()}"`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
