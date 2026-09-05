import logoNRC from '../assets/logo-nrc.svg';

const ATUALIZADO_EM = '31 de agosto de 2026';

function Secao({ titulo, children }) {
  return (
    <section className="card mb-4">
      <h2
        className="text-xs font-semibold uppercase tracking-widest mb-3"
        style={{ color: 'var(--accent-hover)' }}
      >
        {titulo}
      </h2>
      <div className="space-y-3 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        {children}
      </div>
    </section>
  );
}

export default function Privacidade() {
  return (
    <div
      className="min-h-screen p-4 py-12"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(var(--accent-rgb), 0.06) 0%, var(--bg) 55%)' }}
    >
      <div className="w-full max-w-2xl mx-auto">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img src={logoNRC} alt="NRC" className="h-24" />
        </div>

        <div className="text-center mb-10">
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>
            Política de Privacidade
          </h1>
          <p className="text-xs mt-2 tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
            Última atualização: {ATUALIZADO_EM}
          </p>
        </div>

        <Secao titulo="Quem somos">
          <p>
            O <strong style={{ color: 'var(--text)' }}>NRC</strong> é um sistema de CRM imobiliário,
            operado por <strong style={{ color: 'var(--text)' }}>Narcizo</strong>, usado para
            organizar e atender os contatos de pessoas interessadas em imóveis anunciados pela{' '}
            <strong style={{ color: 'var(--text)' }}>Empyrus Imobiliária</strong>, para quem o NRC
            presta esse serviço.
          </p>
          <p style={{ color: 'var(--text-tertiary)' }}>
            Razão social: Empyrus Serviços Imobiliários LTDA · CNPJ: 57.838.464/0001-99 ·
            Endereço: Avenida Tiradentes, 960 — Andar 9, Sala 02 — Luz — São Paulo/SP — CEP
            01102-000
          </p>
        </Secao>

        <Secao titulo="Quais dados coletamos">
          <p>
            Quando você preenche um formulário de um anúncio de imóvel (por exemplo, nos
            anúncios da Meta/Facebook/Instagram), coletamos os dados que você mesmo informa
            nesse formulário:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Nome</li>
            <li>Telefone</li>
            <li>E-mail</li>
            <li>As respostas que você deu às perguntas do formulário do anúncio</li>
          </ul>
        </Secao>

        <Secao titulo="Para que usamos seus dados">
          <p>
            Usamos seus dados exclusivamente para entrar em contato sobre o imóvel do seu
            interesse — por telefone, WhatsApp e/ou e-mail — e dar andamento ao atendimento
            comercial que você solicitou ao preencher o anúncio.
          </p>
        </Secao>

        <Secao titulo="Com quem compartilhamos">
          <p>Seus dados podem ser compartilhados com:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>O corretor ou corretora da equipe responsável pelo seu atendimento;</li>
            <li>A construtora do empreendimento pelo qual você demonstrou interesse.</li>
          </ul>
          <p>
            Não vendemos nem compartilhamos seus dados com terceiros para fins de publicidade
            ou qualquer finalidade além do atendimento comercial descrito acima.
          </p>
        </Secao>

        <Secao titulo="Base legal e seus direitos (LGPD)">
          <p>
            Tratamos seus dados com base no seu interesse legítimo e no seu consentimento ao
            preencher voluntariamente um formulário solicitando contato sobre um imóvel,
            conforme a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018).
          </p>
          <p>Você tem direito a, a qualquer momento:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Saber quais dados seus temos guardados (acesso);</li>
            <li>Pedir a correção de dados incorretos ou desatualizados;</li>
            <li>Pedir a exclusão total dos seus dados dos nossos sistemas.</li>
          </ul>
        </Secao>

        <Secao titulo="Como pedir a exclusão dos seus dados">
          <p>
            Para acessar, corrigir ou excluir seus dados, entre em contato pelo e-mail:{' '}
            <strong style={{ color: 'var(--text)' }}>empyrus.imoveis@gmail.com</strong>
          </p>
          <p>Respondemos e atendemos o seu pedido o quanto antes.</p>
        </Secao>

        <p className="text-center mt-10 text-[11px] tracking-widest uppercase" style={{ color: 'var(--text-faint)' }}>
          NRC — Empyrus Imobiliária
        </p>
      </div>
    </div>
  );
}
