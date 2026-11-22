// Calcoli puri (nessun DOM): riproducono i totali dell'Excel e aggiungono le analisi.
import { round2, norm } from './util.js';

const GIRO = new Set(['Prel', 'Rica']);
export const isGiroconto = (tx) => GIRO.has(tx.cat);

/**
 * Riepilogo di un mese come in fondo a ogni foglio Excel:
 * diretta = colonna "SPESA Diretta" (conto/carta, prelievi compresi)
 * contante = colonna "SPESA Contante*" (contanti e prepagata)
 * residuo = retribuzione - diretta  (riga "RESIDUO", foglio "Risparmio")
 */
export function riepilogoMese(txs, mese, retribuzione) {
  let diretta = 0, contante = 0, spese = 0, entrateExtra = 0, giroconti = 0;
  for (const t of txs) {
    if (t.mese !== mese) continue;
    if (t.metodo === 'C') contante += t.importo; else diretta += t.importo;
    if (isGiroconto(t)) giroconti += t.importo;
    else if (t.importo < 0) entrateExtra -= t.importo;
    else spese += t.importo;
  }
  const r = { mese, diretta: round2(diretta), contante: round2(contante), spese: round2(spese), entrateExtra: round2(entrateExtra), giroconti: round2(giroconti) };
  r.retribuzione = retribuzione ?? null;
  r.residuo = retribuzione == null ? null : round2(retribuzione - diretta);
  return r;
}

/** Spese per categoria (giroconti esclusi, rimborsi sottratti). */
export function perCategoria(txs, filtro = () => true) {
  const m = new Map();
  for (const t of txs) {
    if (isGiroconto(t) || !filtro(t)) continue;
    m.set(t.cat, round2((m.get(t.cat) || 0) + t.importo));
  }
  return [...m.entries()].map(([cat, totale]) => ({ cat, totale })).sort((a, b) => b.totale - a.totale);
}

/** Contanti + prepagata stimati: soldi prelevati/caricati meno spese in contante. */
export function contanteDisponibile(txs, iniziale = 0) {
  let s = iniziale;
  for (const t of txs) {
    if (t.metodo !== 'C' && isGiroconto(t)) s += t.importo;
    if (t.metodo === 'C') s -= t.importo;
  }
  return round2(s);
}

/** Movimenti abituali (stesso motivo+luogo) ordinati per frequenza recente: diventano i pulsanti "rapidi". */
export function abituali(txs, n = 8) {
  const m = new Map();
  const recenti = [...txs].sort((a, b) => b.data.localeCompare(a.data)).slice(0, 400);
  for (const t of recenti) {
    if (t.importo <= 0) continue;
    const k = norm(t.motivo) + '|' + norm(t.luogo);
    const e = m.get(k);
    if (e) e.volte++;
    else m.set(k, { volte: 1, modello: t });
  }
  return [...m.values()].filter((e) => e.volte >= 3).sort((a, b) => b.volte - a.volte).slice(0, n).map((e) => e.modello);
}

/** Suggerimenti di completamento per il campo motivo o luogo, dal più usato. */
export function suggerimenti(txs, campo, testo, n = 6) {
  const q = norm(testo);
  if (q.length < 2) return [];
  const m = new Map();
  for (const t of txs) {
    const v = t[campo];
    if (!v || !norm(v).includes(q)) continue;
    const k = norm(v);
    const e = m.get(k);
    if (e) { e.volte++; if (t.data > e.ultimo.data) e.ultimo = t; } else m.set(k, { valore: v, volte: 1, ultimo: t });
  }
  return [...m.values()].sort((a, b) => (norm(b.valore).startsWith(q) - norm(a.valore).startsWith(q)) || b.volte - a.volte).slice(0, n);
}

const VEICOLI = [[/fiat\s*500\s*1[.,]2/i, 'Fiat 500 1.2'], [/fiat\s*500/i, 'Fiat 500'], [/jeep|renegade/i, 'Jeep Renegade'], [/v-?strom|suzuki/i, 'Suzuki V-Strom'], [/corsa|opel/i, 'Opel Corsa']];
export const veicolo = (testo) => (VEICOLI.find(([re]) => re.test(testo)) || [, 'Altro'])[1];

/** Dati carburante dalle note tipo "Gasolio 1,689€/L - 23,68L". */
export function rifornimenti(txs) {
  const out = [];
  for (const t of txs) {
    if (t.cat !== 'Carb') continue;
    const m = /(gasolio|benzina|diesel|gpl|metano)\s*([\d.,]+)\s*€\s*\/\s*l/i.exec(t.note || '');
    if (!m) continue;
    const litri = /([\d.,]+)\s*l\b(?!\s*\/)/i.exec((t.note || '').slice(m.index + m[0].length));
    out.push({ data: t.data, tipo: m[1].toLowerCase(), prezzo: parseFloat(m[2].replace(',', '.')), litri: litri ? parseFloat(litri[1].replace(',', '.')) : null, importo: t.importo, veicolo: veicolo(t.motivo) });
  }
  return out.sort((a, b) => a.data.localeCompare(b.data));
}

/** Data della prossima scadenza di una ricorrenza a partire da 'dopo' (ISO). */
export function prossimaData(ric, dopo) {
  const passo = { mensile: 1, bimestrale: 2, trimestrale: 3, semestrale: 6, annuale: 12 }[ric.frequenza] || 1;
  let [y, m] = ric.inizio.split('-').map(Number);
  const giorno = ric.giorno;
  for (let i = 0; i < 1000; i++) {
    const ultimo = new Date(y, m, 0).getDate();
    const iso = `${y}-${String(m).padStart(2, '0')}-${String(Math.min(giorno, ultimo)).padStart(2, '0')}`;
    if (iso >= dopo) return iso;
    m += passo; while (m > 12) { m -= 12; y++; }
  }
  return null;
}

/** Ricorrenze attive con la loro prossima data, ordinate. */
export function scadenze(ricorrenti, oggiIso) {
  return ricorrenti
    .filter((r) => r.attiva !== false && !(r.rateTotali && (r.rateFatte || 0) >= r.rateTotali))
    .map((r) => ({ ric: r, data: prossimaData(r, r.ultimaRegistrata ? giornoDopo(r.ultimaRegistrata) : r.inizio) }))
    .filter((x) => x.data)
    .sort((a, b) => a.data.localeCompare(b.data))
    .map((x) => ({ ...x, scaduta: x.data <= oggiIso }));
}
function giornoDopo(iso) {
  const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Unisce due insiemi di record (sincronizzazione tra iPhone e PC): vince la modifica più recente. */
export function unisci(locali, importati) {
  const map = new Map(locali.map((r) => [r.id, r]));
  let nuovi = 0, aggiornati = 0;
  for (const r of importati) {
    const l = map.get(r.id);
    if (!l) { map.set(r.id, r); nuovi++; }
    else if ((r.updatedAt || '') > (l.updatedAt || '')) { map.set(r.id, r); aggiornati++; }
  }
  return { records: [...map.values()], nuovi, aggiornati };
}
