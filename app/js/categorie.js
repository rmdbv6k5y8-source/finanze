// Le categorie sono i codici della legenda dell'Excel di papà.
// "giroconto": soldi spostati verso contanti o prepagata, non una spesa vera.
export const CATEGORIE_BASE = [
  { codice: 'Spes', nome: 'Spesa', icona: '🛒', colore: '#2f9e44' },
  { codice: 'Cola', nome: 'Colazione', icona: '🥐', colore: '#e8590c' },
  { codice: 'Rist', nome: 'Ristorazione', icona: '🍽️', colore: '#f08c00' },
  { codice: 'Govi', nome: 'Chiavetta caffè', icona: '☕', colore: '#a0522d' },
  { codice: 'Carb', nome: 'Carburante', icona: '⛽', colore: '#c92a2a' },
  { codice: 'Manu', nome: 'Manutenzione', icona: '🔧', colore: '#5c7cfa' },
  { codice: 'Boll', nome: 'Bollette', icona: '💡', colore: '#fab005' },
  { codice: 'Tass', nome: 'Tasse', icona: '🧾', colore: '#868e96' },
  { codice: 'Assi', nome: 'Assicurazione veicoli', icona: '🛡️', colore: '#1971c2' },
  { codice: 'Medi', nome: 'Spese mediche', icona: '💊', colore: '#e64980' },
  { codice: 'Abbi', nome: 'Abbigliamento', icona: '👕', colore: '#7048e8' },
  { codice: 'Rega', nome: 'Regali', icona: '🎁', colore: '#d6336c' },
  { codice: 'Siga', nome: 'Sigarette', icona: '🚬', colore: '#495057' },
  { codice: 'Gior', nome: 'Giornali e riviste', icona: '📰', colore: '#0c8599' },
  { codice: 'Cell', nome: 'Ricarica cellulare', icona: '📱', colore: '#1098ad' },
  { codice: 'Park', nome: 'Parcheggio', icona: '🅿️', colore: '#3b5bdb' },
  { codice: 'Sogg', nome: 'Soggiorno', icona: '🏨', colore: '#099268' },
  { codice: 'Rata', nome: 'Rateizzazione', icona: '📅', colore: '#9c36b5' },
  { codice: 'Impr', nome: 'Imprevisto', icona: '⚠️', colore: '#f59f00' },
  { codice: 'Vari', nome: 'Varie', icona: '📦', colore: '#748ffc' },
  { codice: 'Prel', nome: 'Prelievo bancomat', icona: '🏧', colore: '#66a80f', giroconto: true },
  { codice: 'Rica', nome: 'Ricarica prepagata', icona: '💳', colore: '#40c057', giroconto: true },
];

export const TAG = {
  impr: { nome: 'Spesa imprevista', breve: 'Imprevisto', classe: 'tag-impr' },
  vac: { nome: 'Vacanza estiva', breve: 'Vacanza', classe: 'tag-vac' },
  rimb: { nome: 'Rimborso / Compro Oro', breve: 'Rimborso', classe: 'tag-rimb' },
  carta: { nome: 'Carta di credito (addebito il mese dopo)', breve: 'Carta', classe: 'tag-carta' },
};
