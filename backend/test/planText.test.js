const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { parsePlanText } = require('../services/planText');

const row = (e) => [e.name, e.sets, e.reps, e.rest, e.notes, e.weightSlots];

describe('plan written as text', () => {
    it('reads days, exercises, supersets and notes', () => {
        const { days, errors } = parsePlanText([
            'GIORNO 1 | Petto + Tricipiti',
            'Esercizio | Serie | Ripetizioni | Recupero | Peso | Note',
            'Panca piana con manubri | 4 | 8 | 2\'30" | 30 kg x braccio |',
            'Push down + Curl a martello | 3 | 10 + 10 | 1\'30" | 25 kg totali + 12 kg x braccio | SS',
            'Plank sui gomiti | 3 | 30 sec | 1\' | corpo libero | Isometria',
            'Trazioni | 4 | max | 2\' | - |',
            '',
            'GIORNO 2 (Gambe)',
            'Leg press | 3 | 10 | 90 sec | 90 kg totali',
        ].join('\n'));
        assert.deepEqual(errors, []);
        assert.deepEqual(days.map((d) => [d.dayNumber, d.dayName]), [[1, 'Giorno 1 - Petto + Tricipiti'], [2, 'Giorno 2 - Gambe']]);
        assert.deepEqual(days[0].exercises.map(row), [
            ['Panca piana con manubri', '4', '8', '2\'30"', 'Peso consigliato: 30 kg x braccio', 1],
            ['Push down + Curl a martello', '3', '10 + 10', '1\'30"', 'SS · Peso consigliato: 25 kg totali + 12 kg x braccio', 2],
            ['Plank sui gomiti', '3', '30 sec', '1\'', 'Isometria · Peso consigliato: corpo libero', 1],
            ['Trazioni', '4', 'max', '2\'', '', 1],
        ]);
        assert.deepEqual(days[1].exercises.map(row), [['Leg press', '3', '10', '90 sec', 'Peso consigliato: 90 kg totali', 1]]);
    });

    it('accepts the plan as a markdown table inside a code block', () => {
        const { days, errors } = parsePlanText([
            '```',
            '## **GIORNO 1 | Dorso**',
            '| Esercizio | Serie | Ripetizioni | Recupero | Peso | Note |',
            '|---|---|---|---|---|---|',
            '| Lat machine | 4 | 10 | 1\'30" | 45 kg totali | TUT (negativa 3") |',
            '```',
        ].join('\n'));
        assert.deepEqual(errors, []);
        assert.equal(days[0].dayName, 'Giorno 1 - Dorso');
        assert.deepEqual(row(days[0].exercises[0]), ['Lat machine', '4', '10', '1\'30"', 'TUT (negativa 3") · Peso consigliato: 45 kg totali', 1]);
    });

    it('reports every line it cannot read instead of guessing', () => {
        const { errors } = parsePlanText([
            'Scheda di Mario',
            'Panca piana | 4 | 8 | 2\' | 30 kg',
            'GIORNO 1',
            'Panca piana 4 8 2\' 30 kg',
            'Croci | 3 |  | 1\' | 10 kg',
            'GIORNO 1 | Ancora',
        ].join('\n'));
        assert.deepEqual(errors.map((e) => [e.line, e.reason]), [
            [1, 'columns'], [2, 'beforeDay'], [4, 'columns'], [5, 'missingField'], [6, 'duplicateDay'],
        ]);
    });

    it('rejects an empty or oversized text', () => {
        assert.equal(parsePlanText('  ').errors[0].reason, 'empty');
        assert.equal(parsePlanText('GIORNO 1').errors[0].reason, 'empty');
        assert.equal(parsePlanText(undefined).errors[0].reason, 'empty');
        assert.equal(parsePlanText('x'.repeat(100_001)).errors[0].reason, 'tooLong');
    });
});
