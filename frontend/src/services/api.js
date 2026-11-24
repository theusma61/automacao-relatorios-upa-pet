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

async function requestBlob(url, options = {}) {
  const res = await fetch(url, {
    credentials: 'include',
    ...options
  });
  if (!res.ok) {
    let msg = `Erro HTTP ${res.status}`;
    try {
      const data = await res.json();
      if (data?.error) msg = data.error;
    } catch (_) {}
    throw new Error(msg);
  }
  return await res.blob();
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
  getAdminIaConfig: () => requestJson('/api/admin/ia-config'),
  updateAdminIaConfig: (usarHydrogenPago) =>
    requestJson('/api/admin/ia-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usarHydrogenPago: Boolean(usarHydrogenPago) })
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
  getStripeConfig: () => requestJson('/api/stripe/config'),
  criarCheckoutStripe: (plano, ciclo = 'mensal') =>
    requestJson('/api/stripe/checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plano, ciclo })
    }),
  abrirPortalStripe: () =>
    requestJson('/api/stripe/portal-session', {
      method: 'POST'
    }),
  confirmarSessaoStripe: (sessionId) =>
    requestJson('/api/stripe/confirm-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId })
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

  // Personalização e Aprendizado de Padrão de Relatório Cirúrgico por IA (Multimodal)
  aprenderPadraoCirurgia: (formData) =>
    requestJson('/api/cirurgia/aprender-padrao', {
      method: 'POST',
      body: formData
    }),
  getPerfilCirurgico: () => requestJson('/api/cirurgia/meu-perfil'),
  salvarPerfilCirurgico: (payload) =>
    requestJson('/api/cirurgia/meu-perfil', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }),
  resetPerfilCirurgico: () =>
    requestJson('/api/cirurgia/meu-perfil', {
      method: 'DELETE'
    }),

  // Recompilação e Edição em Tempo Real de Laudos e Cirurgias
  getExameDados: (jobId) =>
    requestJson(`/api/ultrassom/${encodeURIComponent(jobId)}/dados`),
  getCirurgiaDados: (jobId) =>
    requestJson(`/api/cirurgia/${encodeURIComponent(jobId)}/dados`),
  recompilarUltrassom: (payload, { signal } = {}) =>
    requestJson('/api/ultrassom/recompilar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal
    }),
  recompilarCirurgia: (payload, { signal } = {}) =>
    requestJson('/api/cirurgia/recompilar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal
    }),

  // Pré-visualização ao vivo em PDF real dos padrões (sem salvar no banco)
  previewPadraoCirurgia: (payload, { signal } = {}) =>
    requestBlob('/api/cirurgia/preview-padrao', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal
    }),
  previewPadraoLaudo: (payload, { signal } = {}) =>
    requestBlob('/api/laudos/preview-padrao', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal
    }),

  // Fase 1 — Entrega Inteligente (Link público, QR Code, Resumo ao Tutor e WhatsApp)
  obterLinkCompartilhamento: (tipo, id) =>
    requestJson(`/api/compartilhamento/${encodeURIComponent(tipo)}/${encodeURIComponent(id)}/link`, {
      method: 'POST'
    }),
  alterarStatusLink: (tipo, id, linkAtivo) =>
    requestJson(`/api/compartilhamento/${encodeURIComponent(tipo)}/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ linkAtivo: Boolean(linkAtivo) })
    }),
  gerarResumoTutor: (tipo, id, forcarRegeneracao = false) =>
    requestJson(`/api/compartilhamento/${encodeURIComponent(tipo)}/${encodeURIComponent(id)}/resumo-tutor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ forcarRegeneracao: Boolean(forcarRegeneracao) })
    }),
  salvarResumoTutor: (tipo, id, resumoTutor) =>
    requestJson(`/api/compartilhamento/${encodeURIComponent(tipo)}/${encodeURIComponent(id)}/resumo-tutor`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resumoTutor })
    }),
  registrarEnvioCompartilhamento: (tipo, id) =>
    requestJson(`/api/compartilhamento/${encodeURIComponent(tipo)}/${encodeURIComponent(id)}/registrar-envio`, {
      method: 'POST'
    })
};
