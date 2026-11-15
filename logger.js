/**
 * Logger centralizado com Pino
 * Níveis: trace, debug, info, warn, error, fatal
 * Saída estruturada JSON para produção, pretty para desenvolvimento
 */

const fs = require('fs');
const path = require('path');
const pino = require('pino');

const LOG_DIR = path.join(__dirname, 'logs');
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

const isProduction = process.env.NODE_ENV === 'production';
const logLevel = process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug');

// Stream de arquivo com rotação diária simples
const logFile = path.join(LOG_DIR, `upa-pet-${new Date().toISOString().split('T')[0]}.log`);
const fileStream = pino.destination({ dest: logFile, sync: false });

// Stream pretty para desenvolvimento
const prettyStream = isProduction
  ? fileStream
  : pino.transport({
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
        singleLine: true
      }
    });

const logger = pino(
  {
    level: logLevel,
    base: {
      service: 'upa-pet-automacao',
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    },
    formatters: {
      level: (label) => ({ level: label }),
      log: (obj) => {
        // Sanitizar campos sensíveis
        const sanitized = { ...obj };
        if (sanitized.apiKey) sanitized.apiKey = '[REDACTED]';
        if (sanitized.token) sanitized.token = '[REDACTED]';
        if (sanitized.credential) sanitized.credential = '[REDACTED]';
        if (sanitized.password) sanitized.password = '[REDACTED]';
        if (sanitized.jwt) sanitized.jwt = '[REDACTED]';
        return sanitized;
      }
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: {
      paths: [
        '*.apiKey',
        '*.token',
        '*.credential',
        '*.password',
        '*.jwt',
        '*.authorization',
        '*.cookie',
        'req.headers.authorization',
        'req.headers.cookie'
      ],
      censor: '[REDACTED]'
    }
  },
  isProduction ? fileStream : prettyStream
);

/**
 * Middleware Express para logging de requests com request-id
 */
function requestLogger() {
  return (req, res, next) => {
    const start = process.hrtime.bigint();
    const requestId = req.headers['x-request-id'] ||
      `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    req.requestId = requestId;
    req.log = logger.child({ requestId, ip: req.ip, method: req.method, url: req.originalUrl });

    res.setHeader('X-Request-ID', requestId);

    const originalSend = res.send;
    res.send = function (body) {
      const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
      const logData = {
        statusCode: res.statusCode,
        durationMs: Math.round(durationMs),
        contentLength: res.getHeader('content-length') || (body ? Buffer.byteLength(body) : 0)
      };

      if (res.statusCode >= 500) {
        req.log.error(logData, 'Request completed with server error');
      } else if (res.statusCode >= 400) {
        req.log.warn(logData, 'Request completed with client error');
      } else {
        req.log.info(logData, 'Request completed');
      }

      return originalSend.call(this, body);
    };

    next();
  };
}

/**
 * Logger child para módulos específicos
 */
function createModuleLogger(moduleName) {
  return logger.child({ module: moduleName });
}

/**
 * Métricas simples em memória (para Prometheus/Grafana futuramente)
 */
const metrics = {
  counters: new Map(),
  gauges: new Map(),
  histograms: new Map(),

  increment(name, labels = {}, value = 1) {
    const key = this._key(name, labels);
    this.counters.set(key, (this.counters.get(key) || 0) + value);
  },

  gauge(name, value, labels = {}) {
    const key = this._key(name, labels);
    this.gauges.set(key, value);
  },

  histogram(name, value, labels = {}) {
    const key = this._key(name, labels);
    const arr = this.histograms.get(key) || [];
    arr.push(value);
    if (arr.length > 1000) arr.shift(); // Manter apenas últimas 1000
    this.histograms.set(key, arr);
  },

  _key(name, labels) {
    const labelStr = Object.entries(labels).sort((a, b) => a[0].localeCompare(b[0]))
      .map(([k, v]) => `${k}="${v}"`).join(',');
    return labelStr ? `${name}{${labelStr}}` : name;
  },

  getAll() {
    return {
      counters: Object.fromEntries(this.counters),
      gauges: Object.fromEntries(this.gauges),
      histograms: Object.fromEntries(
        Array.from(this.histograms.entries()).map(([k, v]) => [
          k,
          {
            count: v.length,
            sum: v.reduce((a, b) => a + b, 0),
            min: Math.min(...v),
            max: Math.max(...v),
            avg: v.reduce((a, b) => a + b, 0) / v.length,
            p50: this._percentile(v, 50),
            p95: this._percentile(v, 95),
            p99: this._percentile(v, 99)
          }
        ])
      )
    };
  },

  _percentile(arr, p) {
    if (!arr.length) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const idx = Math.ceil(p / 100 * sorted.length) - 1;
    return sorted[Math.max(0, idx)];
  },

  reset() {
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
  }
};

/**
 * Helpers de métricas de negócio
 */
const businessMetrics = {
  // Ultrassom
  ultraRequest: (status, userRole) => {
    metrics.increment('upa_pet_ultrasound_requests_total', { status, role: userRole });
  },
  ultraDuration: (durationMs) => {
    metrics.histogram('upa_pet_ultrasound_duration_seconds', durationMs / 1000);
  },
  ultraPages: (pageCount) => {
    metrics.histogram('upa_pet_ultrasound_pdf_pages', pageCount);
  },

  // Cirurgia
  surgeryRequest: (status, userRole) => {
    metrics.increment('upa_pet_surgery_requests_total', { status, role: userRole });
  },
  surgeryDuration: (durationMs) => {
    metrics.histogram('upa_pet_surgery_duration_seconds', durationMs / 1000);
  },

  // IA Gemini
  geminiRequest: (model, status) => {
    metrics.increment('upa_pet_gemini_requests_total', { model, status });
  },
  geminiDuration: (model, durationMs) => {
    metrics.histogram('upa_pet_gemini_duration_seconds', durationMs / 1000, { model });
  },
  geminiTokens: (model, inputTokens, outputTokens) => {
    metrics.histogram('upa_pet_gemini_input_tokens', inputTokens, { model });
    metrics.histogram('upa_pet_gemini_output_tokens', outputTokens, { model });
  },

  // Erros
  error: (type, module) => {
    metrics.increment('upa_pet_errors_total', { type, module });
  },

  // Usuários ativos
  activeUsers: (count) => {
    metrics.gauge('upa_pet_active_users', count);
  }
};

module.exports = {
  logger,
  requestLogger,
  createModuleLogger,
  metrics,
  businessMetrics
};