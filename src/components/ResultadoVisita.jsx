import { useState } from 'react';
import api from '../services/api';

// Botões "Visita realizada" e "Visita não realizada" (ou a marca, se já foi marcada). O backend decide o estágio do lead:
// muda para Visita Realizada / Não Realizada, sem voltar um lead que já está mais adiante.
export default function ResultadoVisita({ visita, podeMarcar, onMarcado }) {
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  if (visita.resultado) {
    const ok = visita.resultado === 'realizada';
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
        style={{ background: `rgba(var(--${ok ? 'success' : 'slate'}-rgb), 0.12)`, color: ok ? 'var(--success)' : 'var(--slate)' }}>
        <i className={`ti ti-${ok ? 'circle-check' : 'circle-x'} text-[12px]`} aria-hidden="true" />
        {ok ? 'Visita realizada' : 'Visita não realizada'}
      </span>
    );
  }
  if (!podeMarcar) return null;

  async function marcar(ev, resultado) {
    ev.preventDefault(); ev.stopPropagation(); // dentro de um link (Agenda): não navega
    const texto = resultado === 'realizada' ? 'Marcar esta visita como REALIZADA?' : 'Marcar esta visita como NÃO REALIZADA? Será criada a tarefa "Remarcar visita".';
    if (!window.confirm(texto)) return;
    setEnviando(true); setErro('');
    try {
      const r = await api.post(`/visitas/${visita.id}/resultado`, { resultado });
      onMarcado?.(r.data);
    } catch (e) {
      setErro(e.response?.data?.erro || 'Não foi possível marcar a visita.');
    } finally { setEnviando(false); }
  }

  const estilo = (cor) => ({ background: `rgba(var(--${cor}-rgb), 0.10)`, color: `var(--${cor})`, border: `1px solid rgba(var(--${cor}-rgb), 0.3)` });
  return (
    <div className="flex flex-wrap items-center gap-1.5 mt-2" onClick={(ev) => { ev.preventDefault(); ev.stopPropagation(); }}>
      <button type="button" disabled={enviando} onClick={(ev) => marcar(ev, 'realizada')} className="text-[11px] font-semibold px-2 py-1 rounded" style={estilo('success')}>
        Visita realizada
      </button>
      <button type="button" disabled={enviando} onClick={(ev) => marcar(ev, 'nao_realizada')} className="text-[11px] font-semibold px-2 py-1 rounded" style={estilo('slate')}>
        Visita não realizada
      </button>
      {erro && <span className="text-[11px]" style={{ color: 'var(--accent-hover)' }}>{erro}</span>}
    </div>
  );
}

// Quem pode marcar: corretor dono do lead (o backend confere), gerente e editor. Diretor só visualiza.
export function podeMarcarVisita(usuario, corretorDoLeadId) {
  if (['gerente', 'editor'].includes(usuario?.perfil)) return true;
  return usuario?.perfil === 'corretor' && Boolean(corretorDoLeadId) && corretorDoLeadId === usuario.id;
}
