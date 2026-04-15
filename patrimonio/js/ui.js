// ui.js — DOM, formularios y renderizado. Accede a datos siempre vía storage.js.

// --- Formateo ---

function formatCurrency(value, currency) {
  const formatted = value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${currency} ${formatted}`;
}

function formatDate(isoString) {
  if (!isoString) return '—';
  return isoString.slice(0, 10);
}

const CATEGORY_LABELS = {
  // Assets
  cash: 'Efectivo',
  investment: 'Inversión',
  real_estate: 'Inmueble',
  vehicle: 'Vehículo',
  other: 'Otro',
  // Liabilities
  mortgage: 'Hipoteca',
  loan: 'Préstamo',
  debt: 'Deuda',
};

function categoryLabel(cat) {
  return CATEGORY_LABELS[cat] || cat;
}

// --- Resumen de patrimonio neto ---

function renderNetWorthSummary(netWorth) {
  const el = document.getElementById('net-worth-summary');
  if (!el) return;

  const { ARS, USD, assetTotals, liabilityTotals } = netWorth;

  el.innerHTML = `
    <div class="summary-grid">
      <div class="summary-block">
        <h3>Activos libres</h3>
        <p>${formatCurrency(assetTotals.ARS, 'ARS')}</p>
        <p>${formatCurrency(assetTotals.USD, 'USD')}</p>
      </div>
      <div class="summary-block">
        <h3>Pasivos</h3>
        <p>${formatCurrency(liabilityTotals.ARS, 'ARS')}</p>
        <p>${formatCurrency(liabilityTotals.USD, 'USD')}</p>
      </div>
      <div class="summary-block summary-net">
        <h3>Patrimonio neto</h3>
        <p class="${ARS >= 0 ? 'positive' : 'negative'}">${formatCurrency(ARS, 'ARS')}</p>
        <p class="${USD >= 0 ? 'positive' : 'negative'}">${formatCurrency(USD, 'USD')}</p>
      </div>
    </div>
  `;
}

// --- Lista de activos ---

function renderAssetList(assets, liabilities) {
  const el = document.getElementById('asset-list');
  if (!el) return;

  if (!assets.length) {
    el.innerHTML = '<p class="empty-state">No hay activos registrados.</p>';
    return;
  }

  const liabilityMap = Object.fromEntries(liabilities.map(l => [l.id, l]));

  el.innerHTML = assets.map(asset => {
    const linked = asset.linkedLiabilityId ? liabilityMap[asset.linkedLiabilityId] : null;
    return `
      <div class="list-item" data-id="${asset.id}">
        <div class="item-main">
          <span class="item-name">${escapeHtml(asset.name)}</span>
          <span class="item-meta">${categoryLabel(asset.category)} · ${formatDate(asset.valuationDate)}</span>
          ${linked ? `<span class="item-linked">Vinculado a: ${escapeHtml(linked.name)}</span>` : ''}
          ${asset.notes ? `<span class="item-notes">${escapeHtml(asset.notes)}</span>` : ''}
        </div>
        <div class="item-value ${asset.linkedLiabilityId ? 'value-linked' : ''}">
          ${formatCurrency(asset.value, asset.currency)}
        </div>
        <div class="item-actions">
          <button class="btn-edit" data-type="asset" data-id="${asset.id}">Editar</button>
          <button class="btn-delete" data-type="asset" data-id="${asset.id}">Eliminar</button>
        </div>
      </div>
    `;
  }).join('');
}

// --- Lista de pasivos ---

function renderLiabilityList(liabilities, assets) {
  const el = document.getElementById('liability-list');
  if (!el) return;

  if (!liabilities.length) {
    el.innerHTML = '<p class="empty-state">No hay pasivos registrados.</p>';
    return;
  }

  const assetMap = Object.fromEntries(assets.map(a => [a.id, a]));

  el.innerHTML = liabilities.map(liability => {
    const linked = liability.linkedAssetId ? assetMap[liability.linkedAssetId] : null;
    const progress = liability.totalAmount > 0
      ? ((liability.totalAmount - liability.remainingAmount) / liability.totalAmount * 100).toFixed(1)
      : 0;
    return `
      <div class="list-item" data-id="${liability.id}">
        <div class="item-main">
          <span class="item-name">${escapeHtml(liability.name)}</span>
          <span class="item-meta">${categoryLabel(liability.category)} · desde ${formatDate(liability.startDate)}${liability.endDate ? ' hasta ' + formatDate(liability.endDate) : ''}</span>
          ${linked ? `<span class="item-linked">Vinculado a: ${escapeHtml(linked.name)}</span>` : ''}
          <span class="item-progress">Pagado: ${progress}%</span>
          ${liability.notes ? `<span class="item-notes">${escapeHtml(liability.notes)}</span>` : ''}
        </div>
        <div class="item-value negative">
          ${formatCurrency(liability.remainingAmount, liability.currency)}
          <small>de ${formatCurrency(liability.totalAmount, liability.currency)}</small>
        </div>
        <div class="item-actions">
          <button class="btn-edit" data-type="liability" data-id="${liability.id}">Editar</button>
          <button class="btn-delete" data-type="liability" data-id="${liability.id}">Eliminar</button>
        </div>
      </div>
    `;
  }).join('');
}

// --- Historial de snapshots ---

function renderSnapshotList(snapshots) {
  const el = document.getElementById('snapshot-list');
  if (!el) return;

  if (!snapshots.length) {
    el.innerHTML = '<p class="empty-state">No hay registros históricos.</p>';
    return;
  }

  const sorted = [...snapshots].sort((a, b) => b.date.localeCompare(a.date));

  el.innerHTML = sorted.map(snap => {
    const netARS = snap.totalAssetsARS - snap.totalLiabilitiesARS;
    const netUSD = snap.totalAssetsUSD - snap.totalLiabilitiesUSD;
    return `
      <div class="list-item snapshot-item" data-id="${snap.id}">
        <div class="item-main">
          <span class="item-name">${formatDate(snap.date)}</span>
          ${snap.notes ? `<span class="item-notes">${escapeHtml(snap.notes)}</span>` : ''}
        </div>
        <div class="snapshot-values">
          <span class="${netARS >= 0 ? 'positive' : 'negative'}">${formatCurrency(netARS, 'ARS')}</span>
          <span class="${netUSD >= 0 ? 'positive' : 'negative'}">${formatCurrency(netUSD, 'USD')}</span>
        </div>
        <div class="item-actions">
          <button class="btn-delete" data-type="snapshot" data-id="${snap.id}">Eliminar</button>
        </div>
      </div>
    `;
  }).join('');
}

// --- Gráfico histórico ---

let chartInstance = null;

function renderHistoryChart(snapshots) {
  const canvas = document.getElementById('history-chart');
  if (!canvas || !window.Chart) return;

  const sorted = [...snapshots].sort((a, b) => a.date.localeCompare(b.date));
  const labels = sorted.map(s => formatDate(s.date));
  const netARS = sorted.map(s => s.totalAssetsARS - s.totalLiabilitiesARS);
  const netUSD = sorted.map(s => s.totalAssetsUSD - s.totalLiabilitiesUSD);

  if (chartInstance) chartInstance.destroy();

  chartInstance = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Patrimonio neto ARS',
          data: netARS,
          borderColor: '#2563eb',
          backgroundColor: 'transparent',
          tension: 0.2,
        },
        {
          label: 'Patrimonio neto USD',
          data: netUSD,
          borderColor: '#16a34a',
          backgroundColor: 'transparent',
          tension: 0.2,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'top' } },
      scales: {
        y: { beginAtZero: false },
      },
    },
  });
}

// --- Modal genérico ---

function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('modal-open');
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('modal-open');
}

function closeAllModals() {
  document.querySelectorAll('.modal').forEach(m => m.classList.remove('modal-open'));
}

// --- Formulario de activo ---

function getAssetFormData() {
  return {
    name: document.getElementById('asset-name').value.trim(),
    category: document.getElementById('asset-category').value,
    currency: document.getElementById('asset-currency').value,
    value: parseFloat(document.getElementById('asset-value').value),
    valuationDate: document.getElementById('asset-valuation-date').value,
    notes: document.getElementById('asset-notes').value.trim() || null,
    linkedLiabilityId: document.getElementById('asset-linked-liability').value || null,
  };
}

function fillAssetForm(asset) {
  document.getElementById('asset-name').value = asset.name;
  document.getElementById('asset-category').value = asset.category;
  document.getElementById('asset-currency').value = asset.currency;
  document.getElementById('asset-value').value = asset.value;
  document.getElementById('asset-valuation-date').value = asset.valuationDate.slice(0, 10);
  document.getElementById('asset-notes').value = asset.notes || '';
  document.getElementById('asset-linked-liability').value = asset.linkedLiabilityId || '';
}

function clearAssetForm() {
  document.getElementById('asset-form').reset();
  document.getElementById('asset-form').removeAttribute('data-edit-id');
}

function populateLiabilitySelect(liabilities) {
  const select = document.getElementById('asset-linked-liability');
  if (!select) return;
  select.innerHTML = '<option value="">— ninguno —</option>' +
    liabilities.map(l => `<option value="${l.id}">${escapeHtml(l.name)} (${l.currency})</option>`).join('');
}

// --- Formulario de pasivo ---

function getLiabilityFormData() {
  return {
    name: document.getElementById('liability-name').value.trim(),
    category: document.getElementById('liability-category').value,
    currency: document.getElementById('liability-currency').value,
    totalAmount: parseFloat(document.getElementById('liability-total').value),
    remainingAmount: parseFloat(document.getElementById('liability-remaining').value),
    startDate: document.getElementById('liability-start-date').value,
    endDate: document.getElementById('liability-end-date').value || null,
    linkedAssetId: document.getElementById('liability-linked-asset').value || null,
    notes: document.getElementById('liability-notes').value.trim() || null,
  };
}

function fillLiabilityForm(liability) {
  document.getElementById('liability-name').value = liability.name;
  document.getElementById('liability-category').value = liability.category;
  document.getElementById('liability-currency').value = liability.currency;
  document.getElementById('liability-total').value = liability.totalAmount;
  document.getElementById('liability-remaining').value = liability.remainingAmount;
  document.getElementById('liability-start-date').value = liability.startDate.slice(0, 10);
  document.getElementById('liability-end-date').value = liability.endDate ? liability.endDate.slice(0, 10) : '';
  document.getElementById('liability-linked-asset').value = liability.linkedAssetId || '';
  document.getElementById('liability-notes').value = liability.notes || '';
}

function clearLiabilityForm() {
  document.getElementById('liability-form').reset();
  document.getElementById('liability-form').removeAttribute('data-edit-id');
}

function populateAssetSelect(assets) {
  const select = document.getElementById('liability-linked-asset');
  if (!select) return;
  select.innerHTML = '<option value="">— ninguno —</option>' +
    assets.map(a => `<option value="${a.id}">${escapeHtml(a.name)} (${a.currency})</option>`).join('');
}

// --- Formulario de snapshot ---

function getSnapshotFormData() {
  return {
    notes: document.getElementById('snapshot-notes').value.trim() || null,
  };
}

function clearSnapshotForm() {
  document.getElementById('snapshot-form').reset();
}

// --- Mensajes de error ---

function showErrors(containerId, errors) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (!errors.length) { el.innerHTML = ''; return; }
  el.innerHTML = '<ul>' + errors.map(e => `<li>${escapeHtml(e)}</li>`).join('') + '</ul>';
}

// --- Utilidades ---

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function setActiveTab(tabId) {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });
  document.querySelectorAll('.tab-panel').forEach(panel => {
    panel.classList.toggle('active', panel.id === tabId);
  });
}
