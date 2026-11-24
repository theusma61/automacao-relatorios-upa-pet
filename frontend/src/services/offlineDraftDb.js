// Persistência local (IndexedDB) de capturas de ultrassom pendentes por aba.
// Roda 100% no navegador (0 MB na VPS) para proteger fotos em conexões 4G instáveis ou recargas no celular.

const DB_NAME = 'vetaro_offline_drafts';
const DB_VERSION = 1;
const STORE_NAME = 'ultrasound_files';

function openDraftDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return resolve(null);
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function salvarFotosRascunho(tabKey, files) {
  try {
    const db = await openDraftDb();
    if (!db) return;
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      if (!Array.isArray(files) || files.length === 0) {
        store.delete(tabKey);
      } else {
        const serialized = files.map((f) => ({
          name: f.name || 'captura.jpg',
          type: f.type || 'image/jpeg',
          lastModified: f.lastModified || Date.now(),
          blob: f
        }));
        store.put({ updatedAt: Date.now(), files: serialized }, tabKey);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch (_) {}
}

export async function carregarFotosRascunho(tabKey) {
  try {
    const db = await openDraftDb();
    if (!db) return [];
    const record = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(tabKey);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    if (!record || !Array.isArray(record.files)) return [];
    // Expira rascunhos locais após 48h para não acumular espaço no celular
    if (record.updatedAt && Date.now() - record.updatedAt > 48 * 60 * 60 * 1000) {
      limparFotosRascunho(tabKey);
      return [];
    }
    return record.files
      .filter((item) => item && item.blob)
      .map((item) =>
        item.blob instanceof File
          ? item.blob
          : new File([item.blob], item.name || 'captura.jpg', {
              type: item.type || 'image/jpeg',
              lastModified: item.lastModified || Date.now()
            })
      );
  } catch (_) {
    return [];
  }
}

export async function limparFotosRascunho(tabKey) {
  try {
    const db = await openDraftDb();
    if (!db) return;
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(tabKey);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch (_) {}
}
