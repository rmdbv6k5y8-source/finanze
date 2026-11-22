// Archivio locale nel dispositivo (IndexedDB). Tutti i dati restano sul telefono / PC.
const NOME = 'finanze-papa', VERSIONE = 1, STORE = 'records';
let dbp;
function apri() {
  dbp ??= new Promise((ok, ko) => {
    const req = indexedDB.open(NOME, VERSIONE);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
    req.onsuccess = () => ok(req.result);
    req.onerror = () => ko(req.error);
  });
  return dbp;
}
async function tx(mode, fn) {
  const db = await apri();
  return new Promise((ok, ko) => {
    const t = db.transaction(STORE, mode);
    const res = fn(t.objectStore(STORE));
    t.oncomplete = () => ok(res?.result ?? res);
    t.onerror = () => ko(t.error);
    t.onabort = () => ko(t.error);
  });
}
export const tutti = () => tx('readonly', (s) => s.getAll());
export const salva = (recs) => tx('readwrite', (s) => { for (const r of [].concat(recs)) s.put(r); });
export const svuota = () => tx('readwrite', (s) => s.clear());
