'use strict';

const Anthropic = require('@anthropic-ai/sdk');

const PROMPT = `Analizza questa immagine di un report di composizione corporea Starfit ed estrai tutti i dati visibili.
Restituisci SOLO un oggetto JSON valido con questa struttura esatta (usa null per i campi non presenti nell'immagine):

{
  "header": {
    "id": null,
    "genere": "M" o "F" o null,
    "eta": numero intero o null,
    "altezzaCm": numero intero o null,
    "dataRilevazione": "stringa data come appare" o null
  },
  "bodyScore": numero intero (punteggio su 100) o null,
  "bodyComposition": {
    "Peso":                {"value": numero, "percent": numero, "valutazione": "stringa"} o null,
    "Grasso corporeo":     {"value": numero, "percent": numero, "valutazione": "stringa"} o null,
    "Minerali":            {"value": numero, "percent": numero, "valutazione": "stringa"} o null,
    "Proteine":            {"value": numero, "percent": numero, "valutazione": "stringa"} o null,
    "Acqua corporea":      {"value": numero, "percent": numero, "valutazione": "stringa"} o null,
    "Muscoloso":           {"value": numero, "percent": numero, "valutazione": "stringa"} o null,
    "Muscolo scheletrico": {"value": numero, "percent": numero, "valutazione": "stringa"} o null
  },
  "weightControl": {
    "pesoObiettivo": numero o null,
    "controlloPeso": numero o null,
    "controlloGrasso": numero o null,
    "controlloMuscoli": numero o null
  },
  "obesityEvaluation": {
    "imc": numero o null,
    "percGrasso": numero o null,
    "livelloObesita": numero o null
  },
  "otherIndicators": {
    "livelloGrassoViscerale": numero intero o null,
    "tassoMetabolicoBasale": numero o null,
    "massaCorporeaMagra": numero o null,
    "grassoSottocutaneo": numero o null,
    "smi": numero o null,
    "etaCorporea": numero intero o null,
    "rapportoVitaFianchi": numero o null
  },
  "bioelectricalImpedance": {
    "20kHz":  {"braccioDx": numero, "braccioSx": numero, "tronco": numero, "gambaDx": numero, "gambaSx": numero} o null,
    "100kHz": {"braccioDx": numero, "braccioSx": numero, "tronco": numero, "gambaDx": numero, "gambaSx": numero} o null
  },
  "exerciseCalories": [{"nome": "stringa", "kcal": numero}]
}

Restituisci SOLO il JSON, senza testo aggiuntivo, senza markdown.`;

async function parseBodyCompositionReport(buffer, mimeType) {
    if (!process.env.ANTHROPIC_API_KEY) {
        throw new Error('ANTHROPIC_API_KEY non configurata nel server');
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    // Anthropic supports: image/jpeg, image/png, image/gif, image/webp
    const supportedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const mediaType = supportedTypes.includes(mimeType) ? mimeType : 'image/jpeg';

    const message = await client.messages.create({
        model: 'claude-opus-4-7',
        max_tokens: 2048,
        messages: [{
            role: 'user',
            content: [
                {
                    type: 'image',
                    source: {
                        type: 'base64',
                        media_type: mediaType,
                        data: buffer.toString('base64'),
                    },
                },
                { type: 'text', text: PROMPT },
            ],
        }],
    });

    const text = message.content[0].text.trim();

    // Strip any accidental markdown fences
    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

    try {
        return JSON.parse(cleaned);
    } catch (e) {
        throw new Error('Risposta Claude non è JSON valido: ' + cleaned.slice(0, 200));
    }
}

module.exports = { parseBodyCompositionReport };
