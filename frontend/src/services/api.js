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

  // Editor de Layout Tipográfico & Clonagem de 1 a 10 PDFs
  getLayoutConfig: () => requestJson('/api/layout-config'),
  saveLayoutConfig: (payload) =>
    requestJson('/api/layout-config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }),
  importarPadraoPdfs: (formData) =>
    requestJson('/api/layout-config/importar-pdfs', {
      method: 'POST',
      body: formData
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
  updateAdminUserPlano: (email, plano) =>
    requestJson('/api/admin/usuarios/plano', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, plano })
    }),

  // Controle de Gastos, Cotas e Assinatura
  getUsoAssinatura: () => requestJson('/api/assinatura/uso'),
  getStatusCota: () => requestJson('/api/assinatura/status-cota'),
  trocarPlanoAssinatura: (plano, ciclo = 'mensal') =>
    requestJson('/api/assinatura/trocar-plano', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plano, ciclo })
    }),

  // Personalização e Aprendizado de Padrão de Laudo por IA (Multimodal)
  aprenderPadraoLaudo: (formData) =>
    requestJson('/api/laudos/aprender-padrao', {
      method: 'POST',
      body: formData
    }),
  getPerfilLaudo: () => requestJson('/api/laudos/meu-perfil'),
  salvarPerfilLaudo: (payload) =>
    requestJson('/api/laudos/meu-perfil', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }),
  resetPerfilLaudo: () =>
    requestJson('/api/laudos/meu-perfil', {
      method: 'DELETE'
    }),

  // Recompilação e Edição em Tempo Real de Laudos e Cirurgias
  getExameDados: (jobId) =>
    requestJson(`/api/ultrassom/${encodeURIComponent(jobId)}/dados`),
  getCirurgiaDados: (jobId) =>
    requestJson(`/api/cirurgia/${encodeURIComponent(jobId)}/dados`),
  recompilarUltrassom: (payload) =>
    requestJson('/api/ultrassom/recompilar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }),
  recompilarCirurgia: (payload) =>
    requestJson('/api/cirurgia/recompilar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
};
