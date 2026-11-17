/**
 * Schemas de validação Zod para todos os endpoints (Multi-Tenant PostgreSQL)
 */

const { z } = require('zod');

const baseSchemas = {
  email: z.string().email('Email inválido').toLowerCase().trim(),
  id: z.string().min(1).max(150).regex(/^[a-zA-Z0-9_-]+$/, 'ID deve conter apenas letras, números, _ ou -'),
  nome: z.string().min(2).max(150).trim(),
  role: z.enum(['admin', 'veterinario', 'assistente', 'pendente']),
  jobId: z.string().regex(/^(ultra|cirurg)_[0-9]+_[a-z0-9]+$/, 'Job ID inválido'),
  safeFilename: z.string().min(1).max(255).regex(/^[a-zA-Z0-9_.\-()[\]{} ]+$/, 'Nome de arquivo inválido'),
  googleCredential: z.string().min(10, 'Token do Google inválido'),
  jwtSecret: z.string().min(32, 'JWT_SECRET deve ter pelo menos 32 caracteres'),
  geminiApiKey: z.string().min(20, 'GEMINI_API_KEY inválida'),
  googleClientId: z.string().min(10, 'GOOGLE_CLIENT_ID inválido'),
  emailList: z.string().transform((s) =>
    s.split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
  ).optional()
};

const authSchemas = {
  googleLogin: z.object({
    credential: baseSchemas.googleCredential
  })
};

const adminSchemas = {
  listUsersQuery: z.object({
    role: baseSchemas.role.optional(),
    search: z.string().max(100).optional()
  }),
  updateRole: z.object({
    email: baseSchemas.email,
    role: baseSchemas.role
  }),
  createUser: z.object({
    email: baseSchemas.email,
    nome: baseSchemas.nome,
    role: baseSchemas.role,
    crmv: z.string().max(50).optional()
  })
};

const temaSchemas = {
  updateTema: z.object({
    tema: z.enum(['light', 'dark', 'system'])
  })
};

const perfilSchemas = {
  updatePerfil: z.object({
    nome: z.string().min(2).max(150).trim().optional(),
    crmv: z.string().max(60).trim().optional(),
    nomeClinica: z.string().max(150).trim().optional()
  })
};

const modelosSchemas = {
  getModeloParams: z.object({
    id: baseSchemas.id
  }),
  createModelo: z.object({
    id: baseSchemas.id.optional(),
    nome: z.string().min(3).max(120).trim(),
    sinonimos: z.array(z.string().max(60).trim()).max(30).optional(),
    procedimento: z.string().min(5).max(5000).trim(),
    diagnosticoPreCirurgico: z.string().max(2000).trim().optional(),
    descricaoProcedimento: z.string().min(20).max(15000).trim(),
    evolucaoConsideracoes: z.string().max(5000).trim().optional(),
    isGlobal: z.boolean().optional()
  }),
  updateModelo: z.object({
    nome: z.string().min(3).max(120).trim().optional(),
    sinonimos: z.array(z.string().max(60).trim()).max(30).optional(),
    procedimento: z.string().min(5).max(5000).trim().optional(),
    diagnosticoPreCirurgico: z.string().max(2000).trim().optional(),
    descricaoProcedimento: z.string().min(20).max(15000).trim().optional(),
    evolucaoConsideracoes: z.string().max(5000).trim().optional(),
    isGlobal: z.boolean().optional()
  }).refine(data => Object.keys(data).length > 0, {
    message: 'Pelo menos um campo deve ser fornecido para atualização'
  }),
  deleteModeloParams: z.object({
    id: baseSchemas.id
  })
};

const ultrassomSchemas = {
  metadata: z.object({
    prioridade: z.enum(['normal', 'urgente']).optional(),
    observacoes: z.string().max(1000).optional()
  }).optional(),
  fileConstraints: {
    maxFiles: 25,
    maxFileSize: 10 * 1024 * 1024,
    allowedMimes: ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp']
  }
};

const cirurgiaSchemas = {
  fileConstraints: {
    documento: {
      maxCount: 1,
      maxFileSize: 25 * 1024 * 1024,
      allowedMimes: [
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/x-iwork-pages-sffpages',
        'text/plain',
        'audio/mpeg',
        'audio/mp4',
        'audio/wav',
        'audio/ogg',
        'audio/opus'
      ],
      allowedExtensions: ['.docx', '.pages', '.txt', '.mp3', '.m4a', '.wav', '.ogg', '.opus']
    },
    fotos: {
      maxCount: 5,
      maxFileSize: 10 * 1024 * 1024,
      allowedMimes: ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'],
      allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp']
    }
  }
};

const downloadSchemas = {
  params: z.object({
    jobId: baseSchemas.jobId,
    filename: baseSchemas.safeFilename
  })
};

const healthSchemas = {
  query: z.object({
    detailed: z.coerce.boolean().optional(),
    checkDeps: z.coerce.boolean().optional()
  })
};

const layoutSchemas = {
  updateLayout: z.object({
    font_family: z.string().min(2).max(160).trim().optional(),
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
    cor_secundaria: z.string().trim().regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, 'Cor secundária deve ser um hexadecimal válido (ex: #4A777A)').optional(),
    modo_template: z.enum(['padrao_upa', 'clonado_pdf']).optional(),
    header_banner_url: z.string().nullable().optional(),
    footer_logo_url: z.string().nullable().optional(),
    assinatura_extraida_url: z.string().nullable().optional(),
    visual_config_json: z.any().optional(),
    writing_style_json: z.any().optional(),
    pdfs_referencia_qtd: z.number().int().min(0).max(20).optional()
  }).refine(data => Object.keys(data).length > 0, {
    message: 'Pelo menos um campo de layout deve ser fornecido'
  })
};

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

      req[source] = result.data;
      next();
    } catch (err) {
      return res.status(500).json({ error: 'Erro interno de validação' });
    }
  };
}

function validateParams(schema) {
  return validate(schema, 'params');
}

function validateQuery(schema) {
  return validate(schema, 'query');
}

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

function sanitizeFilename(filename) {
  if (typeof filename !== 'string') return 'arquivo';
  return filename
    .replace(/[^a-zA-Z0-9_.\-()[\]{} ]/g, '_')
    .replace(/\.+/g, '.')
    .replace(/^_+|_+$/g, '')
    .slice(0, 255);
}

module.exports = {
  baseSchemas,
  authSchemas,
  adminSchemas,
  temaSchemas,
  perfilSchemas,
  modelosSchemas,
  ultrassomSchemas,
  cirurgiaSchemas,
  downloadSchemas,
  healthSchemas,
  layoutSchemas,
  validate,
  validateParams,
  validateQuery,
  sanitizeString,
  sanitizeFilename
};