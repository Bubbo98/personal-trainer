'use strict';

const pdfParse = require('pdf-parse');

// Helper: find first float after a label
function grabFloat(text, label) {
    const esc = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const m = text.match(new RegExp(esc + '[\\s:]*([+-]?[\\d]+(?:[.,][\\d]+)?)'));
    return m ? parseFloat(m[1].replace(',', '.')) : null;
}

function grabInt(text, label) {
    const v = grabFloat(text, label);
    return v !== null ? Math.round(v) : null;
}

// Valutazione categories used in Starfit
const VALUTAZIONI = ['Eccellente', 'Standard', 'Sopra la Media', 'Sotto la Media', 'Alta', 'Bassa', 'Normale', 'Sovrappeso', 'Sottopeso', 'Gravemente sovrappeso'];

function grabValutazione(text, afterLabel) {
    const esc = afterLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(esc + '[\\s\\S]{0,80}?(' + VALUTAZIONI.join('|') + ')');
    const m = text.match(pattern);
    return m ? m[1] : null;
}

// Parse one body composition row: name value (min~max) percentage valutazione
function parseCompositionRow(text, rowName) {
    const esc = rowName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Matches: "Peso 79.22 (63.3~85.7) 100.0 Standard"
    const m = text.match(
        new RegExp(esc + '\\s+([\\d.]+)\\s*\\([\\d.~]+\\)\\s+([\\d.]+)\\s+(' + VALUTAZIONI.join('|') + ')')
    );
    if (m) return { value: parseFloat(m[1]), percent: parseFloat(m[2]), valutazione: m[3] };
    // Fallback without range
    const m2 = text.match(new RegExp(esc + '\\s+([\\d.]+)\\s+([\\d.]+)\\s+(' + VALUTAZIONI.join('|') + ')'));
    if (m2) return { value: parseFloat(m2[1]), percent: parseFloat(m2[2]), valutazione: m2[3] };
    return null;
}

function parseHeader(text) {
    const id = (text.match(/ID\s*:\s*(\S+)/) || [])[1] || null;
    const genere = (text.match(/Genere\s*:\s*(\S+)/) || [])[1] || null;
    const eta = (text.match(/Et[àa]\s*:\s*(\d+)/) || [])[1];
    const altezza = (text.match(/Altezza\s*:\s*(\d+)\s*cm/i) || [])[1];
    // Date: looks like "Jul 02, 2028 09:13:25" or ISO format
    const datM = text.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\w{3}\s+\d{1,2},?\s+\d{4})/);
    return {
        id: id || null,
        genere: genere || null,
        eta: eta ? parseInt(eta) : null,
        altezzaCm: altezza ? parseInt(altezza) : null,
        dataRilevazione: datM ? datM[1] : null,
    };
}

function parseBodyComposition(text) {
    const rows = [
        'Peso',
        'Grasso corporeo',
        'Minerali',
        'Proteine',
        'Acqua corporea',
        'Muscoloso',
        'Muscolo scheletrico',
    ];
    const result = {};
    for (const row of rows) {
        result[row] = parseCompositionRow(text, row);
    }
    return result;
}

function parseBodyScore(text) {
    const m = text.match(/(\d{1,3})\s*\/\s*100\s*Punt/i);
    return m ? parseInt(m[1]) : null;
}

function parseWeightControl(text) {
    // "Peso obiettivo consigliato 79.6kg" or "Peso obiettivo consigliato\n79.6"
    const pesoObj = (text.match(/Peso\s+obiettivo\s+consigliato\s+([\d.]+)/) || [])[1];
    // "Controllo Peso +0.4kg"
    const ctrlPeso   = (text.match(/Controllo\s+Peso\s+([+-]?[\d.]+)/) || [])[1];
    const ctrlGrasso = (text.match(/Controllo\s+Grasso\s+([+-]?[\d.]+)/) || [])[1];
    const ctrlMuscoli= (text.match(/Controllo\s+Muscoli\s+([+-]?[\d.]+)/) || [])[1];
    return {
        pesoObiettivo: pesoObj ? parseFloat(pesoObj) : null,
        controlloPeso:    ctrlPeso    ? parseFloat(ctrlPeso)    : null,
        controlloGrasso:  ctrlGrasso  ? parseFloat(ctrlGrasso)  : null,
        controlloMuscoli: ctrlMuscoli ? parseFloat(ctrlMuscoli) : null,
    };
}

function parseObesityEvaluation(text) {
    // IMC value — appears twice (table + card), pick first after "IMC"
    const imcM = text.match(/IMC(?:\(kg\/m[²2]\))?\s+([\d.]+)/);
    const imc = imcM ? parseFloat(imcM[1]) : null;
    const percGrassoM = text.match(/Percentuale\s+Grasso\s+Corporeo\s+([\d.]+)/);
    const percGrasso = percGrassoM ? parseFloat(percGrassoM[1]) : null;
    const livelloM = text.match(/Livello\s+di\s+Obesit[àa]\s+([\d.]+)\s*%/);
    const livelloObesita = livelloM ? parseFloat(livelloM[1]) : null;
    return { imc, percGrasso, livelloObesita };
}

function parseOtherIndicators(text) {
    const grassoVisc = (text.match(/Livello\s+di\s+grasso\s+viscerale\s+(\d+)/) || [])[1];
    const metaboM = text.match(/Tasso\s+metabolico\s+basale\s+([\d.]+)\s*kcal/i);
    const massaMagraM = text.match(/Massa\s+corporea\s+magra\s+([\d.]+)/);
    const grassoSottM = text.match(/Grasso\s+sottocutaneo\s+([\d.]+)/);
    const smiM = text.match(/SMI\s+([\d.]+)/);
    const etaCorporeaM = text.match(/Et[àa]\s+corporea\s+(\d+)/);
    const rapportoM = text.match(/Rapporto\s+Vita[\s-]*Fianchi\s+([\d.]+)/);
    return {
        livelloGrassoViscerale: grassoVisc ? parseInt(grassoVisc) : null,
        tassoMetabolicoBasale:  metaboM    ? parseFloat(metaboM[1]) : null,
        massaCorporeaMagra:     massaMagraM ? parseFloat(massaMagraM[1]) : null,
        grassoSottocutaneo:     grassoSottM ? parseFloat(grassoSottM[1]) : null,
        smi:                    smiM        ? parseFloat(smiM[1]) : null,
        etaCorporea:            etaCorporeaM ? parseInt(etaCorporeaM[1]) : null,
        rapportoVitaFianchi:    rapportoM   ? parseFloat(rapportoM[1]) : null,
    };
}

function parseBioelectricalImpedance(text) {
    // Row format: "20(kHz) 274.3 280.9 16.9 249.1 253.1"
    const row20  = text.match(/20\s*\(?\s*kHz\s*\)?\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/i);
    const row100 = text.match(/100\s*\(?\s*kHz\s*\)?\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/i);
    const segments = ['braccioDx', 'braccioSx', 'tronco', 'gambaDx', 'gambaSx'];
    function rowToObj(m) {
        if (!m) return null;
        return segments.reduce((acc, k, i) => { acc[k] = parseFloat(m[i + 1]); return acc; }, {});
    }
    return { '20kHz': rowToObj(row20), '100kHz': rowToObj(row100) };
}

function parseExerciseCalories(text) {
    // "Corde per saltare veloci 499kcal"
    const results = [];
    const re = /([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s]{2,40}?)\s+(\d{2,4})\s*kcal/gi;
    let m;
    const blacklist = /analisi|composizione|corporea|obesit|muscolo|grasso|proteine|acqua|minerali|standard|eccellente|sopra|sotto|alta|bassa|normale|rappor|misur|valut|punteg|impeden|bioelet|segmental|equilibrio|controllo|peso|altezza|gen[eè]re|et[aà]|starfit/i;
    while ((m = re.exec(text)) !== null) {
        const label = m[1].trim();
        if (!blacklist.test(label) && label.split(/\s+/).length <= 5) {
            results.push({ nome: label, kcal: parseInt(m[2]) });
        }
    }
    return results;
}

async function parseBodyCompositionPDF(buffer) {
    let text;
    try {
        const data = await pdfParse(buffer);
        text = data.text;
    } catch (e) {
        throw new Error('Impossibile leggere il PDF: ' + e.message);
    }

    return {
        header: parseHeader(text),
        bodyComposition: parseBodyComposition(text),
        bodyScore: parseBodyScore(text),
        weightControl: parseWeightControl(text),
        obesityEvaluation: parseObesityEvaluation(text),
        otherIndicators: parseOtherIndicators(text),
        bioelectricalImpedance: parseBioelectricalImpedance(text),
        exerciseCalories: parseExerciseCalories(text),
        rawTextLength: text.length,
    };
}

module.exports = { parseBodyCompositionPDF };
