async function requestJson(url, options = {}) {
  const res = await fetch(url, {
    credentials: 'include',
    ...options
  });
  let data = {};
  try {
    data = await res.json();
  } catch (_) {}
  if (!res.ok) {
    throw new Error(data.error || `Erro HTTP ${res.status}`);
  }
  return data;
}

export const api = {
  // Autenticação e Sessão
  getAuthConfig: () => requestJson('/api/auth/config'),
  getMe: () => requestJson('/api/auth/me'),
  loginWithGoogle: (credential) =>
    requestJson('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential })
    }),
  logout: () =>
    requestJson('/api/auth/logout', {
      method: 'POST'
    }),

  // Tema Claro / Escuro sincronizado com PostgreSQL
  getTema: () => requestJson('/api/usuario/tema'),
  saveTema: (tema) =>
    requestJson('/api/usuario/tema', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tema })
    }),

  // Perfil Profissional Multi-Médico (CRMV, Clínica, Logo, Assinatura)
  updatePerfilProfissional: (formData) =>
    requestJson('/api/perfil/profissional', {
      method: 'POST',
      body: formData
    }),

  // Histórico Multi-Tenant (Exames de Ultrassom + Relatórios Cirúrgicos)
  getHistorico: () => requestJson('/api/historico'),

  // Geradores com IA Gemini
  gerarUltrassom: (formData) =>
    requestJson('/api/ultrassom', {
      method: 'POST',
      body: formData
    }),
  gerarCirurgia: (formData) =>
    requestJson('/api/cirurgia', {
      method: 'POST',
      body: formData
    }),

  // Biblioteca de Modelos Cirúrgicos
  getModelosCirurgicos: () => requestJson('/api/modelos-cirurgicos'),
  getModeloPorId: (id) =>
    requestJson(`/api/modelos-cirurgicos/${encodeURIComponent(id)}`),
  salvarModeloCirurgico: (payload) =>
    requestJson('/api/modelos-cirurgicos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }),
  clonarModeloCirurgico: (id) =>
    requestJson(`/api/modelos-cirurgicos/${encodeURIComponent(id)}/clonar`, {
      method: 'POST'
    }),
  excluirModeloCirurgico: (id) =>
    requestJson(`/api/modelos-cirurgicos/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    }),

  // Editor de Layout Tipográfico (PDF e DOCX)
  getLayoutConfig: () => requestJson('/api/layout-config'),
  saveLayoutConfig: (payload) =>
    requestJson('/api/layout-config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }),
  resetLayoutConfig: () =>
    requestJson('/api/layout-config/reset', {
      method: 'POST'
    }),

  // Painel Administrativo RBAC
  getAdminUsuarios: () => requestJson('/api/admin/usuarios'),
  updateAdminUserRole: (email, role) =>
    requestJson('/api/admin/usuarios/role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, role })
    }),

  // Controle de Gastos, Cotas e Assinatura
  getUsoAssinatura: () => requestJson('/api/assinatura/uso'),
  trocarPlanoAssinatura: (plano, ciclo = 'mensal') =>
    requestJson('/api/assinatura/trocar-plano', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plano, ciclo })
    })
};
