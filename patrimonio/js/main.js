// main.js — Inicialización y coordinación. No implementa lógica propia.

// --- Renderizado completo ---

function refresh() {
  const assets = Assets.getAll();
  const liabilities = Liabilities.getAll();
  const snapshots = Snapshots.getAll();

  const netWorth = calcNetWorth(assets, liabilities);

  renderNetWorthSummary(netWorth);
  renderAssetList(assets, liabilities);
  renderLiabilityList(liabilities, assets);
  renderSnapshotList(snapshots);
  renderHistoryChart(snapshots);

  // Actualizar selects de vinculación
  populateLiabilitySelect(liabilities);
  populateAssetSelect(assets);
}

// --- Handlers de activos ---

function handleAssetSubmit(e) {
  e.preventDefault();
  const data = getAssetFormData();
  const errors = validateAsset(data);

  showErrors('asset-errors', errors);
  if (errors.length) return;

  const editId = e.target.dataset.editId;
  if (editId) {
    Assets.update(editId, data);
  } else {
    Assets.insert(createAsset(data));
  }

  clearAssetForm();
  closeModal('asset-modal');
  refresh();
}

function handleAssetEdit(id) {
  const asset = Assets.getById(id);
  if (!asset) return;
  fillAssetForm(asset);
  document.getElementById('asset-form').dataset.editId = id;
  document.getElementById('asset-modal-title').textContent = 'Editar activo';
  openModal('asset-modal');
}

function handleAssetDelete(id) {
  if (!confirm('¿Eliminar este activo?')) return;
  Assets.remove(id);
  refresh();
}

// --- Handlers de pasivos ---

function handleLiabilitySubmit(e) {
  e.preventDefault();
  const data = getLiabilityFormData();
  const errors = validateLiability(data);

  showErrors('liability-errors', errors);
  if (errors.length) return;

  const editId = e.target.dataset.editId;
  if (editId) {
    Liabilities.update(editId, data);
  } else {
    Liabilities.insert(createLiability(data));
  }

  clearLiabilityForm();
  closeModal('liability-modal');
  refresh();
}

function handleLiabilityEdit(id) {
  const liability = Liabilities.getById(id);
  if (!liability) return;
  fillLiabilityForm(liability);
  document.getElementById('liability-form').dataset.editId = id;
  document.getElementById('liability-modal-title').textContent = 'Editar pasivo';
  openModal('liability-modal');
}

function handleLiabilityDelete(id) {
  if (!confirm('¿Eliminar este pasivo?')) return;
  Liabilities.remove(id);
  refresh();
}

// --- Handlers de snapshots ---

function handleSnapshotSubmit(e) {
  e.preventDefault();
  const { notes } = getSnapshotFormData();
  const assets = Assets.getAll();
  const liabilities = Liabilities.getAll();
  const snapshot = buildSnapshot(assets, liabilities, notes);
  Snapshots.insert(snapshot);
  clearSnapshotForm();
  closeModal('snapshot-modal');
  refresh();
}

function handleSnapshotDelete(id) {
  if (!confirm('¿Eliminar este registro histórico?')) return;
  Snapshots.remove(id);
  refresh();
}

// --- Delegación de eventos en listas ---

function handleListClick(e) {
  const editBtn = e.target.closest('.btn-edit');
  const deleteBtn = e.target.closest('.btn-delete');

  if (editBtn) {
    const { type, id } = editBtn.dataset;
    if (type === 'asset') handleAssetEdit(id);
    if (type === 'liability') handleLiabilityEdit(id);
  }

  if (deleteBtn) {
    const { type, id } = deleteBtn.dataset;
    if (type === 'asset') handleAssetDelete(id);
    if (type === 'liability') handleLiabilityDelete(id);
    if (type === 'snapshot') handleSnapshotDelete(id);
  }
}

// --- Inicialización ---

document.addEventListener('DOMContentLoaded', () => {
  // Formularios
  document.getElementById('asset-form').addEventListener('submit', handleAssetSubmit);
  document.getElementById('liability-form').addEventListener('submit', handleLiabilitySubmit);
  document.getElementById('snapshot-form').addEventListener('submit', handleSnapshotSubmit);

  // Botones "Nuevo"
  document.getElementById('btn-new-asset').addEventListener('click', () => {
    clearAssetForm();
    document.getElementById('asset-modal-title').textContent = 'Nuevo activo';
    openModal('asset-modal');
  });

  document.getElementById('btn-new-liability').addEventListener('click', () => {
    clearLiabilityForm();
    document.getElementById('liability-modal-title').textContent = 'Nuevo pasivo';
    openModal('liability-modal');
  });

  document.getElementById('btn-new-snapshot').addEventListener('click', () => {
    clearSnapshotForm();
    openModal('snapshot-modal');
  });

  // Cierre de modales
  document.querySelectorAll('.modal-close, .btn-cancel').forEach(btn => {
    btn.addEventListener('click', closeAllModals);
  });

  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', e => {
      if (e.target === modal) closeAllModals();
    });
  });

  // Delegación en listas
  document.getElementById('asset-list').addEventListener('click', handleListClick);
  document.getElementById('liability-list').addEventListener('click', handleListClick);
  document.getElementById('snapshot-list').addEventListener('click', handleListClick);

  // Tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => setActiveTab(btn.dataset.tab));
  });

  // Render inicial
  refresh();
});
