// Import dall'Excel di papà (un foglio per mese, es. "GEN_26") ed export nello stesso formato.
// Funzioni pure rispetto al DOM: ricevono la libreria XLSX, così si possono testare con Node.

const MESI = { GEN: 1, FEB: 2, MAR: 3, APR: 4, MAG: 5, GIU: 6, LUG: 7, AGO: 8, SET: 9, OTT: 10, NOV: 11, DIC: 12 };
const SIGLE = Object.keys(MESI);
// colori delle righe nella legenda dell'Excel
const COLORI = { FFFF00: 'impr', FF0000: 'vac', FF3333: 'vac', '00FF00': 'rimb', '48FC24': 'rimb' };

const colore = (c) => (c?.s?.patternType === 'solid' && c.s.fgColor?.rgb ? c.s.fgColor.rgb.slice(-6).toUpperCase() : null);
const iso = (y, m, d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

/** Numero seriale Excel -> 'YYYY-MM-DD' (senza fusi orari). */
function daSeriale(n) {
  const d = new Date(Date.UTC(1899, 11, 30) + Math.floor(n + 1e-6) * 864e5);
  return iso(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

/**
 * @param {any} XLSX libreria SheetJS
 * @param {ArrayBuffer|Uint8Array} dati contenuto del file .xlsx
 * @returns {{records: object[], mesi: string[], saltate: string[]}}
 */
export function leggiExcel(XLSX, dati, adesso = new Date().toISOString()) {
  const wb = XLSX.read(dati, { type: 'array', cellStyles: true });
  const records = [], mesi = [], saltate = [];
  for (const nome of wb.SheetNames) {
    const m = /^([A-Z]{3})_(\d{2})$/.exec(nome.trim().toUpperCase());
    if (!m || !MESI[m[1]]) continue;
    const anno = 2000 + +m[2], meseN = MESI[m[1]], mese = iso(anno, meseN, 1).slice(0, 7);
    const ws = wb.Sheets[nome];
    const fine = XLSX.utils.decode_range(ws['!ref'] || 'A1').e.r;
    const cella = (col, r) => ws[`${col}${r}`];
    const val = (col, r) => cella(col, r)?.v;
    let n = 0;
    const visti = new Map();
    for (let r = 8; r <= fine + 1; r++) {
      const [a, b, c, d, e, f, g] = ['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((k) => val(k, r));
      if (typeof c === 'string' && /retribuzione/i.test(c)) {
        if (typeof d === 'number') records.push({ id: `ret-${mese}`, t: 'entrata', mese, importo: d, updatedAt: adesso });
        continue;
      }
      if (!b || (typeof d !== 'number' && typeof e !== 'number')) continue;
      let data = null;
      if (typeof a === 'number') data = daSeriale(a);
      else {
        const x = /^(\d{1,2})\D/.exec(String(a ?? '')); // es. "21/1126" scritto male
        if (x) data = iso(anno, meseN, +x[1]);
      }
      if (!data) { saltate.push(`${nome} riga ${r}: ${b}`); continue; }
      const diretta = typeof d === 'number';
      const tag = new Set();
      for (const k of ['B', 'D', 'E']) { const t = COLORI[colore(cella(k, r))]; if (t) tag.add(t); }
      if (/unica|carta (di )?credito/i.test(String(c ?? ''))) tag.add('carta');
      // id stabile: reimportare lo stesso file non crea doppioni
      const imp = Math.round((diretta ? d : e) * 100) / 100;
      const chiave = `${data}|${String(b).trim()}|${String(c ?? '').trim()}|${imp}|${diretta ? 'D' : 'C'}`;
      const volta = (visti.get(chiave) || 0) + 1;
      visti.set(chiave, volta);
      records.push({
        id: `xl-${mese}-${hash(chiave)}-${volta}`, t: 'tx', data, mese, motivo: String(b).trim(), luogo: String(c ?? '').trim(),
        importo: imp, metodo: diretta ? 'D' : 'C',
        cat: String(f || 'Vari').trim(), note: String(g ?? '').trim(), tag: [...tag].sort(),
        createdAt: adesso, updatedAt: adesso, origine: `excel:${nome}`,
      });
      n++;
    }
    if (n) mesi.push(mese);
  }
  return { records, mesi, saltate };
}

/** Crea un file .xlsx con un foglio per mese, colonne come l'originale, più il foglio "Risparmio". */
export function scriviExcel(XLSX, movimenti, retribuzione, anno) {
  const wb = XLSX.utils.book_new();
  const risparmio = [['MESE', 'RETRIBUZIONE', 'USCITE DIRETTE', 'CONTANTE', 'RISPARMIO']];
  for (let i = 1; i <= 12; i++) {
    const mese = iso(anno, i, 1).slice(0, 7);
    const righe = movimenti.filter((t) => t.mese === mese).sort((x, y) => x.data.localeCompare(y.data));
    if (!righe.length) continue;
    // stesso schema dell'originale: legenda (righe 1-5), titolo (6), intestazioni (7), movimenti da riga 8
    const aoa = [
      ['Legenda: Carb = carburante - Cola = colazione - Boll = bolletta - Prel = prelievo bancomat - Rica = ricarica prepagata - Rega = regalo'],
      ['Spes = spesa - Siga = sigarette - Vari = varie - Rist = ristorazione - Impr = imprevisto - Rata = rateizzazione pagamento'],
      ['Abbi = abbigliamento - Tass = tasse - Assi = assicurazione veicoli - Sogg = Soggiorno - Park = parcheggio - Gior = giornali/riviste'],
      ['Manu = Manutenzione mezzi - Cell = ricarica cellulare - Govi = ricarica chiavetta caffè - Medi = spese mediche/medicinali'],
      ['EVIDENZA: impr = spesa imprevista - vac = vacanza estiva - rimb = rimborso - carta = carta di credito'],
      [`${['GENNAIO', 'FEBBRAIO', 'MARZO', 'APRILE', 'MAGGIO', 'GIUGNO', 'LUGLIO', 'AGOSTO', 'SETTEMBRE', 'OTTOBRE', 'NOVEMBRE', 'DICEMBRE'][i - 1]} ${anno}`],
      ['DATA', 'MOTIVO', 'LUOGO', 'SPESA (€) Diretta', 'SPESA (€) Contante*', 'Causa Pagam.', 'NOTE', 'EVIDENZA']];
    let dir = 0, con = 0;
    for (const t of righe) {
      const [y, m, d] = t.data.split('-').map(Number);
      aoa.push([new Date(Date.UTC(y, m - 1, d, 12)), t.motivo, t.luogo, t.metodo === 'D' ? t.importo : null, t.metodo === 'C' ? t.importo : null, t.cat, t.note, (t.tag || []).join(', ')]);
      if (t.metodo === 'D') dir += t.importo; else con += t.importo;
    }
    const ret = retribuzione(mese);
    aoa.push([], [null, null, 'TOTALE MESE =', round(dir), round(con)], [], [null, null, 'retribuzione mese precedente', ret ?? ''],
      [null, null, 'prelievi / spese mese corrente', round(dir)], [null, null, 'RESIDUO', ret == null ? '' : round(ret - dir)]);
    risparmio.push([mese, ret ?? '', round(dir), round(con), ret == null ? '' : round(ret - dir)]);
    const ws = XLSX.utils.aoa_to_sheet(aoa, { cellDates: true, dateNF: 'dd/mm/yyyy' });
    ws['!cols'] = [{ wch: 11 }, { wch: 38 }, { wch: 32 }, { wch: 12 }, { wch: 12 }, { wch: 8 }, { wch: 50 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, ws, `${SIGLE[i - 1]}_${String(anno).slice(2)}`);
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(risparmio), `Risparmio ${String(anno).slice(2)}`);
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
}
const round = (n) => Math.round(n * 100) / 100;
function hash(s) {
  let x = 2166136261;
  for (let i = 0; i < s.length; i++) x = Math.imul(x ^ s.charCodeAt(i), 16777619);
  return (x >>> 0).toString(36);
}
