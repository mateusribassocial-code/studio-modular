// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURAÇÃO DO CLIENTE
// Edite este arquivo ao clonar o template para um novo cliente.
// ─────────────────────────────────────────────────────────────────────────────

export const CLIENT = {
  name: 'GPinheiro',
  website: 'gpinheiro.com.br',
}

// ── Feature flags ─────────────────────────────────────────────────────────────
// Ligue/desligue conforme as fontes de dados do cliente.
export const FEATURES = {
  meta: true,
  googleAds: true,
  ga4: true,
  crm: 'c2s' as 'c2s' | 'datacrazy' | 'sheets' | false,
}

// ── Filiais / Unidades ────────────────────────────────────────────────────────
// Cada filial pode ter múltiplas contas de Meta e Google Ads.
// Se o cliente não tiver filiais, deixe um único objeto com id: 'geral'.
export const FILIAIS = [
  {
    id: 'florianopolis',
    label: 'Florianópolis',
    metaAccounts: [{ id: '505648743784334', label: 'GPinheiro FLN' }],
    googleAdsAccounts: [{ id: '1403967564', label: 'GPinheiro FLN' }],
    budgetMeta: 4500,
    budgetGoogle: 2000,
    products: ['Piatto Cacupé', 'Maria Augusta'],
  },
  {
    id: 'itajai',
    label: 'Itajaí',
    metaAccounts: [{ id: '728713462776382', label: 'GPinheiro ITJ' }],
    googleAdsAccounts: [{ id: '8099755225', label: 'GPinheiro ITJ' }],
    budgetMeta: 4000,
    budgetGoogle: 800,
    products: ["L'Acqua", "L'Essence"],
  },
  {
    id: 'porto-alegre',
    label: 'Porto Alegre',
    metaAccounts: [
      { id: '1345337076130595', label: 'GPinheiro POA' },
      { id: '4032516693647299', label: 'GPinheiro York' },
    ],
    googleAdsAccounts: [
      { id: '4022744344', label: 'GPinheiro POA' },
      { id: '4169502629', label: 'GPinheiro York' },
    ],
    budgetMeta: 5000,
    budgetGoogle: 0,
    products: ['York', 'Giardino'],
  },
]

export type FilialConfig = typeof FILIAIS[number]
