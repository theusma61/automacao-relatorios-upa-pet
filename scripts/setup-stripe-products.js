/**
 * Script de Provisionamento Inicial — Produtos e Preços Vetaro na Stripe (BRL)
 *
 * Uso:
 *   STRIPE_SECRET_KEY=sk_test_... node scripts/setup-stripe-products.js
 *
 * Cria (ou reaproveita por lookup_key) os 3 planos oficiais (SOLO, PRO, CLINICA)
 * com preços Mensal e Anual em BRL e imprime as variáveis STRIPE_PRICE_* para o .env.
 */

require('dotenv').config();
const Stripe = require('stripe');

const secretKey = (process.env.STRIPE_SECRET_KEY || '').trim();
if (!secretKey) {
  console.error('❌ Defina STRIPE_SECRET_KEY no .env ou na linha de comando antes de executar.');
  process.exit(1);
}

const stripe = new Stripe(secretKey);

const PLANOS_CATALOGO = [
  {
    chave: 'SOLO',
    nome: 'Vetaro Solo / Volante',
    descricao: 'Até 40 laudos de ultrassonografia por mês + relatórios cirúrgicos ilimitados.',
    mensalCentavos: 11900,     // R$ 119,00 / mês
    anualCentavos: 118800      // R$ 1.188,00 / ano (R$ 99,00/mês)
  },
  {
    chave: 'PRO',
    nome: 'Vetaro Especialista Pro',
    descricao: 'Até 150 laudos de ultrassonografia por mês + relatórios cirúrgicos ilimitados.',
    mensalCentavos: 24900,     // R$ 249,00 / mês
    anualCentavos: 250800      // R$ 2.508,00 / ano (R$ 209,00/mês)
  },
  {
    chave: 'CLINICA',
    nome: 'Vetaro Clínica & Hospital 24h',
    descricao: 'Até 350 laudos de ultrassonografia por mês + relatórios cirúrgicos ilimitados.',
    mensalCentavos: 49700,     // R$ 497,00 / mês
    anualCentavos: 502800      // R$ 5.028,00 / ano (R$ 419,00/mês)
  }
];

async function obterOuCriarPreco({ productId, lookupKey, unitAmount, interval, planoChave }) {
  const existentes = await stripe.prices.list({
    lookup_keys: [lookupKey],
    active: true,
    limit: 1
  });
  if (existentes.data.length > 0 && existentes.data[0].unit_amount === unitAmount) {
    return existentes.data[0];
  }
  const novoPreco = await stripe.prices.create({
    product: productId,
    currency: 'brl',
    unit_amount: unitAmount,
    recurring: { interval },
    lookup_key: lookupKey,
    transfer_lookup_key: true,
    metadata: {
      plano: planoChave,
      ciclo: interval === 'year' ? 'anual' : 'mensal'
    }
  });
  if (existentes.data.length > 0) {
    await stripe.prices.update(existentes.data[0].id, { active: false }).catch(() => {});
  }
  return novoPreco;
}

async function main() {
  const modo = secretKey.startsWith('sk_live_') ? 'PRODUÇÃO (LIVE)' : 'TESTE (SANDBOX)';
  console.log(`\n🚀 Provisionando catálogo Vetaro na Stripe — Modo: ${modo}\n`);

  const envLines = [];

  for (const item of PLANOS_CATALOGO) {
    const busca = await stripe.products.list({ active: true, limit: 100 });
    let produto = busca.data.find((p) => p.metadata?.vetaro_plano === item.chave);

    if (!produto) {
      produto = await stripe.products.create({
        name: item.nome,
        description: item.descricao,
        metadata: { vetaro_plano: item.chave }
      });
      console.log(`✅ Produto criado: ${produto.name} (${produto.id})`);
    } else {
      if (produto.description !== item.descricao) {
        await stripe.products.update(produto.id, { description: item.descricao }).catch(() => {});
      }
      console.log(`♻️  Produto existente atualizado: ${produto.name} (${produto.id})`);
    }

    const precoMensal = await obterOuCriarPreco({
      productId: produto.id,
      lookupKey: `vetaro_${item.chave.toLowerCase()}_mensal_brl`,
      unitAmount: item.mensalCentavos,
      interval: 'month',
      planoChave: item.chave
    });

    const precoAnual = await obterOuCriarPreco({
      productId: produto.id,
      lookupKey: `vetaro_${item.chave.toLowerCase()}_anual_brl`,
      unitAmount: item.anualCentavos,
      interval: 'year',
      planoChave: item.chave
    });

    envLines.push(`STRIPE_PRICE_${item.chave}_MENSAL=${precoMensal.id}`);
    envLines.push(`STRIPE_PRICE_${item.chave}_ANUAL=${precoAnual.id}`);
  }

  console.log('\n📋 Cole estas linhas no seu arquivo .env:\n');
  console.log(envLines.join('\n'));
  console.log('\n✨ Lembre-se também de ativar o Customer Portal em: Stripe Dashboard -> Configurações -> Faturamento -> Portal do cliente.\n');
}

main().catch((err) => {
  console.error('❌ Erro ao provisionar Stripe:', err.message);
  process.exit(1);
});
