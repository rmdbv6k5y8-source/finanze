// Stato dell'app in memoria + salvataggio. Le cancellazioni lasciano un "segnaposto"
// (deleted: true) così la sincronizzazione tra dispositivi sa che il movimento è stato tolto.
import * as db from './db.js';
import { CATEGORIE_BASE } from './categorie.js';
import { uid, meseDi } from './util.js';
import { unisci } from './calc.js';

const stato = { records: new Map() };
const ascoltatori = new Set();
export const onCambio = (fn) => ascoltatori.add(fn);
const avvisa = () => ascoltatori.forEach((fn) => fn());
const adesso = () => new Date().toISOString();

export async function carica() {
  for (const r of await db.tutti()) stato.records.set(r.id, r);
  // categorie mancanti (prima apertura o nuove categorie base)
  const nuove = CATEGORIE_BASE.filter((c) => !stato.records.has('cat-' + c.codice))
    .map((c, i) => ({ id: 'cat-' + c.codice, t: 'cat', ordine: i, budget: 0, ...c, updatedAt: '2000-01-01T00:00:00Z' }));
  if (nuove.length) await salvaRecord(nuove, false);
}

const vivi = (t) => [...stato.records.values()].filter((r) => r.t === t && !r.deleted);
export const movimenti = () => vivi('tx');
export const categorie = () => vivi('cat').sort((a, b) => a.ordine - b.ordine);
export const categoria = (codice) => stato.records.get('cat-' + codice) || { codice, nome: codice, icona: '•', colore: '#888' };
export const ricorrenti = () => vivi('ric');
export const retribuzione = (mese) => { const r = stato.records.get('ret-' + mese); return r && !r.deleted ? r.importo : null; };
export const impostazioni = () => ({ soglia: 29, contanteIniziale: 0, ultimoBackup: null, ...stato.records.get('impostazioni') });
export const mesiConDati = () => [...new Set(movimenti().map((t) => t.mese))].sort();

async function salvaRecord(recs, aggiornaData = true) {
  recs = [].concat(recs);
  for (const r of recs) { if (aggiornaData) r.updatedAt = adesso(); stato.records.set(r.id, r); }
  await db.salva(recs);
  avvisa();
}

export function salvaMovimento(dati) {
  const r = { t: 'tx', tag: [], note: '', createdAt: adesso(), ...stato.records.get(dati.id), ...dati };
  r.id ||= uid();
  r.mese ||= meseDi(r.data);
  return salvaRecord(r).then(() => r);
}
export const elimina = (id) => salvaRecord({ ...stato.records.get(id), deleted: true });
export const ripristina = (rec) => salvaRecord({ ...rec, deleted: false });
export const salvaRetribuzione = (mese, importo) =>
  salvaRecord(importo == null || isNaN(importo) ? { id: 'ret-' + mese, t: 'entrata', mese, deleted: true } : { id: 'ret-' + mese, t: 'entrata', mese, importo });
export const salvaCategoria = (c) => salvaRecord({ ...c, id: 'cat-' + c.codice, t: 'cat' });
export const salvaRicorrente = (r) => salvaRecord({ t: 'ric', attiva: true, ...r, id: r.id || uid() });
export const salvaImpostazioni = (p) => salvaRecord({ ...impostazioni(), ...p, id: 'impostazioni', t: 'imp' });

/** Backup completo (anche i segnaposto delle cancellazioni, servono alla sincronizzazione). */
export const esporta = () => ({ app: 'finanze', versione: 1, esportato: adesso(), records: [...stato.records.values()] });

export async function importa(json) {
  if (json?.app !== 'finanze' || !Array.isArray(json.records)) throw new Error('Questo file non è un backup dell\'app Finanze.');
  const { records, nuovi, aggiornati } = unisci([...stato.records.values()], json.records.filter((r) => r && r.id && r.t));
  const cambiati = records.filter((r) => stato.records.get(r.id) !== r);
  for (const r of cambiati) stato.records.set(r.id, r);
  await db.salva(cambiati);
  avvisa();
  return { nuovi, aggiornati };
}
export async function cancellaTutto() { await db.svuota(); stato.records.clear(); await carica(); avvisa(); }
