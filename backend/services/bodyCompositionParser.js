'use strict';

const pdfParse = require('pdf-parse');

const VALUTAZIONI = [
  'Eccellente', 'Sopra la Media', 'Standard', 'Sotto la Media',
  'Alta', 'Bassa', 'Normale', 'Sovrappeso', 'Sottopeso', 'Gravemente sovrappeso',
];
const VAL_RE = VALUTAZIONI.join('|');

// ── helpers ──────────────────────────────────────────────────────────────────

function grabFloat(text, label) {
  const esc = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = text.match(new RegExp(esc + '[\\s:]*([+-]?[\\d]+(?:[.,][\\d]+)?)'));
  return m ? parseFloat(m[1].replace(',', '.')) : null;
}

// Normalize common OCR artifacts before parsing
function normalizeOcrText(text) {
  return text
    // "Acquacorporea" → "Acqua corporea"
    .replace(/Acqua\s*corporea/gi, 'Acqua corporea')
    // "Percentuale Grasso Corporeo(%)" → "Percentuale Grasso Corporeo"
    .replace(/Percentuale\s+Grasso\s+Corporeo\s*\([^)]*\)/gi, 'Percentuale Grasso Corporeo')
    // comma decimal in percentages: "9,8" → "9.8"
    .replace(/(\d),(\d)/g, '$1.$2')
    // OCR sometimes reads "/" as decimal: "23/4" when it's 23.4 — handle in context
    // "Rapporto Vita-Fianchi" variants
    .replace(/Rapporto\s+Vita\s*[-–]\s*Fianchi/gi, 'Rapporto Vita-Fianchi');
}

// ── header ───────────────────────────────────────────────────────────────────

function parseHeader(text) {
  const id       = (text.match(/ID\s*:\s*(\S+)/)           || [])[1] || null;
  const genere   = (text.match(/Genere\s*:\s*(\S+)/)        || [])[1] || null;
  const eta      = (text.match(/Et[àa]\s*:\s*(\d+)/)        || [])[1];
  const altezza  = (text.match(/Altezza\s*:\s*(\d+)\s*cm/i) || [])[1];

  // "Orario della misurazione: Jul 02, 2026 09:13:35"
  // or plain date "07/02/2026" / "Jul 02, 2026"
  let dataRilevazione = null;
  const orarioM = text.match(/Orario\s+della\s+misurazione\s*:\s*([^\n]{6,30})/i);
  if (orarioM) {
    dataRilevazione = orarioM[1].trim();
  } else {
    const dateM = text.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\w{3}\s+\d{1,2},?\s+\d{4})/);
    if (dateM) dataRilevazione = dateM[1];
  }

  return {
    id: id || null,
    genere: genere || null,
    eta: eta ? parseInt(eta) : null,
    altezzaCm: altezza ? parseInt(altezza) : null,
    dataRilevazione,
  };
}

// ── body composition table ────────────────────────────────────────────────────

function parseCompositionRow(text, rowName) {
  const esc = rowName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // "Peso 79.22 (63.3-85.7) 100.0 Standard"
  const m = text.match(
    new RegExp(esc + '\\s+([\\d.]+)\\s*\\([\\d.\\-~]+\\)\\s+([\\d.]+)\\s+(' + VAL_RE + ')')
  );
  if (m) return { value: parseFloat(m[1]), percent: parseFloat(m[2]), valutazione: m[3] };
  // fallback without range
  const m2 = text.match(
    new RegExp(esc + '\\s+([\\d.]+)\\s+([\\d.]+)\\s+(' + VAL_RE + ')')
  );
  if (m2) return { value: parseFloat(m2[1]), percent: parseFloat(m2[2]), valutazione: m2[3] };
  return null;
}

const COMPOSITION_ROW_NAMES = [
  'Peso', 'Grasso corporeo', 'Minerali', 'Proteine',
  'Acqua corporea', 'Muscoloso', 'Muscolo scheletrico',
];

function parseBodyComposition(text) {
  const result = {};
  for (const row of COMPOSITION_ROW_NAMES) {
    result[row] = parseCompositionRow(text, row);
  }
  return result;
}

// ── body score ────────────────────────────────────────────────────────────────

function parseBodyScore(text) {
  // "84 /100Punti" or "84/100 Punt" or "84 / 100 Punt"
  const m = text.match(/(\d{1,3})\s*\/\s*100\s*Punt/i);
  return m ? parseInt(m[1]) : null;
}

// ── weight control ────────────────────────────────────────────────────────────

function parseWeightControl(text) {
  const pesoObj   = (text.match(/Peso\s+obiettivo\s+consigliato\s+([\d.]+)/) || [])[1];
  const ctrlPeso  = (text.match(/Controllo\s+Peso\s+([+-]?[\d.]+)/)           || [])[1];
  const ctrlGrasso= (text.match(/Controllo\s+Grasso\s+([+-]?[\d.]+)/)         || [])[1];
  const ctrlMuscoli=(text.match(/Controllo\s+Muscoli\s+([+-]?[\d.]+)/)         || [])[1];
  return {
    pesoObiettivo:    pesoObj    ? parseFloat(pesoObj)    : null,
    controlloPeso:    ctrlPeso   ? parseFloat(ctrlPeso)   : null,
    controlloGrasso:  ctrlGrasso ? parseFloat(ctrlGrasso) : null,
    controlloMuscoli: ctrlMuscoli? parseFloat(ctrlMuscoli): null,
  };
}

// ── obesity evaluation ────────────────────────────────────────────────────────

function parseObesityEvaluation(text) {
  // IMC: may be on same line ("IMC(kg/m²) 23.4") or next line ("IMC(kg/m°)\nE 23/4")
  // OCR sometimes reads "." as "/" → "23/4" means 23.4
  const imcSameLine = text.match(/IMC(?:\s*\([^)]*\))?\s+([\d]+[./][\d]+|[\d]+)(?!\s*kHz)/);
  const imcNextLine = text.match(/IMC\s*\([^)]*\)\s*\n[^\n\d]*([\d]+[./][\d]+)/m);
  const imcRaw = (imcNextLine || imcSameLine)?.[1] || null;
  const imcVal = imcRaw ? parseFloat(imcRaw.replace('/', '.')) : null;

  // percGrasso: "Corporeo(%) ——— 13.5" (OCR splits "Percentuale Grasso Corporeo" across lines)
  const percM = text.match(/Corporeo\s*\(%\)\s*[-—\s]+([\d.]+)/) ||
                text.match(/Percentuale\s+Grasso\s+Corporeo\s+([\d.]+)/);

  const livM = text.match(/Livello\s+di\s+Obesit[àa]\s+([\d.]+)\s*%/);
  return {
    imc:             imcVal,
    percGrasso:      percM ? parseFloat(percM[1]) : null,
    livelloObesita:  livM  ? parseFloat(livM[1])  : null,
  };
}

// ── other indicators ──────────────────────────────────────────────────────────

function parseOtherIndicators(text) {
  const grassoVisc = (text.match(/Livello\s+di\s+grasso\s+viscerale\s+(\d+)/)          || [])[1];
  const metaboM    =  text.match(/Tasso\s+metabolico\s+basale\s+([\d.]+)\s*kcal/i);
  const massaMagraM=  text.match(/Massa\s+corporea\s+magra\s+([\d.]+)/);
  // "Grasso sottocutaneo 9.8%" or "9,8%" — comma already normalized before reaching here
  const grassoSottM=  text.match(/Grasso\s+sottocutaneo\s+([\d.]+)/);
  // "SMI 9.0kg/m²" — grab number before 'kg'
  const smiM       =  text.match(/SMI\s+([\d.]+)/);
  const etaCorpM   =  text.match(/Et[àa]\s+corporea\s+(\d+)/);
  const rapportoM  =  text.match(/Rapporto\s+Vita[\s\-–]+Fianchi\s+([\d.]+)/);
  return {
    livelloGrassoViscerale: grassoVisc ? parseInt(grassoVisc)       : null,
    tassoMetabolicoBasale:  metaboM    ? parseFloat(metaboM[1])     : null,
    massaCorporeaMagra:     massaMagraM? parseFloat(massaMagraM[1]) : null,
    grassoSottocutaneo:     grassoSottM? parseFloat(grassoSottM[1]) : null,
    smi:                    smiM       ? parseFloat(smiM[1])        : null,
    etaCorporea:            etaCorpM   ? parseInt(etaCorpM[1])      : null,
    rapportoVitaFianchi:    rapportoM  ? parseFloat(rapportoM[1])   : null,
  };
}

// ── bioelectrical impedance ───────────────────────────────────────────────────

function parseBioelectricalImpedance(text) {
  // "20(kHz) 274.3 280.9 16.9 249.1 253.1"
  const row20  = text.match(/20\s*\(?\s*kHz\s*\)?\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/i);
  const row100 = text.match(/100\s*\(?\s*kHz\s*\)?\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/i);
  const segs   = ['braccioDx', 'braccioSx', 'tronco', 'gambaDx', 'gambaSx'];
  const toObj  = m => m ? segs.reduce((a, k, i) => { a[k] = parseFloat(m[i + 1]); return a; }, {}) : null;
  return { '20kHz': toObj(row20), '100kHz': toObj(row100) };
}

// ── exercise calories ─────────────────────────────────────────────────────────

function parseExerciseCalories(text) {
  const results = [];
  const blacklist = /analisi|composizione|corporea|obesit|muscolo|grasso|proteine|acqua|minerali|standard|eccellente|sopra|sotto|alta|bassa|normale|rappor|misur|valut|punteg|impeden|bioelet|segment|equilibrio|controllo|peso|altezza|gen[eè]re|et[aà]|starfit|orario|interval/i;
  const re = /([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s]{2,40}?)\s+(\d{2,4})\s*kcal/gi;
  let m;
  while ((m = re.exec(text)) !== null) {
    const label = m[1].replace(/^[^A-Za-zÀ-ÿ]+/, '').trim();
    if (label.length >= 3 && !blacklist.test(label) && label.split(/\s+/).length <= 5) {
      results.push({ nome: label, kcal: parseInt(m[2]) });
    }
  }
  return results;
}

// ── main export ───────────────────────────────────────────────────────────────

function parseBodyCompositionText(rawText) {
  const text = normalizeOcrText(rawText);
  return {
    header:                  parseHeader(text),
    bodyComposition:         parseBodyComposition(text),
    bodyScore:               parseBodyScore(text),
    weightControl:           parseWeightControl(text),
    obesityEvaluation:       parseObesityEvaluation(text),
    otherIndicators:         parseOtherIndicators(text),
    bioelectricalImpedance:  parseBioelectricalImpedance(text),
    exerciseCalories:        parseExerciseCalories(text),
    rawTextLength:           text.length,
  };
}

async function parseBodyCompositionPDF(buffer) {
  let text;
  try {
    const data = await pdfParse(buffer);
    text = data.text;
  } catch (e) {
    throw new Error('Impossibile leggere il PDF: ' + e.message);
  }
  return parseBodyCompositionText(text);
}

module.exports = { parseBodyCompositionPDF, parseBodyCompositionText };
