import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import api from '../services/api';

const CAMPOS = [
  { key: 'nome',                  label: 'Nome *' },
  { key: 'telefone',              label: 'Telefone *' },
  { key: 'email',                 label: 'E-mail' },
  { key: 'empreendimentoInteresse', label: 'Empreendimento' },
  { key: 'origemContato',         label: 'Origem do contato' },
  { key: 'nomeIndicador',         label: 'Indicado por' },
  { key: 'notas',                 label: 'Notas' },
];

export default function ImportarClientesModal({ onClose, onImportado }) {
  const inputRef = useRef();
  const [etapa, setEtapa] = useState('upload'); // upload | mapear | confirmar | resultado
  const [linhas, setLinhas] = useState([]);      // raw rows from sheet
  const [colunas, setColunas] = useState([]);    // column headers
  const [mapeamento, setMapeamento] = useState({});
  const [preview, setPreview] = useState([]);
  const [resultado, setResultado] = useState(null);
  const [importando, setImportando] = useState(false);

  function handleArquivo(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const wb = XLSX.read(ev.target.result, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
      if (rows.length < 2) return;
      const headers = rows[0].map(String);
      setColunas(headers);
      setLinhas(rows.slice(1).filter((r) => r.some((c) => c !== '')));

      // Auto-mapping by keyword
      const auto = {};
      CAMPOS.forEach(({ key }) => {
        const idx = headers.findIndex((h) => {
          const l = h.toLowerCase();
          if (key === 'nome') return l.includes('nome');
          if (key === 'telefone') return l.includes('tel') || l.includes('fone') || l.includes('celular') || l.includes('whatsapp');
          if (key === 'email') return l.includes('email') || l.includes('e-mail');
          if (key === 'empreendimentoInteresse') return l.includes('empreend') || l.includes('interesse') || l.includes('produto');
          if (key === 'origemContato') return l.includes('origem');
          if (key === 'nomeIndicador') return l.includes('indica') || l.includes('indicador');
          if (key === 'notas') return l.includes('nota') || l.includes('observa') || l.includes('obs');
          return false;
        });
        if (idx >= 0) auto[key] = String(idx);
      });
      setMapeamento(auto);
      setEtapa('mapear');
    };
    reader.readAsArrayBuffer(file);
  }

  function construirPreview() {
    const contatos = linhas.slice(0, 5).map((row) => {
      const c = {};
      CAMPOS.forEach(({ key }) => {
        const idx = mapeamento[key];
        if (idx !== undefined && idx !== '') c[key] = String(row[Number(idx)] || '');
      });
      return c;
    });
    setPreview(contatos);
    setEtapa('confirmar');
  }

  async function importar() {
    setImportando(true);
    const contatos = linhas.map((row) => {
      const c = {};
      CAMPOS.forEach(({ key }) => {
        const idx = mapeamento[key];
        if (idx !== undefined && idx !== '') c[key] = String(row[Number(idx)] || '');
      });
      return c;
    });
    try {
      const r = await api.post('/clientes/importar', { contatos });
      setResultado(r.data);
      setEtapa('resultado');
    } catch { setImportando(false); }
  }

  const cardStyle = {
    background: '#13131A',
    border: '1px solid rgba(244,244,248,0.08)',
  };
  const inputStyle = {
    background: 'rgba(244,244,248,0.05)', color: '#F4F4F8',
    border: '1px solid rgba(244,244,248,0.08)',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.8)' }} onClick={onClose}>
      <div className="w-full max-w-sm rounded-xl p-5 space-y-4 max-h-[90vh] overflow-y-auto"
        style={cardStyle} onClick={(e) => e.stopPropagation()}>

        <div className="flex items-center justify-between">
          <h2 className="font-bold text-base" style={{ color: '#F4F4F8' }}>Importar clientes</h2>
          <button onClick={onClose} style={{ color: '#3A3A42' }}>
            <i className="ti ti-x text-lg" />
          </button>
        </div>

        {/* ETAPA: upload */}
        {etapa === 'upload' && (
          <div className="space-y-4">
            <p className="text-sm" style={{ color: '#6B6B78' }}>
              Selecione um arquivo Excel (.xlsx) ou CSV com os seus contatos.
            </p>
            <button
              onClick={() => inputRef.current?.click()}
              className="w-full flex flex-col items-center gap-2 py-8 rounded-lg border-2 border-dashed transition-colors"
              style={{ borderColor: 'rgba(244,244,248,0.1)', color: '#3A3A42' }}
            >
              <i className="ti ti-upload text-2xl" />
              <span className="text-sm">Clique para selecionar arquivo</span>
            </button>
            <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleArquivo} />
          </div>
        )}

        {/* ETAPA: mapear */}
        {etapa === 'mapear' && (
          <div className="space-y-3">
            <p className="text-xs" style={{ color: '#6B6B78' }}>
              {linhas.length} linhas detectadas. Mapeie as colunas do arquivo:
            </p>
            {CAMPOS.map(({ key, label }) => (
              <div key={key}>
                <label className="text-xs block mb-1" style={{ color: '#3A3A42' }}>{label}</label>
                <select
                  value={mapeamento[key] ?? ''}
                  onChange={(e) => setMapeamento((m) => ({ ...m, [key]: e.target.value }))}
                  className="w-full text-sm px-2 py-2 rounded outline-none"
                  style={inputStyle}
                >
                  <option value="">— não importar —</option>
                  {colunas.map((col, i) => (
                    <option key={i} value={String(i)}>{col || `Coluna ${i + 1}`}</option>
                  ))}
                </select>
              </div>
            ))}
            <div className="flex gap-2 pt-2">
              <button onClick={() => setEtapa('upload')}
                className="flex-1 text-sm py-2 rounded font-medium"
                style={{ background: 'rgba(244,244,248,0.06)', color: '#F4F4F8' }}>
                Voltar
              </button>
              <button
                onClick={construirPreview}
                disabled={!mapeamento.nome && !mapeamento.telefone}
                className="flex-1 text-sm py-2 rounded font-medium"
                style={{ background: '#C0392B', color: '#fff' }}>
                Pré-visualizar
              </button>
            </div>
          </div>
        )}

        {/* ETAPA: confirmar */}
        {etapa === 'confirmar' && (
          <div className="space-y-3">
            <p className="text-xs" style={{ color: '#6B6B78' }}>
              Primeiros {preview.length} registros (de {linhas.length} total):
            </p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {preview.map((c, i) => (
                <div key={i} className="px-3 py-2 rounded text-xs"
                  style={{ background: 'rgba(244,244,248,0.04)', border: '1px solid rgba(244,244,248,0.05)' }}>
                  <p style={{ color: '#F4F4F8' }}>{c.nome || '(sem nome)'}</p>
                  <p style={{ color: '#3A3A42' }}>{c.telefone} {c.email && `· ${c.email}`}</p>
                </div>
              ))}
            </div>
            <p className="text-xs" style={{ color: '#6B6B78' }}>
              Contatos com mesmo telefone ou e-mail já existentes serão ignorados automaticamente.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setEtapa('mapear')}
                className="flex-1 text-sm py-2 rounded font-medium"
                style={{ background: 'rgba(244,244,248,0.06)', color: '#F4F4F8' }}>
                Voltar
              </button>
              <button onClick={importar} disabled={importando}
                className="flex-1 text-sm py-2 rounded font-medium"
                style={{ background: '#C0392B', color: '#fff', opacity: importando ? 0.7 : 1 }}>
                {importando ? 'Importando…' : `Importar ${linhas.length}`}
              </button>
            </div>
          </div>
        )}

        {/* ETAPA: resultado */}
        {etapa === 'resultado' && resultado && (
          <div className="space-y-4 text-center">
            <i className="ti ti-check text-4xl block" style={{ color: '#27AE60' }} />
            <div className="space-y-1 text-sm">
              <p style={{ color: '#F4F4F8' }}>
                <span className="font-bold" style={{ color: '#27AE60' }}>{resultado.importados}</span> importados com sucesso
              </p>
              {resultado.duplicatas > 0 && (
                <p style={{ color: '#3A3A42' }}>{resultado.duplicatas} duplicata{resultado.duplicatas !== 1 ? 's' : ''} ignorada{resultado.duplicatas !== 1 ? 's' : ''}</p>
              )}
              {resultado.invalidos > 0 && (
                <p style={{ color: '#3A3A42' }}>{resultado.invalidos} inválido{resultado.invalidos !== 1 ? 's' : ''} (sem nome/telefone)</p>
              )}
            </div>
            <button onClick={onImportado}
              className="w-full text-sm py-2 rounded font-medium"
              style={{ background: '#C0392B', color: '#fff' }}>
              Concluir
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
