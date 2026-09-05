// Avatar com foto real (base64) ou iniciais, reaproveitado no header e na
// tela de Fila. Sem foto, mantém exatamente o círculo de iniciais de sempre.
export default function Avatar({ nome, fotoBase64, fotoTipo, size = 32, opaco = false }) {
  const iniciais = nome?.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase() || '?';
  const estiloBase = { width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.35)) };

  if (fotoBase64 && fotoTipo) {
    return (
      <img
        src={`data:${fotoTipo};base64,${fotoBase64}`}
        alt={nome || 'Avatar'}
        className="rounded-full object-cover flex-shrink-0"
        style={{ ...estiloBase, opacity: opaco ? 0.5 : 1 }}
      />
    );
  }
  return (
    <div
      className="rounded-full flex items-center justify-center font-bold flex-shrink-0"
      style={{
        ...estiloBase,
        background: opaco ? 'var(--surface-2)' : 'rgba(var(--accent-rgb), 0.12)',
        color: opaco ? 'var(--text-faint)' : 'var(--accent)',
      }}
    >
      {iniciais}
    </div>
  );
}
