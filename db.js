/**
 * Conexão centralizada com PostgreSQL via Prisma ORM (Multi-Tenant SaaS)
 */

function criarPrismaMockMemoria() {
  const store = {
    clinicas: new Map(),
    usuarios: new Map(),
    layouts: new Map(),
    modelos: new Map(),
    exames: new Map(),
    cirurgias: new Map()
  };

  let seq = 1;
  const cuid = () => `cuid_test_${Date.now()}_${seq++}`;

  return {
    clinica: {
      upsert: async ({ where, update, create }) => {
        const key = where.id || where.cnpj;
        const existing = store.clinicas.get(key);
        if (existing) {
          const updated = { ...existing, ...update, atualizadoEm: new Date() };
          store.clinicas.set(updated.id, updated);
          return updated;
        }
        const created = { id: create.id || cuid(), criadoEm: new Date(), atualizadoEm: new Date(), ...create };
        store.clinicas.set(created.id, created);
        return created;
      },
      findUnique: async ({ where }) => store.clinicas.get(where.id) || null
    },
    usuario: {
      findUnique: async ({ where, select }) => {
        let u = null;
        if (where.id) u = store.usuarios.get(where.id) || null;
        else if (where.email) {
          const emailNorm = String(where.email).toLowerCase();
          for (const item of store.usuarios.values()) {
            if (item.email.toLowerCase() === emailNorm) { u = item; break; }
          }
        }
        if (!u) return null;
        const clone = { ...u, clinica: u.clinicaId ? store.clinicas.get(u.clinicaId) || null : null };
        if (select) {
          const out = {};
          for (const k of Object.keys(select)) if (select[k]) out[k] = clone[k];
          return out;
        }
        return clone;
      },
      create: async ({ data }) => {
        const id = data.id || cuid();
        const novo = {
          id,
          role: 'pendente',
          crmv: null,
          nomeClinica: null,
          logoUrl: null,
          assinaturaUrl: null,
          foto: null,
          telefone: null,
          temaPreferencia: 'system',
          ativo: true,
          clinicaId: null,
          criadoEm: new Date(),
          atualizadoEm: new Date(),
          ...data
        };
        store.usuarios.set(id, novo);
        return { ...novo, clinica: novo.clinicaId ? store.clinicas.get(novo.clinicaId) || null : null };
      },
      update: async ({ where, data, select }) => {
        let alvo = null;
        if (where.id) alvo = store.usuarios.get(where.id);
        else if (where.email) {
          const emailNorm = String(where.email).toLowerCase();
          for (const item of store.usuarios.values()) {
            if (item.email.toLowerCase() === emailNorm) { alvo = item; break; }
          }
        }
        if (!alvo) throw new Error('Usuário não encontrado.');
        const atualizado = { ...alvo, ...data, atualizadoEm: new Date() };
        store.usuarios.set(atualizado.id, atualizado);
        const clone = { ...atualizado, clinica: atualizado.clinicaId ? store.clinicas.get(atualizado.clinicaId) || null : null };
        if (select) {
          const out = {};
          for (const k of Object.keys(select)) if (select[k]) out[k] = clone[k];
          return out;
        }
        return clone;
      },
      upsert: async ({ where, update, create }) => {
        const emailNorm = where.email ? String(where.email).toLowerCase() : null;
        let existente = null;
        if (where.id) existente = store.usuarios.get(where.id);
        else if (emailNorm) {
          for (const item of store.usuarios.values()) {
            if (item.email.toLowerCase() === emailNorm) { existente = item; break; }
          }
        }
        if (existente) {
          const atualizado = { ...existente, ...update, atualizadoEm: new Date() };
          store.usuarios.set(atualizado.id, atualizado);
          return atualizado;
        }
        const id = create.id || cuid();
        const novo = {
          id,
          role: 'pendente',
          temaPreferencia: 'system',
          ativo: true,
          criadoEm: new Date(),
          atualizadoEm: new Date(),
          ...create
        };
        store.usuarios.set(id, novo);
        return novo;
      },
      findMany: async () => {
        return Array.from(store.usuarios.values())
          .sort((a, b) => a.email.localeCompare(b.email))
          .map(u => ({ ...u, clinica: u.clinicaId ? store.clinicas.get(u.clinicaId) || null : null }));
      },
      count: async () => store.usuarios.size
    },
    configuracaoLayout: {
      findUnique: async ({ where }) => {
        if (where.id) return store.layouts.get(where.id) || null;
        if (where.usuarioId) {
          for (const l of store.layouts.values()) {
            if (l.usuarioId === where.usuarioId) return l;
          }
        }
        return null;
      },
      upsert: async ({ where, update, create }) => {
        let existente = null;
        if (where.id) existente = store.layouts.get(where.id);
        else if (where.usuarioId) {
          for (const l of store.layouts.values()) {
            if (l.usuarioId === where.usuarioId) { existente = l; break; }
          }
        }
        if (existente) {
          const atualizado = { ...existente, ...update, atualizadoEm: new Date() };
          store.layouts.set(atualizado.id, atualizado);
          return atualizado;
        }
        const id = create.id || cuid();
        const novo = { id, criadoEm: new Date(), atualizadoEm: new Date(), ...create };
        store.layouts.set(id, novo);
        return novo;
      },
      update: async ({ where, data }) => {
        const existente = store.layouts.get(where.id);
        if (!existente) throw new Error('Layout não encontrado.');
        const atualizado = { ...existente, ...data, atualizadoEm: new Date() };
        store.layouts.set(atualizado.id, atualizado);
        return atualizado;
      },
      deleteMany: async ({ where }) => {
        let count = 0;
        for (const [k, v] of store.layouts.entries()) {
          if (where.usuarioId && v.usuarioId === where.usuarioId) {
            store.layouts.delete(k);
            count++;
          }
        }
        return { count };
      }
    },
    modeloCirurgico: {
      findMany: async ({ where } = {}) => {
        let arr = Array.from(store.modelos.values());
        if (where && Array.isArray(where.OR)) {
          arr = arr.filter(m =>
            where.OR.some(cond =>
              (cond.isGlobal !== undefined && m.isGlobal === cond.isGlobal) ||
              (cond.usuarioId !== undefined && m.usuarioId === cond.usuarioId)
            )
          );
        }
        return arr.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
      },
      findFirst: async ({ where }) => {
        const m = store.modelos.get(where.id);
        if (!m) return null;
        if (Array.isArray(where.OR)) {
          const ok = where.OR.some(cond =>
            (cond.isGlobal !== undefined && m.isGlobal === cond.isGlobal) ||
            (cond.usuarioId !== undefined && m.usuarioId === cond.usuarioId)
          );
          if (!ok) return null;
        }
        return m;
      },
      findUnique: async ({ where }) => store.modelos.get(where.id) || null,
      upsert: async ({ where, update, create }) => {
        const existente = store.modelos.get(where.id);
        if (existente) {
          const atualizado = { ...existente, ...update, atualizadoEm: new Date() };
          store.modelos.set(where.id, atualizado);
          return atualizado;
        }
        const novo = { criadoEm: new Date(), atualizadoEm: new Date(), ...create };
        store.modelos.set(novo.id, novo);
        return novo;
      },
      create: async ({ data }) => {
        const novo = { criadoEm: new Date(), atualizadoEm: new Date(), ...data };
        store.modelos.set(novo.id, novo);
        return novo;
      },
      delete: async ({ where }) => {
        const existente = store.modelos.get(where.id);
        store.modelos.delete(where.id);
        return existente;
      },
      count: async () => store.modelos.size
    },
    exameLaudo: {
      create: async ({ data }) => {
        const id = data.id || cuid();
        const novo = { id, criadoEm: new Date(), ...data };
        store.exames.set(id, novo);
        return novo;
      },
      findMany: async ({ where, take = 50 } = {}) => {
        let arr = Array.from(store.exames.values());
        if (where?.usuarioId) arr = arr.filter(e => e.usuarioId === where.usuarioId);
        return arr.sort((a, b) => b.criadoEm - a.criadoEm).slice(0, take);
      }
    },
    relatorioCirurgico: {
      create: async ({ data }) => {
        const id = data.id || cuid();
        const novo = { id, criadoEm: new Date(), ...data };
        store.cirurgias.set(id, novo);
        return novo;
      },
      findMany: async ({ where, take = 50 } = {}) => {
        let arr = Array.from(store.cirurgias.values());
        if (where?.usuarioId) arr = arr.filter(c => c.usuarioId === where.usuarioId);
        return arr.sort((a, b) => b.criadoEm - a.criadoEm).slice(0, take);
      }
    },
    $disconnect: async () => {}
  };
}

function criarClientePrisma() {
  if (global.__upaPrisma) return global.__upaPrisma;

  if (process.env.NODE_ENV === 'test' && !process.env.DATABASE_URL) {
    global.__upaPrisma = criarPrismaMockMemoria();
    return global.__upaPrisma;
  }

  try {
    const { PrismaClient } = require('@prisma/client');
    const client = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error']
    });
    if (process.env.NODE_ENV !== 'production') {
      global.__upaPrisma = client;
    }
    return client;
  } catch (err) {
    if (process.env.NODE_ENV === 'test') {
      global.__upaPrisma = criarPrismaMockMemoria();
      return global.__upaPrisma;
    }
    throw new Error(
      `Falha ao carregar @prisma/client (${err.message}). Execute "npm install && npx prisma generate".`
    );
  }
}

const prisma = criarClientePrisma();

module.exports = {
  prisma,
  getDatabase: () => prisma,
  getDbPath: () => process.env.DATABASE_URL ? 'postgresql://[prisma]' : 'prisma-client'
};
