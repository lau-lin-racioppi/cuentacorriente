// model.js — Lógica de negocio, validaciones y cálculos. No conoce el DOM.

function generateId() {
  return crypto.randomUUID();
}

function isoDate(date = new Date()) {
  return date.toISOString();
}

// --- Factories ---

function createAsset({ name, category, currency, value, valuationDate, notes = null, linkedLiabilityId = null }) {
  return {
    id: generateId(),
    name,
    category,
    currency,
    value,
    valuationDate,
    notes,
    linkedLiabilityId,
  };
}

function createLiability({ name, category, currency, totalAmount, remainingAmount, startDate, endDate = null, linkedAssetId = null, notes = null }) {
  return {
    id: generateId(),
    name,
    category,
    currency,
    totalAmount,
    remainingAmount,
    startDate,
    endDate,
    linkedAssetId,
    notes,
  };
}

function createSnapshot({ totalAssetsARS, totalAssetsUSD, totalLiabilitiesARS, totalLiabilitiesUSD, notes = null }) {
  return {
    id: generateId(),
    date: isoDate(),
    totalAssetsARS,
    totalAssetsUSD,
    totalLiabilitiesARS,
    totalLiabilitiesUSD,
    notes,
  };
}

// --- Validaciones ---

const ASSET_CATEGORIES = ['cash', 'investment', 'real_estate', 'vehicle', 'other'];
const LIABILITY_CATEGORIES = ['mortgage', 'loan', 'debt', 'other'];
const CURRENCIES = ['ARS', 'USD'];

function validateAsset(data) {
  const errors = [];
  if (!data.name || !data.name.trim()) errors.push('El nombre es obligatorio.');
  if (!ASSET_CATEGORIES.includes(data.category)) errors.push('Categoría de activo inválida.');
  if (!CURRENCIES.includes(data.currency)) errors.push('Moneda inválida.');
  if (typeof data.value !== 'number' || data.value < 0) errors.push('El valor debe ser un número positivo.');
  if (!data.valuationDate) errors.push('La fecha de valuación es obligatoria.');
  return errors;
}

function validateLiability(data) {
  const errors = [];
  if (!data.name || !data.name.trim()) errors.push('El nombre es obligatorio.');
  if (!LIABILITY_CATEGORIES.includes(data.category)) errors.push('Categoría de pasivo inválida.');
  if (!CURRENCIES.includes(data.currency)) errors.push('Moneda inválida.');
  if (typeof data.totalAmount !== 'number' || data.totalAmount < 0) errors.push('El monto total debe ser un número positivo.');
  if (typeof data.remainingAmount !== 'number' || data.remainingAmount < 0) errors.push('El saldo restante debe ser un número positivo.');
  if (data.remainingAmount > data.totalAmount) errors.push('El saldo restante no puede superar el monto total.');
  if (!data.startDate) errors.push('La fecha de inicio es obligatoria.');
  return errors;
}

// --- Cálculos de patrimonio ---
// ARS y USD nunca se mezclan. Se calculan por separado.

function sumByCurrency(items, currency, valueField) {
  return items
    .filter(item => item.currency === currency)
    .reduce((acc, item) => acc + (item[valueField] || 0), 0);
}

/**
 * Calcula totales de activos libres (excluye los vinculados a pasivos).
 * Un activo con linkedLiabilityId no se computa de forma aislada.
 */
function calcAssetTotals(assets) {
  const freeAssets = assets.filter(a => !a.linkedLiabilityId);
  return {
    ARS: sumByCurrency(freeAssets, 'ARS', 'value'),
    USD: sumByCurrency(freeAssets, 'USD', 'value'),
  };
}

function calcLiabilityTotals(liabilities) {
  return {
    ARS: sumByCurrency(liabilities, 'ARS', 'remainingAmount'),
    USD: sumByCurrency(liabilities, 'USD', 'remainingAmount'),
  };
}

/**
 * Retorna el patrimonio neto: totalActivos - totalPasivos, por moneda.
 */
function calcNetWorth(assets, liabilities) {
  const assetTotals = calcAssetTotals(assets);
  const liabilityTotals = calcLiabilityTotals(liabilities);
  return {
    ARS: assetTotals.ARS - liabilityTotals.ARS,
    USD: assetTotals.USD - liabilityTotals.USD,
    assetTotals,
    liabilityTotals,
  };
}

function buildSnapshot(assets, liabilities, notes = null) {
  const { assetTotals, liabilityTotals } = calcNetWorth(assets, liabilities);
  return createSnapshot({
    totalAssetsARS: assetTotals.ARS,
    totalAssetsUSD: assetTotals.USD,
    totalLiabilitiesARS: liabilityTotals.ARS,
    totalLiabilitiesUSD: liabilityTotals.USD,
    notes,
  });
}
