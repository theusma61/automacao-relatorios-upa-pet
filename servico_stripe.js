/**
 * Serviço Oficial de Pagamentos, Assinaturas e Faturas — Stripe (Payments + Billing + Invoicing)
 * Vetaro SaaS — vetaro.com.br
 *
 * Regras de negócio:
 * - Planos: SOLO (40 laudos/mês), PRO (150 laudos/mês), CLINICA (500 laudos/mês) — mensal ou anual
 * - Meio de pagamento: apenas cartão de crédito (recorrência automática)
 * - Excedente: bloqueio ao atingir 100% da cota (upgrade via Checkout / Customer Portal)
 */

const { prisma } = require('./db');
const { TABELA_PLANOS, obterOuCriarAssinatura } = require('./gerenciador_assinatura');

let StripeLib = null;
try {
  StripeLib = require('stripe');
} catch (_) {
  StripeLib = null;
}

let stripeClientCache = null;

function getStripeClient() {
  if (!StripeLib) {
    throw new Error(
      'Biblioteca "stripe" não instalada no servidor. Execute "npm install" no backend.'
    );
  }
  const secretKey = (process.env.STRIPE_SECRET_KEY || '').trim();
  if (!secretKey) {
    throw new Error(
      'STRIPE_SECRET_KEY não configurada no ambiente (.env). Configure sua chave da Stripe para habilitar pagamentos.'
    );
  }
  if (!stripeClientCache) {
    stripeClientCache = new StripeLib(secretKey);
  }
  return stripeClientCache;
}

function isStripeConfigurado() {
  return Boolean(StripeLib && (process.env.STRIPE_SECRET_KEY || '').trim());
}

/**
 * Mapeamento de (plano, ciclo) -> Price ID configurado no .env
 */
function obterMapaPrecosStripe() {
  return {
    SOLO: {
      mensal: (process.env.STRIPE_PRICE_SOLO_MENSAL || '').trim(),
      anual: (process.env.STRIPE_PRICE_SOLO_ANUAL || '').trim()
    },
    PRO: {
      mensal: (process.env.STRIPE_PRICE_PRO_MENSAL || '').trim(),
      anual: (process.env.STRIPE_PRICE_PRO_ANUAL || '').trim()
    },
    CLINICA: {
      mensal: (process.env.STRIPE_PRICE_CLINICA_MENSAL || '').trim(),
      anual: (process.env.STRIPE_PRICE_CLINICA_ANUAL || '').trim()
    }
  };
}

function obterPriceIdParaPlano(plano, ciclo = 'mensal') {
  const planoKey = String(plano || '').toUpperCase();
  const cicloNorm = String(ciclo || 'mensal').toLowerCase() === 'anual' ? 'anual' : 'mensal';
  const mapa = obterMapaPrecosStripe();
  const priceId = mapa[planoKey]?.[cicloNorm] || '';
  if (!priceId) {
    throw new Error(
      `Preço Stripe não configurado para ${planoKey} (${cicloNorm}). Defina STRIPE_PRICE_${planoKey}_${cicloNorm.toUpperCase()} no .env (ou rode "node scripts/setup-stripe-products.js").`
    );
  }
  return { priceId, planoKey, cicloNorm };
}

function resolverPlanoPorPriceId(priceId, fallbackMeta = {}) {
  if (priceId) {
    const mapa = obterMapaPrecosStripe();
    for (const [planoKey, ciclos] of Object.entries(mapa)) {
      if (ciclos.mensal && ciclos.mensal === priceId) {
        return { plano: planoKey, ciclo: 'mensal' };
      }
      if (ciclos.anual && ciclos.anual === priceId) {
        return { plano: planoKey, ciclo: 'anual' };
      }
    }
  }
  const metaPlano = String(fallbackMeta?.plano || '').toUpperCase();
  if (metaPlano && TABELA_PLANOS[metaPlano]) {
    const metaCiclo = String(fallbackMeta?.ciclo || 'mensal').toLowerCase() === 'anual' ? 'anual' : 'mensal';
    return { plano: metaPlano, ciclo: metaCiclo };
  }
  return { plano: 'PRO', ciclo: 'mensal' };
}

function mapearStatusStripe(stripeStatus) {
  switch (String(stripeStatus || '').toLowerCase()) {
    case 'active':
      return 'ACTIVE';
    case 'trialing':
      return 'TRIALING';
    case 'past_due':
    case 'unpaid':
      return 'PAST_DUE';
    case 'canceled':
    case 'incomplete_expired':
      return 'CANCELED';
    default:
      return 'ACTIVE';
  }
}

function normalizarBaseUrl(originUrl) {
  const envBase = (process.env.APP_BASE_URL || '').trim().replace(/\/+$/, '');
  if (envBase) return envBase;
  if (originUrl && /^https?:\/\//i.test(originUrl)) {
    return originUrl.replace(/\/+$/, '');
  }
  return 'https://vetaro.com.br';
}

/**
 * Obtém ou cria o Customer no Stripe vinculado ao usuário Vetaro.
 */
async function obterOuCriarCustomerStripe(usuario) {
  const stripe = getStripeClient();
  const assinatura = await obterOuCriarAssinatura(usuario.id);

  if (assinatura.stripeCustomerId) {
    return { customerId: assinatura.stripeCustomerId, assinatura };
  }

  const customer = await stripe.customers.create({
    email: usuario.email,
    name: usuario.nome || usuario.email,
    metadata: {
      usuarioId: usuario.id,
      crmv: usuario.crmv || '',
      clinica: usuario.nomeClinica || ''
    }
  });

  const atualizada = await prisma.assinatura.update({
    where: { id: assinatura.id },
    data: { stripeCustomerId: customer.id }
  });

  return { customerId: customer.id, assinatura: atualizada };
}

/**
 * Cria sessão do Stripe Checkout (Cartão de Crédito, Assinatura Recorrente).
 * Se o usuário já possui assinatura Stripe ativa, retorna URL do Customer Portal para upgrade/downgrade seguro com pró-rata.
 */
async function criarSessaoCheckout({ usuario, plano, ciclo = 'mensal', originUrl }) {
  const stripe = getStripeClient();
  const { priceId, planoKey, cicloNorm } = obterPriceIdParaPlano(plano, ciclo);
  const { customerId, assinatura } = await obterOuCriarCustomerStripe(usuario);
  const baseUrl = normalizarBaseUrl(originUrl);

  // Evita criar duas assinaturas simultâneas para o mesmo cliente
  if (
    assinatura.stripeSubscriptionId &&
    ['ACTIVE', 'TRIALING', 'PAST_DUE'].includes(String(assinatura.status || '').toUpperCase())
  ) {
    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${baseUrl}/?stripe_status=portal`
    });
    return {
      url: portal.url,
      viaPortal: true,
      sessionId: null
    };
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1
      }
    ],
    allow_promotion_codes: true,
    billing_address_collection: 'auto',
    customer_update: {
      address: 'auto',
      name: 'auto'
    },
    locale: 'pt-BR',
    metadata: {
      usuarioId: usuario.id,
      plano: planoKey,
      ciclo: cicloNorm
    },
    subscription_data: {
      metadata: {
        usuarioId: usuario.id,
        plano: planoKey,
        ciclo: cicloNorm
      }
    },
    success_url: `${baseUrl}/?stripe_status=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/?stripe_status=cancel`
  });

  return {
    url: session.url,
    viaPortal: false,
    sessionId: session.id
  };
}

/**
 * Cria sessão do Stripe Customer Portal (gerenciar cartão, plano, cancelamento e faturas/recibos).
 */
async function criarSessaoPortal({ usuario, originUrl }) {
  const stripe = getStripeClient();
  const { customerId } = await obterOuCriarCustomerStripe(usuario);
  const baseUrl = normalizarBaseUrl(originUrl);

  const portal = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${baseUrl}/?stripe_status=portal`
  });

  return { url: portal.url };
}

/**
 * Extrai bandeira e últimos 4 dígitos do cartão padrão de uma subscription Stripe.
 */
async function extrairDadosCartao(stripe, subscription) {
  try {
    let pm = subscription?.default_payment_method;
    if (typeof pm === 'string') {
      pm = await stripe.paymentMethods.retrieve(pm);
    }
    if (pm?.card) {
      const brandRaw = String(pm.card.brand || 'Cartão');
      const bandeira = brandRaw.charAt(0).toUpperCase() + brandRaw.slice(1);
      return {
        cartaoBandeira: bandeira,
        cartaoFinal: pm.card.last4 || null
      };
    }
  } catch (_) {}
  return null;
}

/**
 * Sincroniza uma Stripe Subscription com o registro `Assinatura` no PostgreSQL.
 */
async function sincronizarAssinaturaDoStripe(stripe, subscription, fallbackUsuarioId = null) {
  const customerId = typeof subscription.customer === 'string'
    ? subscription.customer
    : subscription.customer?.id;

  const usuarioId = subscription.metadata?.usuarioId || fallbackUsuarioId || null;

  let subLocal = null;
  if (subscription.id) {
    subLocal = await prisma.assinatura.findUnique({
      where: { stripeSubscriptionId: subscription.id }
    });
  }
  if (!subLocal && customerId) {
    subLocal = await prisma.assinatura.findUnique({
      where: { stripeCustomerId: customerId }
    });
  }
  if (!subLocal && usuarioId) {
    subLocal = await obterOuCriarAssinatura(usuarioId);
  }
  if (!subLocal) return null;

  const item = subscription.items?.data?.[0];
  const price = item?.price;
  const priceId = price?.id || null;
  const resolved = resolverPlanoPorPriceId(priceId, subscription.metadata);
  const planoDef = TABELA_PLANOS[resolved.plano] || TABELA_PLANOS.PRO;

  // Intervalo real da Stripe prevalece se presente
  const intervaloStripe = price?.recurring?.interval;
  const ciclo = intervaloStripe === 'year'
    ? 'anual'
    : intervaloStripe === 'month'
    ? 'mensal'
    : resolved.ciclo;

  const precoMensal = ciclo === 'anual' ? planoDef.precoAnualMensalizado : planoDef.precoMensal;
  const statusLocal = mapearStatusStripe(subscription.status);

  // Compatível com Stripe API legada (subscription.current_period_*) e API 2025+/2026+ (items.data[0].current_period_*)
  const periodStartTs = subscription.current_period_start || item?.current_period_start || null;
  const periodEndTs = subscription.current_period_end || item?.current_period_end || null;

  const periodoInicio = periodStartTs
    ? new Date(periodStartTs * 1000)
    : subLocal.cicloInicio;
  const periodoFim = periodEndTs
    ? new Date(periodEndTs * 1000)
    : subLocal.cicloFim;

  const cartao = await extrairDadosCartao(stripe, subscription);

  return prisma.assinatura.update({
    where: { id: subLocal.id },
    data: {
      stripeCustomerId: customerId || subLocal.stripeCustomerId,
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      plano: resolved.plano,
      status: statusLocal,
      ciclo,
      precoMensal,
      cotaLimite: planoDef.cotaLimite,
      cicloInicio: periodoInicio,
      cicloFim: periodoFim,
      cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
      ...(cartao ? cartao : {})
    }
  });
}

/**
 * Confirma e sincroniza imediatamente uma Checkout Session no retorno do cliente
 * (elimina race condition / atraso de webhook e atualiza plano + fatura na hora).
 */
async function confirmarSessaoCheckout(sessionId, usuarioId) {
  if (!sessionId || !usuarioId) {
    throw new Error('sessionId e usuarioId são obrigatórios.');
  }
  const stripe = getStripeClient();
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['subscription.default_payment_method', 'invoice']
  });

  if (!session) {
    throw new Error('Sessão de checkout não encontrada na Stripe.');
  }

  // Garante que a sessão pertence ao usuário autenticado
  const sessionUserId = session.metadata?.usuarioId || null;
  if (sessionUserId && sessionUserId !== usuarioId) {
    throw new Error('Sessão de checkout não pertence a este usuário.');
  }

  let subAtualizada = null;
  if (session.subscription) {
    const subObj = typeof session.subscription === 'string'
      ? await stripe.subscriptions.retrieve(session.subscription, { expand: ['default_payment_method'] })
      : session.subscription;
    subAtualizada = await sincronizarAssinaturaDoStripe(stripe, subObj, usuarioId);
  }

  // Também sincroniza a fatura inicial se disponível e paga
  const invObj = session.invoice && typeof session.invoice === 'object'
    ? session.invoice
    : typeof session.invoice === 'string'
    ? await stripe.invoices.retrieve(session.invoice)
    : null;

  if (subAtualizada && invObj && (invObj.status === 'paid' || invObj.amount_paid > 0)) {
    const valorPago = Number(((invObj.amount_paid || 0) / 100).toFixed(2));
    const dataFatura = invObj.status_transitions?.paid_at
      ? new Date(invObj.status_transitions.paid_at * 1000)
      : new Date((invObj.created || Math.floor(Date.now() / 1000)) * 1000);
    const descricao =
      invObj.lines?.data?.[0]?.description ||
      `Assinatura Vetaro (${subAtualizada.plano})`;

    await prisma.fatura.upsert({
      where: { stripeInvoiceId: invObj.id },
      update: {
        valor: valorPago,
        status: 'pago',
        dataFatura,
        descricao,
        pdfUrl: invObj.invoice_pdf || null,
        hostedInvoiceUrl: invObj.hosted_invoice_url || null
      },
      create: {
        assinaturaId: subAtualizada.id,
        stripeInvoiceId: invObj.id,
        valor: valorPago,
        status: 'pago',
        dataFatura,
        descricao,
        pdfUrl: invObj.invoice_pdf || null,
        hostedInvoiceUrl: invObj.hosted_invoice_url || null
      }
    });
  }

  return {
    confirmado: Boolean(subAtualizada),
    plano: subAtualizada?.plano || null,
    status: subAtualizada?.status || null
  };
}

/**
 * Processa eventos recebidos no Webhook oficial da Stripe (com verificação criptográfica e idempotência).
 */
async function processarWebhookStripe(rawBody, signature) {
  const stripe = getStripeClient();
  const webhookSecret = (process.env.STRIPE_WEBHOOK_SECRET || '').trim();
  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET não configurada no ambiente (.env).');
  }

  const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);

  // Idempotência: ignora eventos já processados com sucesso
  const jaProcessado = await prisma.stripeWebhookEvent.findUnique({
    where: { id: event.id }
  });
  if (jaProcessado) {
    return { received: true, duplicated: true, type: event.type };
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      if (session.mode === 'subscription' && session.subscription) {
        const subscriptionId = typeof session.subscription === 'string'
          ? session.subscription
          : session.subscription.id;
        const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
          expand: ['default_payment_method']
        });
        await sincronizarAssinaturaDoStripe(stripe, subscription, session.metadata?.usuarioId || null);
      }
      break;
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const subscription = event.data.object;
      await sincronizarAssinaturaDoStripe(stripe, subscription);
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      const customerId = typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer?.id;

      const subLocal =
        (await prisma.assinatura.findUnique({ where: { stripeSubscriptionId: subscription.id } })) ||
        (customerId
          ? await prisma.assinatura.findUnique({ where: { stripeCustomerId: customerId } })
          : null);

      if (subLocal) {
        const planoGratuito = TABELA_PLANOS.GRATUITO;
        await prisma.assinatura.update({
          where: { id: subLocal.id },
          data: {
            plano: 'GRATUITO',
            status: 'CANCELED',
            precoMensal: 0.0,
            ciclo: 'mensal',
            cotaLimite: planoGratuito.cotaLimite,
            stripeSubscriptionId: null,
            stripePriceId: null,
            cancelAtPeriodEnd: false
          }
        });
      }
      break;
    }

    case 'invoice.paid': {
      const invoice = event.data.object;
      const customerId = typeof invoice.customer === 'string'
        ? invoice.customer
        : invoice.customer?.id;
      const rawSubInvoice =
        invoice.subscription ||
        invoice.parent?.subscription_details?.subscription ||
        invoice.lines?.data?.[0]?.parent?.subscription_item_details?.subscription ||
        null;
      const subscriptionId = typeof rawSubInvoice === 'string'
        ? rawSubInvoice
        : rawSubInvoice?.id || null;

      const subLocal =
        (subscriptionId
          ? await prisma.assinatura.findUnique({ where: { stripeSubscriptionId: subscriptionId } })
          : null) ||
        (customerId
          ? await prisma.assinatura.findUnique({ where: { stripeCustomerId: customerId } })
          : null);

      if (subLocal) {
        const valorPago = Number(((invoice.amount_paid || 0) / 100).toFixed(2));
        const dataFatura = invoice.status_transitions?.paid_at
          ? new Date(invoice.status_transitions.paid_at * 1000)
          : new Date((invoice.created || Math.floor(Date.now() / 1000)) * 1000);
        const descricao =
          invoice.lines?.data?.[0]?.description ||
          `Assinatura Vetaro (${subLocal.plano})`;

        await prisma.fatura.upsert({
          where: { stripeInvoiceId: invoice.id },
          update: {
            valor: valorPago,
            status: 'pago',
            dataFatura,
            descricao,
            pdfUrl: invoice.invoice_pdf || null,
            hostedInvoiceUrl: invoice.hosted_invoice_url || null
          },
          create: {
            assinaturaId: subLocal.id,
            stripeInvoiceId: invoice.id,
            valor: valorPago,
            status: 'pago',
            dataFatura,
            descricao,
            pdfUrl: invoice.invoice_pdf || null,
            hostedInvoiceUrl: invoice.hosted_invoice_url || null
          }
        });

        // Garante ciclo e status ativos atualizados
        if (subscriptionId) {
          try {
            const subFresh = await stripe.subscriptions.retrieve(subscriptionId, {
              expand: ['default_payment_method']
            });
            await sincronizarAssinaturaDoStripe(stripe, subFresh);
          } catch (_) {}
        }
      }
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      const customerId = typeof invoice.customer === 'string'
        ? invoice.customer
        : invoice.customer?.id;
      const rawSubInvoice =
        invoice.subscription ||
        invoice.parent?.subscription_details?.subscription ||
        invoice.lines?.data?.[0]?.parent?.subscription_item_details?.subscription ||
        null;
      const subscriptionId = typeof rawSubInvoice === 'string'
        ? rawSubInvoice
        : rawSubInvoice?.id || null;

      const subLocal =
        (subscriptionId
          ? await prisma.assinatura.findUnique({ where: { stripeSubscriptionId: subscriptionId } })
          : null) ||
        (customerId
          ? await prisma.assinatura.findUnique({ where: { stripeCustomerId: customerId } })
          : null);

      if (subLocal) {
        await prisma.assinatura.update({
          where: { id: subLocal.id },
          data: { status: 'PAST_DUE' }
        });

        const valorDevido = Number(((invoice.amount_due || 0) / 100).toFixed(2));
        await prisma.fatura.upsert({
          where: { stripeInvoiceId: invoice.id },
          update: {
            valor: valorDevido,
            status: 'pendente',
            pdfUrl: invoice.invoice_pdf || null,
            hostedInvoiceUrl: invoice.hosted_invoice_url || null
          },
          create: {
            assinaturaId: subLocal.id,
            stripeInvoiceId: invoice.id,
            valor: valorDevido,
            status: 'pendente',
            dataFatura: new Date((invoice.created || Math.floor(Date.now() / 1000)) * 1000),
            descricao: `Pagamento pendente — Vetaro (${subLocal.plano})`,
            pdfUrl: invoice.invoice_pdf || null,
            hostedInvoiceUrl: invoice.hosted_invoice_url || null
          }
        });
      }
      break;
    }

    default:
      break;
  }

  await prisma.stripeWebhookEvent.create({
    data: {
      id: event.id,
      tipo: event.type
    }
  });

  return { received: true, duplicated: false, type: event.type };
}

module.exports = {
  isStripeConfigurado,
  obterMapaPrecosStripe,
  obterPriceIdParaPlano,
  resolverPlanoPorPriceId,
  obterOuCriarCustomerStripe,
  criarSessaoCheckout,
  criarSessaoPortal,
  confirmarSessaoCheckout,
  processarWebhookStripe
};
