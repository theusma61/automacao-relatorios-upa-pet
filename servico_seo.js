/**
 * Serviço de SEO & GEO/AEO — Vetaro (Onda 1)
 *
 * - Detecta crawlers de IA e redes sociais que não executam JavaScript (GPTBot, OAI-SearchBot,
 *   PerplexityBot, ClaudeBot, WhatsApp, LinkedInBot, etc.)
 * - Entrega HTML semântico enxuto em GET / com o MESMO conteúdo da LandingPage.jsx (sem cloaking),
 *   incluindo Open Graph, Twitter Card e JSON-LD (Organization + SoftwareApplication + FAQPage).
 */

const SEO_BASE_URL = 'https://vetaro.com.br';
const SEO_TITLE = 'Vetaro — Sistema de Laudos de Ultrassom e Cirurgia Veterinária com IA';
const SEO_DESCRIPTION =
  'Gere laudos de ultrassom e relatórios cirúrgicos veterinários em segundos com IA no seu padrão visual. Revise no Vetaro Studio (Modo Análise), envie no WhatsApp com resumo ao tutor e controle o financeiro das clínicas parceiras.';

function isCrawlerSemJs(userAgent = '') {
  const ua = String(userAgent || '').trim();
  if (!ua) return false;
  return /(GPTBot|OAI-SearchBot|ChatGPT-User|PerplexityBot|ClaudeBot|anthropic-ai|Bytespider|CCBot|Applebot|WhatsApp|facebookexternalhit|Facebot|LinkedInBot|Twitterbot|Slackbot|TelegramBot|Discordbot)/i.test(ua);
}

function obterJsonLdVetaro() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SEO_BASE_URL}/#organization`,
        name: 'Vetaro',
        url: SEO_BASE_URL,
        logo: `${SEO_BASE_URL}/favicon.png`,
        email: 'contato@vetaro.com.br',
        description:
          'Plataforma brasileira de inteligência artificial para médicos veterinários emitirem laudos de ultrassom e relatórios cirúrgicos com agilidade e controle financeiro volante.'
      },
      {
        '@type': 'SoftwareApplication',
        '@id': `${SEO_BASE_URL}/#software`,
        name: 'Vetaro',
        applicationCategory: 'MedicalApplication',
        operatingSystem: 'Web',
        inLanguage: 'pt-BR',
        url: SEO_BASE_URL,
        image: `${SEO_BASE_URL}/og-image.png`,
        description: SEO_DESCRIPTION,
        publisher: { '@id': `${SEO_BASE_URL}/#organization` },
        featureList: [
          'Geração de laudos de ultrassonografia veterinária com IA multimodal',
          'Vetaro Studio com Modo Análise de Imagens e sincronização automática imagem-órgão',
          'Clonagem automática de padrão visual e textual a partir de 1 a 10 PDFs',
          'Relatórios cirúrgicos veterinários ilimitados a partir de áudio, texto, Word ou Pages',
          'Entrega em 1 clique no WhatsApp com link privado, QR Code opcional e resumo empático ao tutor',
          'Modo Volante com múltiplas clínicas parceiras, logo própria, controle de repasses e Extrato PDF com Pix',
          'Exportação em PDF oficial A4 e Word (.docx) editável'
        ],
        offers: [
          {
            '@type': 'Offer',
            name: 'Degustação Gratuita',
            price: '0.00',
            priceCurrency: 'BRL',
            description: '5 laudos de ultrassom gratuitos + relatórios cirúrgicos ilimitados sem cartão de crédito.'
          },
          {
            '@type': 'Offer',
            name: 'Solo / Volante',
            price: '119.00',
            priceCurrency: 'BRL',
            description: 'Até 40 laudos de ultrassom/mês, Vetaro Studio, Entrega WhatsApp e Modo Volante (até 3 clínicas).'
          },
          {
            '@type': 'Offer',
            name: 'Especialista Pro',
            price: '249.00',
            priceCurrency: 'BRL',
            description: 'Até 150 laudos de ultrassom/mês, clínicas parceiras ilimitadas, Extrato PDF com Pix e cirúrgicos ilimitados.'
          },
          {
            '@type': 'Offer',
            name: 'Clínica & Hospital 24h',
            price: '497.00',
            priceCurrency: 'BRL',
            description: 'Até 350 laudos de ultrassom/mês e até 5 veterinários com CRMV e assinatura individuais.'
          }
        ]
      },
      {
        '@type': 'FAQPage',
        '@id': `${SEO_BASE_URL}/#faq`,
        mainEntity: [
          {
            '@type': 'Question',
            name: 'Preciso cadastrar o cartão de crédito para testar o Vetaro?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Não. Você ganha 5 laudos gratuitos imediatamente após o cadastro, sem precisar informar cartão de crédito ou assumir compromisso financeiro.'
            }
          },
          {
            '@type': 'Question',
            name: 'Como a Vetaro garante que o laudo sai no meu padrão?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'A Vetaro aprende a partir de 1 a 10 PDFs reais seus: extrai ordem dos órgãos, vocabulário, frases de normalidade, conclusões, fontes, cores, cabeçalho e assinatura.'
            }
          },
          {
            '@type': 'Question',
            name: 'Atendo em várias clínicas como volante. Posso usar logos diferentes e controlar quanto cada uma me deve?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Sim. No Modo Volante você cadastra clínicas parceiras com valores padrão, percentual de repasse, WhatsApp da recepção e logo própria opcional no cabeçalho dos laudos, além de gerar Extrato de Cobrança em PDF com chave Pix.'
            }
          },
          {
            '@type': 'Question',
            name: 'O tutor precisa baixar aplicativo ou criar conta para abrir o laudo pelo WhatsApp?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Não. Cada laudo gera um link privado (não indexado em buscadores) que abre direto no celular do tutor ou da clínica solicitante para visualizar e baixar o PDF, com aviso de visualização para o médico.'
            }
          },
          {
            '@type': 'Question',
            name: 'O resumo para o tutor feito por IA dá diagnóstico ou receita?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Não. O resumo parte do laudo já revisado pelo veterinário em linguagem acolhedora e simples, é editável antes do envio e reforça que a conduta pertence ao médico veterinário responsável.'
            }
          }
        ]
      }
    ]
  };
}

function renderizarLandingSemanticaParaCrawler() {
  const jsonLd = JSON.stringify(obterJsonLdVetaro());
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${SEO_TITLE}</title>
  <meta name="description" content="${SEO_DESCRIPTION}" />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="${SEO_BASE_URL}/" />
  <meta property="og:type" content="website" />
  <meta property="og:locale" content="pt_BR" />
  <meta property="og:site_name" content="Vetaro" />
  <meta property="og:url" content="${SEO_BASE_URL}/" />
  <meta property="og:title" content="${SEO_TITLE}" />
  <meta property="og:description" content="${SEO_DESCRIPTION}" />
  <meta property="og:image" content="${SEO_BASE_URL}/og-image.png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${SEO_TITLE}" />
  <meta name="twitter:description" content="${SEO_DESCRIPTION}" />
  <meta name="twitter:image" content="${SEO_BASE_URL}/og-image.png" />
  <script type="application/ld+json">${jsonLd}</script>
</head>
<body>
  <main>
    <header>
      <h1>Vetaro — Mais tempo cuidando. Menos burocracia.</h1>
      <p>Da captura do ultrassom ao WhatsApp do tutor — com o seu padrão visual e o financeiro das clínicas parceiras já organizado. Teste 5 laudos gratuitos sem cartão de crédito.</p>
    </header>

    <section id="recursos">
      <h2>Recursos construídos para a rotina real do médico veterinário</h2>
      <ul>
        <li><strong>Vetaro Studio &amp; Modo Análise de Imagens:</strong> revise cada captura ampliada (zoom até 3x, brilho e contraste) com miniaturas embaixo e caixas de órgãos ao lado — ao avançar para a foto de um órgão, o texto correspondente entra em foco automaticamente.</li>
        <li><strong>Entrega em 1 Clique no WhatsApp + Resumo ao Tutor (IA):</strong> link digital privado sem login, QR Code opcional no rodapé, aviso de visualização e resumo acolhedor em linguagem simples gerado a partir do laudo revisado.</li>
        <li><strong>Modo Volante &amp; Financeiro Integrado:</strong> cadastre clínicas parceiras (até com logo própria no cabeçalho), controle quem deve e repasses, dê baixa em lote e emita Extrato de Cobrança em PDF já com chave Pix.</li>
        <li><strong>Clonagem de Padrão por PDF:</strong> suba de 1 a 10 laudos antigos e a Vetaro aprende automaticamente ordem dos órgãos, vocabulário, fontes, cores, cabeçalho e estilo de conclusão.</li>
        <li><strong>Relatórios Cirúrgicos Ilimitados:</strong> crie relatórios cirúrgicos completos a partir de áudio, texto livre, Word (.docx) ou Pages com modelos institucionais e próprios.</li>
        <li><strong>PDF Oficial + Word Editável (.docx):</strong> saída dupla em PDF A4 pronto para envio e Word editável, com histórico seguro em nuvem.</li>
      </ul>
    </section>

    <section id="planos">
      <h2>Planos e Preços do Vetaro (BRL)</h2>
      <ul>
        <li><strong>Degustação Gratuita:</strong> R$ 0 — 5 laudos de ultrassom grátis sem cartão de crédito.</li>
        <li><strong>Solo / Volante:</strong> R$ 119/mês (ou R$ 99/mês anual) — até 40 laudos/mês, Vetaro Studio, Entrega WhatsApp + Resumo ao Tutor e Modo Volante (até 3 clínicas + CSV).</li>
        <li><strong>Especialista Pro:</strong> R$ 249/mês (ou R$ 209/mês anual) — até 150 laudos/mês, cirúrgicos ilimitados, clínicas parceiras ilimitadas com logo própria, Extrato de Cobrança em PDF com Pix e baixa em lote.</li>
        <li><strong>Clínica &amp; Hospital 24h:</strong> R$ 497/mês (ou R$ 419/mês anual) — até 350 laudos/mês e até 5 veterinários com CRMV e assinatura individuais.</li>
      </ul>
    </section>

    <section id="duvidas">
      <h2>Dúvidas Frequentes</h2>
      <p><strong>Preciso cadastrar cartão de crédito para testar?</strong> Não, você ganha 5 laudos gratuitos imediatamente após o cadastro.</p>
      <p><strong>Atendo em várias clínicas como volante. Posso usar logos diferentes e controlar quanto cada uma me deve?</strong> Sim, no Modo Volante você configura valores, repasses, WhatsApp e logo própria por clínica parceira.</p>
      <p><strong>O tutor precisa baixar aplicativo para abrir o laudo?</strong> Não, o link privado abre direto no celular com visualização e download do PDF.</p>
      <p><strong>Documentação estruturada para IAs:</strong> <a href="${SEO_BASE_URL}/llms.txt">${SEO_BASE_URL}/llms.txt</a></p>
    </section>
  </main>
</body>
</html>`;
}

module.exports = {
  SEO_BASE_URL,
  SEO_TITLE,
  SEO_DESCRIPTION,
  isCrawlerSemJs,
  obterJsonLdVetaro,
  renderizarLandingSemanticaParaCrawler
};
