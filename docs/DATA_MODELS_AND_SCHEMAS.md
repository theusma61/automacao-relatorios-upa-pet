# 📊 Modelos de Dados e Esquemas JSON

Este documento define os contratos de dados, esquemas JSON e estruturas de objetos trocados entre o frontend, os analisadores de inteligência artificial e os compiladores de documentos.

---

## 1. Dados do Paciente (`dadosPaciente` / `paciente`)

Objeto unificado que representa o animal e o tutor. Utilizado tanto no módulo de ultrassonografia quanto no módulo cirúrgico.

### Esquema JSON:
```json
{
  "nome": "Thor",
  "especie": "Canina",
  "idade": "4 anos",
  "tutor": "Ana Silva",
  "sexo": "Macho",
  "data": "10/11/2026",
  "peso": "14.5 kg"
}
```

### Definição dos Campos:
| Campo | Tipo | Obrigatório | Descrição |
| :--- | :---: | :---: | :--- |
| `nome` | `string` | Sim | Nome de identificação do animal. Se não identificado: `"Não identificado"`. |
| `especie` | `string` | Sim | `"Canina"`, `"Felina"` ou similar. |
| `idade` | `string` | Não | Idade declarada (ex: `"5 anos"`, `"8 meses"` ou `"Não informada"`). |
| `tutor` | `string` | Não | Nome do responsável ou tutor. |
| `sexo` | `string` | Sim | `"Macho"` ou `"Fêmea"`. |
| `data` | `string` | Sim | Data do procedimento no formato `DD/MM/AAAA`. |
| `peso` | `string` | Não | Peso do animal (ex: `"12 kg"`). Utilizado principalmente em cirurgias. |

---

## 2. Laudo Estruturado de Ultrassom (`laudoArray` / `laudo`)

Array de objetos representando cada órgão examinado, emitido pelo `analisador_ia.js` e consumido por `motor_laudo.js` e `gerar_docx.js`.

### Exemplo de Estrutura:
```json
[
  {
    "orgao": "BEXIGA",
    "texto": "Localizada em topografia habitual, com formato preservado e repleção líquida adequada. Paredes normoespessas, medindo 0,10 cm, com margens internas regulares. Conteúdo anecogênico e homogêneo."
  },
  {
    "orgao": "BAÇO",
    "texto": "Localizado em topografia habitual, com contornos regulares e bem definidos, com dimensões aumentadas (estendendo-se caudalmente e ultrapassando o polo cranial do rim esquerdo), parênquima com ecogenicidade usual e ecotextura homogênea. Arquitetura vascular preservada.",
    "diagDif": "PROCESSO INFLAMATÓRIO / INFECCIOSO / HEMOPARASITOSES."
  },
  {
    "orgao": "GLÂNDULA ADRENAL",
    "texto": "Apresenta dimensões e formato anatômicos preservados, contornos regulares, parênquima homogêneo e normoecogênico.\nAE: 0,35 cm em polo cranial, 0,42 cm em polo caudal, e 1,20 cm de comprimento.\nAD: 0,38 cm em polo cranial, 0,40 cm em polo caudal, e 1,18 cm de comprimento."
  }
]
```

### Definição dos Campos:
| Campo | Tipo | Obrigatório | Descrição |
| :--- | :---: | :---: | :--- |
| `orgao` | `string` | Sim | Nome em caixa alta do órgão (ex: `"BEXIGA"`, `"RIM ESQUERDO"`, `"BAÇO"`). |
| `texto` | `string` | Sim | Descrição clínica detalhada do parênquima, ecotextura e medidas métricas em cm. |
| `diagDif` | `string` | Opcional | Diagnósticos diferenciais obrigatórios quando houver achados anormais. Não deve incluir o prefixo `DIAG DIF.:`, pois o compilador adiciona a formatação automaticamente. |

---

## 3. Classificação e Ordenação de Imagens (`classificacaoImagens`)

Array retornado pela IA para reordenar as fotos do exame na sequência canônica antes da montagem do mosaico.

### Exemplo de Estrutura:
```json
[
  {
    "indice": 0,
    "nomeArquivo": "IMG_001.jpg",
    "sigla": "BEX",
    "orgao": "Bexiga",
    "prioridade": 1
  },
  {
    "indice": 1,
    "nomeArquivo": "IMG_002.jpg",
    "sigla": "RE",
    "orgao": "Rim Esquerdo",
    "prioridade": 2
  },
  {
    "indice": 2,
    "nomeArquivo": "IMG_003.jpg",
    "sigla": "BACO",
    "orgao": "Baço",
    "prioridade": 4
  }
]
```

---

## 4. Modelo Cirúrgico Institucional (`modelos_cirurgicos/<id>.json`)

Arquivo de persistência que define um procedimento padronizado da UPA PET.

### Exemplo (`modelos_cirurgicos/celiotomia_exploratoria.json`):
```json
{
  "id": "celiotomia_exploratoria",
  "nome": "Celiotomia exploratória de urgência",
  "sinonimos": [
    "celiotomia",
    "laparotomia",
    "corpo estranho gástrico",
    "hemoabdômen"
  ],
  "procedimento": "Celiotomia exploratória de urgência",
  "diagnosticoPreCirurgico": "Suspeita de corpo estranho gástrico",
  "descricaoProcedimento": "A paciente foi submetida à anestesia geral, posicionada em decúbito dorsal... Foi realizada incisão na linha média ventral... A síntese foi realizada por planos: peritônio e musculatura com fio não absorvível nylon 2-0 em padrão reverdin, tecido subcutâneo com fio absorvível proliglecaprone 3-0 em padrão intradérmico e pele com fio nylon 4-0 em padrão sultan.",
  "evolucaoConsideracoes": "Procedimento realizado em caráter de urgência. Durante a abordagem da cavidade abdominal, foi identificado sangramento ativo associado à formação nodular hepática, sendo realizada hemostasia local."
}
```

### Definição dos Campos:
| Campo | Tipo | Obrigatório | Descrição |
| :--- | :---: | :---: | :--- |
| `id` | `string` | Sim | Identificador único/slug sem acentos ou caracteres especiais (ex: `osh_eletiva`). |
| `nome` | `string` | Sim | Nome de exibição institucional do modelo. |
| `sinonimos` | `string[]` | Sim | Palavras-chave e termos alternativos para a IA mapear o procedimento. |
| `procedimento` | `string` | Sim | Título formal do procedimento no cabeçalho cirúrgico. |
| `diagnosticoPreCirurgico` | `string` | Não | Diagnóstico ou indicação pré-operatória padrão. |
| `descricaoProcedimento` | `string` | Sim | Descrição completa da técnica cirúrgica, antissepsia, incisão, planos e fios. |
| `evolucaoConsideracoes` | `string` | Não | Considerações pós-operatórias e condutas recomendadas. |

---

## 5. Resultado da Análise Cirúrgica (`cirurgia`)

Objeto gerado por `analisador_cirurgia.js` para ser compilado em `motor_cirurgia.js`.

### Exemplo de Estrutura:
```json
{
  "procedimento": "Ovariohisterectomia (OSH) Terapêutica / Piometra",
  "diagnosticoPreCirurgico": "Piometra com dilatação de cornos uterinos",
  "descricaoProcedimento": "Paciente sob anestesia geral, decúbito dorsal...",
  "evolucaoConsideracoes": "Paciente estável no pós-operatório imediato..."
}
```

---

## 6. Esquema de Usuários e Permissões (`usuarios.json`)

Arquivo de persistência que gerencia as contas autorizadas a acessar o portal e suas respectivas permissões de uso.

### Exemplo de Estrutura:
```json
{
  "regrasPadrao": {
    "rolePadraoNovoUsuario": "pendente"
  },
  "usuarios": [
    {
      "email": "camilabastos@upapet.com.br",
      "nome": "Dra. Camila Bastos",
      "role": "admin",
      "crmv": "CRMV/MG: 22904"
    },
    {
      "email": "matheusteteu00123@gmail.com",
      "nome": "Matheus Augusto",
      "role": "admin"
    },
    {
      "email": "veterinario.plantao@upapet.com.br",
      "nome": "Dr. Veterinário Plantão",
      "role": "veterinario",
      "crmv": "CRMV/MG: 12345"
    }
  ]
}
```

### Papéis e suas Permissões:
| Role | Nome Legível | Permissões Ativas |
| :--- | :--- | :--- |
| `admin` | Administrador(a) | `gerar_ultrassom`, `gerar_cirurgia`, `gerenciar_usuarios`, `visualizar_relatorios` |
| `veterinario` | Médico(a) Veterinário(a) | `gerar_ultrassom`, `gerar_cirurgia`, `visualizar_relatorios` |
| `assistente` | Assistente / Recepção | `visualizar_relatorios` |
| `pendente` | Acesso Pendente / Bloqueado | *(Nenhuma)* |

---

## 7. Esquema do Arquivo de Configuração (`config.json`)

Configurações locais utilizadas pelo daemon de monitoramento e pelo servidor web em desenvolvimento.

```json
{
  "pastaMonitorada": "G:\\Meu Drive\\Exames_Monitorados",
  "geminiApiKey": "AIzaSy...",
  "googleClientId": "123456789-abcdef.apps.googleusercontent.com",
  "jwtSecret": "upa_pet_jwt_secret_camila_bastos_2026"
}
```

---

*Para instruções de deploy e variáveis de ambiente em produção, veja [DEPLOYMENT_AND_OPERATIONS.md](./DEPLOYMENT_AND_OPERATIONS.md).*
