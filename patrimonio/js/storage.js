// storage.js — CRUD sobre localStorage. No conoce el modelo de negocio.

const KEYS = {
  assets: 'patrimonio:assets',
  liabilities: 'patrimonio:liabilities',
  snapshots: 'patrimonio:snapshots',
};

function readAll(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch {
    return [];
  }
}

function writeAll(key, items) {
  localStorage.setItem(key, JSON.stringify(items));
}

function getById(key, id) {
  return readAll(key).find(item => item.id === id) || null;
}

function insert(key, item) {
  const items = readAll(key);
  items.push(item);
  writeAll(key, items);
}

function update(key, id, changes) {
  const items = readAll(key).map(item =>
    item.id === id ? { ...item, ...changes } : item
  );
  writeAll(key, items);
}

function remove(key, id) {
  const items = readAll(key).filter(item => item.id !== id);
  writeAll(key, items);
}

// Assets
const Assets = {
  getAll: () => readAll(KEYS.assets),
  getById: (id) => getById(KEYS.assets, id),
  insert: (asset) => insert(KEYS.assets, asset),
  update: (id, changes) => update(KEYS.assets, id, changes),
  remove: (id) => remove(KEYS.assets, id),
};

// Liabilities
const Liabilities = {
  getAll: () => readAll(KEYS.liabilities),
  getById: (id) => getById(KEYS.liabilities, id),
  insert: (liability) => insert(KEYS.liabilities, liability),
  update: (id, changes) => update(KEYS.liabilities, id, changes),
  remove: (id) => remove(KEYS.liabilities, id),
};

// Snapshots
const Snapshots = {
  getAll: () => readAll(KEYS.snapshots),
  getById: (id) => getById(KEYS.snapshots, id),
  insert: (snapshot) => insert(KEYS.snapshots, snapshot),
  update: (id, changes) => update(KEYS.snapshots, id, changes),
  remove: (id) => remove(KEYS.snapshots, id),
};
