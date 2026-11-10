const path = require('path');
const fs = require('fs');
const { gerarDocumentosExame } = require('./motor_laudo');
const { ordenarImagensCanonicamente } = require('./analisador_ia');

const pastaDestino = "G:\\Meu Drive\\teste laudo";

const dadosPaciente = {
  nome: "Lua",
  especie: "Canina",
  idade: "Não informada",
  tutor: "Nilda",
  sexo: "Fêmea",
  data: "02/09/2026"
};

const laudoArray = [
  {
    orgao: "BEXIGA",
    texto: "Em topografia habitual, com formato preservado e repleção liquida adequada. Paredes normoespessas, medindo 0,10 cm, com margens internas regulares. Conteúdo anecogênico e homogêneo.",
    diagDif: ""
  },
  {
    orgao: "RIM ESQUERDO",
    texto: "Localizado em topografia habitual, com contornos regulares, superficie lisa e dimensões preservadas, medindo aproximadamente 3,19 cm. Parênquima com ecogenicidade cortical e ecotextura homogênea. Observa-se diferenciação córticomedular. Não há evidências de litiase ou hidronefrose.",
    diagDif: ""
  },
  {
    orgao: "RIM DIREITO",
    texto: "Localizado em topografia habitual, com contornos regulares, superficie lisa e dimensões preservadas, medindo aproximadamente 3,44 cm. Parênquima com ecogenicidade cortical e ecotextura homogênea. Observa-se diferenciação córticomedular. Não há evidências de litiase ou hidronefrose.",
    diagDif: ""
  },
  {
    orgao: "BAÇO",
    texto: "Localizado em topografia habitual, com contornos regulares, bem definidos, com dimensões aumentadas (ultrapassando o polo cranial do rim esquerdo), parênquima com ecogenicidade usual e ecotextura homogênea. Arquitetura vascular preservada.",
    diagDif: "PROCESSO INFLAMATÓRIO / INFECCIOSO / HEMOPARASITOSES."
  },
  {
    orgao: "ESTOMAGO",
    texto: "Localizado em topografia habitual, paredes normoespessas (até 0,50 cm), medindo 0,18 cm, mucosas com pregueamento usual. Apresentando repleção parcial por conteúdo predominantemente hipoecoico com presença de pequenas áreas hiperecogênicas, pouca quantidade de gás em seu lúmen.",
    diagDif: ""
  },
  {
    orgao: "FÍGADO",
    texto: "Localizado em topografia habitual, apresenta-se, na porção visível, com dimensões aparentemente preservadas e contornos regulares. O parênquima hepático demonstra ecogenicidade e ecotextura homogênea. Não foram observadas lesões focais, massas ou dilatação das vias biliares intra-hepáticas.",
    diagDif: ""
  },
  {
    orgao: "VESICULA BILIAR",
    texto: "Paredes normoespessas (até 0,10 cm), medindo 0,06 cm, margem interna regular, repleta por conteúdo anecogênico e homogêneo. Ducto cístico sem evidências de dilatação.",
    diagDif: ""
  },
  {
    orgao: "ALÇAS INTESTINAIS",
    texto: "Segmentos parcialmente visibilizados, paredes normoespessas em duodeno (0,20 cm), jejuno (0,12 cm) e colon descendente (0,11 cm). Preenchidas por conteúdo gasoso/mucoide e conteúdo fecal em colon. Estratificação parietal preservada e peristaltismo evolutivo, sem evidências de processo obstrutivo parcial ou total.",
    diagDif: ""
  },
  {
    orgao: "OVÁRIOS",
    texto: "Em topografia habitual e dimensões preservadas (OE: 1,20 cm x 0,80 cm , OD: 1,18 cm x 0,78 cm) apresenta formato ovalado, contornos regulares e definidos. Não há evidências de formações císticas, massas sólidas ou alterações estruturais.",
    diagDif: ""
  },
  {
    orgao: "ÚTERO",
    texto: "Localizado em topografia habitual. Corpo e cornos uterinos apresentando dilatação (CUE: 2,05 cm; CUD: 1,54 cm), medindo corpo uterino 1,15 cm, com aspecto tubular e paredes irregulares e espessadas. Lúmen preenchido por conteúdo anecogênico, predominantemente homogêneo, contendo discretos pontos hipoecogênicos em suspensão.",
    diagDif: "PIOMETRA, MUCOMETRA."
  },
  {
    orgao: "GLÂNDULA ADRENAL",
    texto: "Apresenta dimensões e formato anatômicos preservados, contornos regulares, parênquima homogêneo e normoecogenico.\nAE: 0,55 cm em polo cranial, 0,60 cm em polo caudal, e 1,84 cm de comprimento.\nAD: 0,45 cm em polo cranial, 0,46 cm em polo caudal, e 1,96 cm de comprimento.",
    diagDif: ""
  },
  {
    orgao: "PANCREAS",
    texto: "Sem alteração em topografia de pâncreas.",
    diagDif: ""
  },
  {
    orgao: "CAVIDADE ABDOMINAL",
    texto: "Ausência de liquido livre, sem alterações evidentes em linfonodos abominais.",
    diagDif: ""
  },
  {
    orgao: "CONSIDERAÇÕES",
    texto: "Sugere-se acompanhamento ultrassonográfico das alterações visibilizadas. Associar a exames complementares.",
    diagDif: ""
  }
];

const imagens = fs.readdirSync(pastaDestino)
  .filter(f => /\.(jpe?g|png)$/i.test(f) && !f.includes('logo_upa_pet'))
  .map(f => path.join(pastaDestino, f));

// Classificação verificada das imagens de Lua (por índice e sigla)
const classificacaoLua = [
  { indice: 0, sigla: "FIG", prioridade: 6 },
  { indice: 1, sigla: "VB", prioridade: 7 },
  { indice: 2, sigla: "FIG", prioridade: 6 },
  { indice: 3, sigla: "B", prioridade: 4 },
  { indice: 4, sigla: "RD", prioridade: 3 },
  { indice: 5, sigla: "CUE", prioridade: 13 },
  { indice: 6, sigla: "CUD", prioridade: 13 },
  { indice: 7, sigla: "BACO", prioridade: 4 },
  { indice: 8, sigla: "EST", prioridade: 5 },
  { indice: 9, sigla: "RE", prioridade: 2 },
  { indice: 10, sigla: "DUO", prioridade: 8 },
  { indice: 11, sigla: "JJ", prioridade: 9 },
  { indice: 12, sigla: "DUO", prioridade: 8 },
  { indice: 13, sigla: "BACO", prioridade: 4 },
  { indice: 14, sigla: "BEX", prioridade: 1 },
  { indice: 15, sigla: "BEX", prioridade: 1 },
  { indice: 16, sigla: "JJ", prioridade: 9 },
  { indice: 17, sigla: "UTERO", prioridade: 13 }
];

const imagensOrdenadas = ordenarImagensCanonicamente(imagens, classificacaoLua);

console.log(`Diagramando ${imagensOrdenadas.length} imagens na ordem canônica:`);
imagensOrdenadas.forEach((img, i) => console.log(`   Posição ${i + 1}: ${path.basename(img)}`));

gerarDocumentosExame(dadosPaciente, laudoArray, imagensOrdenadas, pastaDestino)
  .then(res => {
    console.log("Sucesso! Arquivos atualizados no Google Drive com os novos critérios:");
    console.log(res);

    // Também atualiza em Paciente teste - 2
    const pastaTeste2 = "G:\\Meu Drive\\Exames_Monitorados\\Paciente teste - 2";
    if (fs.existsSync(pastaTeste2)) {
      fs.copyFileSync(res.caminhoDocx, path.join(pastaTeste2, "Laudo_LUA.docx"));
      fs.copyFileSync(res.caminhoPdf, path.join(pastaTeste2, "Laudo_LUA.pdf"));
    }
  })
  .catch(err => console.error("Erro:", err));
