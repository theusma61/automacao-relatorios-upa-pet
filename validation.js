/**
 * Schemas de validação Zod para todos os endpoints
 * Garante validação estrita de entrada e sanitização
 */

const { z } = require('zod');

/**
 * Schemas base reutilizáveis
 */
const baseSchemas = {
  // Email válido
  email: z.string().email('Email inválido').toLowerCase().trim(),

  // ID alfanumérico com underscore/hífen
  id: z.string().min(1).max(100).regex(/^[a-z0-9_-]+$/, 'ID deve conter apenas letras minúsculas, números, _ ou -'),

  // Nome de pessoa
  nome: z.string().min(2).max(150).trim(),

  // Role válida
  role: z.enum(['admin', 'veterinario', 'assistente', 'pendente']),

  // Job ID
  jobId: z.string().regex(/^(ultra|cirurg)_[0-9]+_[a-z0-9]+$/, 'Job ID inválido'),

  // Filename seguro
  safeFilename: z.string().min(1).max(255).regex(/^[a-zA-Z0-9_.\-()[\]{} ]+$/, 'Nome de arquivo inválido'),

  // Google ID Token
  googleCredential: z.string().min(10, 'Token do Google inválido'),

  // JWT secret
  jwtSecret: z.string().min(32, 'JWT_SECRET deve ter pelo menos 32 caracteres'),

  // API Key Gemini
  geminiApiKey: z.string().min(20, 'GEMINI_API_KEY inválida'),

  // Google Client ID
  googleClientId: z.string().min(10, 'GOOGLE_CLIENT_ID inválido'),

  // Admin/Vet emails (comma-separated)
  emailList: z.string().transform((s) =>
    s.split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
  ).optional()
};

/**
 * Schemas de Autenticação
 */
const authSchemas = {
  // POST /api/auth/google
  googleLogin: z.object({
    credential: baseSchemas.googleCredential
  }),

  // GET /api/auth/config - sem body
  // GET /api/auth/me - sem body

  // POST /api/auth/logout - sem body
};

/**
 * Schemas de Administração de Usuários
 */
const adminSchemas = {
  // GET /api/admin/usuarios - sem body, query params opcionais
  listUsersQuery: z.object({
    role: baseSchemas.role.optional(),
    search: z.string().max(100).optional()
  }),

  // POST /api/admin/usuarios/role
  updateRole: z.object({
    email: baseSchemas.email,
    role: baseSchemas.role
  }),

  // POST /api/admin/usuarios (criar usuário manualmente - se necessário)
  createUser: z.object({
    email: baseSchemas.email,
    nome: baseSchemas.nome,
    role: baseSchemas.role,
    crmv: z.string().max(50).optional()
  })
};

/**
 * Schemas de Modelos Cirúrgicos
 */
const modelosSchemas = {
  // GET /api/modelos-cirurgicos - sem body

  // GET /api/modelos-cirurgicos/:id
  getModeloParams: z.object({
    id: baseSchemas.id
  }),

  // POST /api/modelos-cirurgicos
  createModelo: z.object({
    id: baseSchemas.id.optional(),
    nome: z.string().min(3).max(100).trim(),
    sinonimos: z.array(z.string().max(50).trim()).max(20).optional(),
    procedimento: z.string().min(10).max(5000).trim(),
    diagnosticoPreCirurgico: z.string().max(2000).trim().optional(),
    descricaoProcedimento: z.string().min(20).max(10000).trim(),
    evolucaoConsideracoes: z.string().max(5000).trim().optional()
  }),

  // PUT /api/modelos-cirurgicos/:id (mesmo schema do create, id vem do params)
  updateModelo: z.object({
    nome: z.string().min(3).max(100).trim().optional(),
    sinonimos: z.array(z.string().max(50).trim()).max(20).optional(),
    procedimento: z.string().min(10).max(5000).trim().optional(),
    diagnosticoPreCirurgico: z.string().max(2000).trim().optional(),
    descricaoProcedimento: z.string().min(20).max(10000).trim().optional(),
    evolucaoConsideracoes: z.string().max(5000).trim().optional()
  }).refine(data => Object.keys(data).length > 0, {
    message: 'Pelo menos um campo deve ser fornecido para atualização'
  }),

  // DELETE /api/modelos-cirurgicos/:id
  deleteModeloParams: z.object({
    id: baseSchemas.id
  })
};

/**
 * Schemas de Geração de Laudos (Ultrassom)
 */
const ultrassomSchemas = {
  // POST /api/ultrassom - multipart/form-data
  // Validado via multer, mas podemos validar campos extras se houver
  // Body esperado: apenas arquivos (req.files)
  // Opcional: metadados adicionais no body
  metadata: z.object({
    // Para futuras extensões
    prioridade: z.enum(['normal', 'urgente']).optional(),
    observacoes: z.string().max(1000).optional()
  }).optional(),

  // Validação de arquivos (feita no multer, mas documentada aqui)
  fileConstraints: {
    maxFiles: 25,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedMimes: ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp']
  }
};

/**
 * Schemas de Geração de Relatórios Cirúrgicos
 */
const cirurgiaSchemas = {
  // POST /api/cirurgia - multipart/form-data
  // Campos: documento (1), fotos (até 5)
  // Validado via multer
  fileConstraints: {
    documento: {
      maxCount: 1,
      maxFileSize: 25 * 1024 * 1024, // 25MB
      allowedMimes: [
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
        'application/x-iwork-pages-sffpages', // .pages
        'text/plain', // .txt
        'audio/mpeg', // .mp3
        'audio/mp4', // .m4a
        'audio/wav', // .wav
        'audio/ogg', // .ogg
        'audio/opus' // .opus
      ],
      allowedExtensions: ['.docx', '.pages', '.txt', '.mp3', '.m4a', '.wav', '.ogg', '.opus']
    },
    fotos: {
      maxCount: 5,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      allowedMimes: ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'],
      allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp']
    }
  }
};

/**
 * Schemas de Download
 */
const downloadSchemas = {
  // GET /downloads/:jobId/:filename
  params: z.object({
    jobId: baseSchemas.jobId,
    filename: baseSchemas.safeFilename
  })
};

/**
 * Schemas de Health Check
 */
const healthSchemas = {
  // GET /health - query params opcionais
  query: z.object({
    detailed: z.coerce.boolean().optional(),
    checkDeps: z.coerce.boolean().optional()
  })
};

/**
 * Schemas de Configurações de Layout
 */
const layoutSchemas = {
  // PUT /api/layout-config
  updateLayout: z.object({
    font_family: z.string().min(2).max(100).trim().optional(),
    font_size_body: z.string().trim().regex(/^([8-9]|1[0-4])(\.[0-9]+)?pt$/, 'Tamanho do corpo deve ser entre 8pt e 14pt (ex: 11pt)').optional(),
    font_size_titulo: z.string().trim().regex(/^(1[0-9]|2[0-4])(\.[0-9]+)?pt$/, 'Tamanho do título deve ser entre 10pt e 24pt (ex: 14pt)').optional(),
    margin_top: z.string().trim().regex(/^([0-9]|[1-4][0-9]|50)mm$/, 'Margem superior deve ser entre 0mm e 50mm (ex: 20mm)').optional(),
    margin_bottom: z.string().trim().regex(/^([0-9]|[1-4][0-9]|50)mm$/, 'Margem inferior deve ser entre 0mm e 50mm (ex: 20mm)').optional(),
    margin_left: z.string().trim().regex(/^([0-9]|[1-4][0-9]|50)mm$/, 'Margem esquerda deve ser entre 0mm e 50mm (ex: 15mm)').optional(),
    margin_right: z.string().trim().regex(/^([0-9]|[1-4][0-9]|50)mm$/, 'Margem direita deve ser entre 0mm e 50mm (ex: 15mm)').optional(),
    line_height: z.union([
      z.string().trim().regex(/^(1(\.[0-9]+)?|2(\.0+)?)$/, 'Entrelinha deve ser entre 1.0 e 2.0'),
      z.number().min(1.0).max(2.0).transform(v => String(v))
    ]).optional(),
    paragraph_spacing: z.string().trim().regex(/^([0-9]|1[0-9]|2[0-4])(\.[0-9]+)?pt$/, 'Espaçamento entre parágrafos deve ser entre 0pt e 24pt (ex: 8pt)').optional(),
    cor_primaria: z.string().trim().regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, 'Cor primária deve ser um hexadecimal válido (ex: #1B365D)').optional(),
    cor_secundaria: z.string().trim().regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, 'Cor secundária deve ser um hexadecimal válido (ex: #4A777A)').optional()
  }).refine(data => Object.keys(data).length > 0, {
    message: 'Pelo menos um campo de layout deve ser fornecido'
  })
};

/**
 * Middleware genérico de validação Zod
 */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    try {
      const data = req[source];
      const result = schema.safeParse(data);

      if (!result.success) {
        const errors = result.error.flatten();
        return res.status(400).json({
          error: 'Dados de entrada inválidos',
          details: errors.fieldErrors,
          formErrors: errors.formErrors
        });
      }

      // Substituir dados validados (sanitizados)
      req[source] = result.data;
      next();
    } catch (err) {
      return res.status(500).json({ error: 'Erro interno de validação' });
    }
  };
}

/**
 * Middleware de validação de parâmetros de rota
 */
function validateParams(schema) {
  return validate(schema, 'params');
}

/**
 * Middleware de validação de query string
 */
function validateQuery(schema) {
  return validate(schema, 'query');
}

/**
 * Sanitização de string para prevenir XSS/injeção
 */
function sanitizeString(str, maxLength = 1000) {
  if (typeof str !== 'string') return '';
  return str
    .trim()
    .slice(0, maxLength)
    .replace(/[<>"'&]/g, (c) => ({
      '<': '<',
      '>': '>',
      '"': '"',
      "'": "'",
      '&': '&'
    }[c]));
}

/**
 * Sanitização de nome de arquivo
 */
function sanitizeFilename(filename) {
  if (typeof filename !== 'string') return 'arquivo';
  return filename
    .replace(/[^a-zA-Z0-9_.\-()[\]{} ]/g, '_')
    .replace(/\.+/g, '.')
    .replace(/^_+|_+$/g, '')
    .slice(0, 255);
}

module.exports = {
  // Schemas
  baseSchemas,
  authSchemas,
  adminSchemas,
  modelosSchemas,
  ultrassomSchemas,
  cirurgiaSchemas,
  downloadSchemas,
  healthSchemas,
  layoutSchemas,

  // Middlewares
  validate,
  validateParams,
  validateQuery,

  // Utilitários
  sanitizeString,
  sanitizeFilename
};