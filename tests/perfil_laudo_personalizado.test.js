const { sanitizarPerfilExtraido, extrairPadraoDeLaudos } = require('../identificador_padrao_laudo');
const { construirMapaPrioridades, ordenarImagensCanonicamente, MAPA_ORDEM_CANONICA } = require('../analisador_ia');
const { salvarPerfilLaudo, obterPerfilLaudo, desativarPerfilLaudo } = require('../gerenciador_perfil_laudo');
const { construirHtmlLaudo } = require('../renderizador_layout_laudo');
const { prisma } = require('../db');

describe('Identificação e Personalização de Padrão de Laudo', () => {
  let usuarioTeste = null;

  beforeAll(async () => {
    // Cria usuário de teste para os testes de integração com banco
    usuarioTeste = await prisma.usuario.create({
      data: {
        email: `vet_teste_${Date.now()}@exemplo.com`,
        nome: 'Dra. Luiza Martins',
        role: 'veterinario',
        crmv: 'CRMV/SP: 45678',
        nomeClinica: 'Clínica Vet Care'
      }
    });
  });

  afterAll(async () => {
    if (usuarioTeste?.id) {
      await prisma.usuario.deleteMany({
        where: { id: usuarioTeste.id }
      });
    }
    await prisma.$disconnect();
  });

  describe('identificador_padrao_laudo.js', () => {
    test('sanitizarPerfilExtraido aplica fallbacks seguros em campos ausentes', () => {
      const resultado = sanitizarPerfilExtraido({});

      expect(resultado).toBeDefined();
      expect(resultado.nomeDetectado).toBe('');
      expect(resultado.crmvDetectado).toBe('');
      expect(resultado.clinicaDetectada).toBe('');
      expect(Array.isArray(resultado.ordemOrgaos)).toBe(true);
      expect(resultado.ordemOrgaos.length).toBeGreaterThan(0);
      expect(resultado.ordemOrgaos).toContain('BEXIGA');
      expect(resultado.ordemOrgaos).toContain('FÍGADO');
      expect(resultado.layoutDetectado.fontFamily).toBe('Calibri, sans-serif');
      expect(resultado.layoutDetectado.corPrimaria).toBe('#1B365D');
    });

    test('sanitizarPerfilExtraido preserva valores válidos detectados', () => {
      const bruto = {
        nomeDetectado: 'Dr. Roberto Santos',
        crmvDetectado: 'CRMV-RJ 12345',
        clinicaDetectada: 'Ultra Imagem Vet',
        layoutDetectado: {
          fontFamily: 'Arial, sans-serif',
          fontSizeBody: '10pt',
          corPrimaria: '#2A4365',
          corSecundaria: '#319795'
        },
        ordemOrgaos: ['fígado', 'vesícula biliar', 'baço', 'bexiga'],
        frasesNormalidade: {
          FÍGADO: 'Parênquima hepático com ecotextura habitual e limites anatômicos preservados.'
        },
        estiloConclusao: 'Conclusão em tópicos numerados.'
      };

      const resultado = sanitizarPerfilExtraido(bruto);

      expect(resultado.nomeDetectado).toBe('Dr. Roberto Santos');
      expect(resultado.crmvDetectado).toBe('CRMV-RJ 12345');
      expect(resultado.clinicaDetectada).toBe('Ultra Imagem Vet');
      expect(resultado.layoutDetectado.fontFamily).toBe('Arial, sans-serif');
      expect(resultado.layoutDetectado.corPrimaria).toBe('#2A4365');
      expect(resultado.ordemOrgaos).toEqual(['FÍGADO', 'VESÍCULA BILIAR', 'BAÇO', 'BEXIGA']);
      expect(resultado.frasesNormalidade.FÍGADO).toContain('Parênquima hepático');
      expect(resultado.estiloConclusao).toBe('Conclusão em tópicos numerados.');
      expect(resultado.templateVisual).toBeDefined();
      expect(resultado.templateVisual.tipoCabecalho).toBe('logo-esquerda-texto-direita');
      expect(resultado.templateVisual.tipoDadosPaciente).toBe('tabela-zebrada');
    });

    test('extrairPadraoDeLaudos rejeita lista vazia de PDFs', async () => {
      await expect(extrairPadraoDeLaudos([], 'fake-key')).rejects.toThrow(
        /Nenhum arquivo PDF fornecido/
      );
    });

    test('extrairPadraoDeLaudos rejeita mais de 10 PDFs', async () => {
      const onzeArquivos = Array(11).fill('teste.pdf');
      await expect(extrairPadraoDeLaudos(onzeArquivos, 'fake-key')).rejects.toThrow(
        /limite máximo é de 10 laudos/
      );
    });
  });

  describe('analisador_ia.js (ordenação canônica adaptativa)', () => {
    test('construirMapaPrioridades reorganiza prioridades conforme ordem customizada', () => {
      // Veterinário prefere laudar FÍGADO primeiro, depois BAÇO, depois BEXIGA
      const ordemCustomizada = ['FÍGADO', 'BAÇO', 'BEXIGA'];
      const mapa = construirMapaPrioridades(ordemCustomizada);

      expect(mapa['FIGADO']).toBe(1);
      expect(mapa['BACO']).toBe(2);
      expect(mapa['BEXIGA']).toBe(3);
    });

    test('ordenarImagensCanonicamente prioriza imagens conforme mapa customizado', () => {
      const arquivos = [
        'caminho/bexiga_01.jpg',
        'caminho/figado_01.jpg',
        'caminho/baco_01.jpg'
      ];
      const classificacao = [
        { indice: 0, nomeArquivo: 'bexiga_01.jpg', orgao: 'BEXIGA' },
        { indice: 1, nomeArquivo: 'figado_01.jpg', orgao: 'FÍGADO' },
        { indice: 2, nomeArquivo: 'baco_01.jpg', orgao: 'BAÇO' }
      ];

      // Padrão default: Bexiga (1), Baço (4), Fígado (6)
      const ordenadoDefault = ordenarImagensCanonicamente(arquivos, classificacao);
      expect(ordenadoDefault[0]).toContain('bexiga_01');

      // Padrão customizado: Fígado (1), Baço (2), Bexiga (3)
      const mapaCustom = construirMapaPrioridades(['FÍGADO', 'BAÇO', 'BEXIGA']);
      const ordenadoCustom = ordenarImagensCanonicamente(arquivos, classificacao, null, mapaCustom);

      expect(ordenadoCustom[0]).toContain('figado_01');
      expect(ordenadoCustom[1]).toContain('baco_01');
      expect(ordenadoCustom[2]).toContain('bexiga_01');
    });
  });

  describe('gerenciador_perfil_laudo.js (integração PostgreSQL multi-tenant)', () => {
    test('salvarPerfilLaudo persiste perfil e sincroniza layout do usuário', async () => {
      const dados = {
        nomeDetectado: 'Dra. Luiza Martins',
        crmvDetectado: 'CRMV/SP: 45678',
        clinicaDetectada: 'Vet Care Center',
        layoutDetectado: {
          fontFamily: 'Roboto, sans-serif',
          fontSizeBody: '10pt',
          fontSizeTitulo: '13pt',
          marginTop: '18mm',
          marginBottom: '18mm',
          marginLeft: '14mm',
          marginRight: '14mm',
          lineHeight: '1.3',
          paragraphSpacing: '6pt',
          corPrimaria: '#0D5C56',
          corSecundaria: '#00D296'
        },
        ordemOrgaos: ['FÍGADO', 'VESÍCULA BILIAR', 'BAÇO', 'RINS', 'BEXIGA'],
        frasesNormalidade: {
          BEXIGA: 'Repleção adequada, paredes normoespessas e regulares, conteúdo anecogênico límpido.'
        },
        estiloConclusao: 'Conclusão descritiva detalhada.',
        observacoesEstilo: 'Tom formal e descritivo minucioso.',
        atualizarUsuarioCrmv: true,
        atualizarUsuarioClinica: true
      };

      const salvo = await salvarPerfilLaudo(usuarioTeste.id, dados);

      expect(salvo).toBeDefined();
      expect(salvo.usuarioId).toBe(usuarioTeste.id);
      expect(salvo.ativo).toBe(true);
      expect(salvo.ordemOrgaos).toEqual(dados.ordemOrgaos);

      // Verifica se obterPerfilLaudo recupera o perfil
      const recuperado = await obterPerfilLaudo(usuarioTeste.id);
      expect(recuperado).toBeDefined();
      expect(recuperado.nomeDetectado).toBe('Dra. Luiza Martins');
      expect(recuperado.crmvDetectado).toBe('CRMV/SP: 45678');

      // Verifica se ConfiguracaoLayout foi sincronizado
      const layoutUsuario = await prisma.configuracaoLayout.findUnique({
        where: { usuarioId: usuarioTeste.id }
      });
      expect(layoutUsuario).toBeDefined();
      expect(layoutUsuario.fontFamily).toBe('Roboto, sans-serif');
      expect(layoutUsuario.corPrimaria).toBe('#0D5C56');
      expect(layoutUsuario.corSecundaria).toBe('#00D296');
    });

    test('desativarPerfilLaudo remove perfil e restaura estado limpo', async () => {
      const resultado = await desativarPerfilLaudo(usuarioTeste.id);
      expect(resultado.sucesso).toBe(true);

      const aposRemover = await obterPerfilLaudo(usuarioTeste.id);
      expect(aposRemover).toBeNull();
    });
  });

  describe('renderizador_layout_laudo.js (Renderizador Polimórfico e Isolamento Visual)', () => {
    test('construirHtmlLaudo renderiza layout customizado sem vazamento de UPA PET', () => {
      const dadosPaciente = {
        nome: 'Thor',
        especie: 'Canina',
        raca: 'Golden Retriever',
        sexo: 'Macho',
        idade: '5 anos',
        solicitante: 'Dr. Roberto Alves'
      };

      const laudoArray = [
        {
          secao: 'FÍGADO',
          texto: 'Dimensões normais, bordas afiladas e ecotextura homogênea.'
        },
        {
          secao: 'BEXIGA',
          texto: 'Adequada repleção urinária, paredes finas e conteúdo anecogênico sem sedimentos.'
        },
        {
          secao: 'CONCLUSÃO',
          texto: 'Exame ultrassonográfico abdominal dentro dos limites da normalidade.'
        }
      ];

      const perfilLaudoCustom = {
        ativo: true,
        clinicaDetectada: 'Centro Veterinário Alpha',
        nomeDetectado: 'Dra. Luiza Martins',
        crmvDetectado: 'CRMV/SP: 45678',
        templateVisual: {
          tipoCabecalho: 'banner-superior',
          tipoDadosPaciente: 'tabela-zebrada',
          tituloDocumento: 'LAUDO DE DIAGNÓSTICO POR IMAGEM ULTRASSONOGRÁFICA',
          subtituloDocumento: 'Varredura ultrassonográfica de alta resolução em tempo real',
          estiloOrgaos: 'tarja-colorida',
          estiloConclusao: 'caixa-destaque',
          tituloConclusao: 'CONCLUSÃO DIAGNÓSTICA',
          posicaoAssinatura: 'centro',
          textoAvisoLegal: 'Exame realizado por Dra. Luiza Martins. Interpretação correlacionada com clínica.',
          corPrimaria: '#2A4365',
          corSecundaria: '#319795'
        }
      };

      const html = construirHtmlLaudo(dadosPaciente, laudoArray, [], {
        usuario: { id: 'user-alpha-99' },
        perfilLaudo: perfilLaudoCustom,
        nomeMedico: perfilLaudoCustom.nomeDetectado,
        crmvMedico: perfilLaudoCustom.crmvDetectado,
        clinicaNome: perfilLaudoCustom.clinicaDetectada
      });

      // 1. Deve conter os títulos e estruturas do template customizado
      expect(html).toContain('LAUDO DE DIAGNÓSTICO POR IMAGEM ULTRASSONOGRÁFICA');
      expect(html).toContain('Varredura ultrassonográfica de alta resolução em tempo real');
      expect(html).toContain('Centro Veterinário Alpha');
      expect(html).toContain('Dra. Luiza Martins');
      expect(html).toContain('CRMV/SP: 45678');
      expect(html).toContain('CONCLUSÃO DIAGNÓSTICA');
      expect(html).toContain('Exame realizado por Dra. Luiza Martins');

      // 2. Deve usar as classes visuais do estilo selecionado
      expect(html).toContain('header-banner');
      expect(html).toContain('paciente-tabela-zebrada');
      expect(html).toContain('orgao-badge'); // Estilo tarja-colorida

      // 3. NUNCA deve vazar textos ou logo padrão da UPA PET
      expect(html).not.toContain('logo_upa_pet_oficial.png');
      expect(html).not.toContain('Dra. Camila Bastos');
      expect(html).not.toContain('CRMV/MG: 22904');
      expect(html).not.toContain('UPA PET');
    });
  });
});
