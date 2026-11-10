const path = require('path');
const { gerarDocxLaudo } = require('./gerar_docx');

const dadosPaciente = {
  nome: "Lua",
  especie: "Canina",
  idade: "Não informada",
  tutor: "Nilda",
  sexo: "Fêmea",
  data: "02/09/2026"
};

const laudoEstruturado = [
  {
    orgao: "BEXIGA",
    texto: "Localizada em topografia habitual, com formato preservado e repleção liquida adequada. Paredes normoespessas, medindo 0,10 cm, com margens internas regulares. Conteúdo anecogênico e homogêneo."
  },
  {
    orgao: "RINS",
    texto: "Localizados em topografia habitual, com contornos regulares, superfície lisa e dimensões preservadas (RE: 3,19 cm; RD: 3,44 cm). Parênquima com ecogenicidade cortical e ecotextura homogênea. Observa-se diferenciação córtico-medular. Não há evidências de litíase ou hidronefrose."
  },
  {
    orgao: "BAÇO",
    texto: "Localizado em topografia habitual, com contornos regulares e bem definidos, com dimensões aumentadas, estendendo-se caudalmete e ultrapassando o polo cranial do rim esquerdo, parênquima com ecogenicidade usual e ecotextura homogênea.",
    diagDif: "PROCESSO INFLAMATÓRIO / INFECCIOSO / HEMOPARASITOSES."
  },
  {
    orgao: "ESTOMAGO",
    texto: "Localizado em topografia habitual, paredes normoespessas, medindo 0,18 cm, mucosas com pregueamento usual. Apresentando repleção parcial por conteúdo predominantemente hipoecoico com presença de pequenas áreas hiperecogênicas, pouca quantidade de gás em seu lúmen."
  },
  {
    orgao: "FÍGADO",
    texto: "Localizado em topografia habitual, apresenta-se, na porção visível, com dimensões aparentemente preservadas e contornos regulares. O parênquima hepático demonstra ecogenicidade e ecotextura homogênea. Não foram observadas lesões focais, massas ou dilatação das vias biliares intra-hepáticas."
  },
  {
    orgao: "VESICULA BILIAR",
    texto: "Paredes normoespessas, medindo 0,06 cm, margem interna regular, repleta por conteúdo anecogênico e homogêneo. Ducto cístico sem evidências de dilatação."
  },
  {
    orgao: "ALÇAS INTESTINAIS",
    texto: "Segmentos parcialmente visibilizados, paredes normoespessas em duodeno (0,20 cm) e jejuno (0,12 cm). Preenchidas por conteúdo gasoso/mucoide e conteúdo fecal em colon. Estratificação parietal preservada e peristaltismo evolutivo, sem evidências de processo obstrutivo parcial ou total."
  },
  {
    orgao: "GLANDULA ADRENAL",
    texto: "Não visualizadas."
  },
  {
    orgao: "ÚTERO",
    texto: "Localizado em topografia habitual. Corpo e cornos uterinos apresentando dilatação (CUE: 2,05 cm; CUD: 1,54 cm), corpo medindo 1,15 cm, com aspecto tubular e paredes irregulares e espessadas. Lúmen preenchido por conteúdo anecogênico, predominantemente homogêneo, contendo discretos pontos hipoecogênicos em suspensão.",
    diagDif: "PIOMETRA, MUCOMETRA."
  },
  {
    orgao: "PANCREAS",
    texto: "Sem alteração em topografia de pâncreas."
  },
  {
    orgao: "CAVIDADE ABDOMINAL",
    texto: "Ausência de liquido livre, sem alterações evidentes em linfonodos abominais."
  },
  {
    orgao: "CONSIDERAÇÕES",
    texto: "Sugere-se acompanhamento ultrassonográfico das alterações visibilizadas. Associar a exames complementares."
  }
];

const caminhoDestino = "C:\\Users\\matheus.augusto\\OneDrive - Administrativo - Ânima Educação\\Documentos\\Teste laudo\\Laudo_Lua_Nilda.docx";
const logoPath = "C:\\Users\\matheus.augusto\\OneDrive - Administrativo - Ânima Educação\\Documentos\\Teste laudo\\logo_upa_pet.jpg";

gerarDocxLaudo(dadosPaciente, laudoEstruturado, caminhoDestino, logoPath)
  .then(() => console.log("Finalizado com sucesso!"))
  .catch(err => console.error(err));
