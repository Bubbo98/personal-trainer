const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const pdfParse = require('pdf-parse');
const { start, stop, db } = require('./helpers');
const { parsePdfText, parseWeightSlots } = require('../services/planParser');
const { readFile } = require('../services/storedFiles');

// Stats left inside a name ("… 4 10+cedimento 1'30" 30 kg …") mean two table rows were merged
const MERGED_ROW = /\b\d+\s+[^\s(]\S*\s+\d+(?:[.,]\d+)?\s*(?:['’′"”″]|sec\b|min\b)/i;

// Plans whose table cells pdf-parse splits irregularly ("3 (in SS) 10" / "+" / "12" /
// "1’30” a fine" / "superset"): not supported yet. Any other merged row is a regression.
const KNOWN_UNSUPPORTED = ['Barni', 'Savioli', 'Tosi', 'Rizzelli', 'Capoano'];

after(stop);

describe('plan PDF parser', () => {
    let plans;

    before(async () => {
        await start();
        plans = (await db().execute(`SELECT u.id, u.first_name, u.last_name, p.file_key, p.file_data
                                      FROM user_pdf_files p JOIN users u ON u.id = p.user_id`)).rows;
    });

    it('parses every stored plan without merging rows', async () => {
        assert.ok(plans.length > 10);
        const problems = [];
        for (const plan of plans) {
            if (KNOWN_UNSUPPORTED.includes(plan.last_name.trim())) continue;
            const { text } = await pdfParse(await readFile(plan));
            for (const day of parsePdfText(text)) {
                for (const ex of day.exercises) {
                    if (MERGED_ROW.test(ex.name)) problems.push(`${plan.first_name} ${plan.last_name}, ${day.dayName}: ${ex.name}`);
                }
            }
        }
        assert.deepEqual(problems, []);
    });

    it('counts weight slots from the suggested weight', () => {
        assert.equal(parseWeightSlots('Peso consigliato: 20 kg + 30 kg'), 2);
        assert.equal(parseWeightSlots('Peso consigliato: 8 - 6 - 4 kg'), 3);
        assert.equal(parseWeightSlots('Peso consigliato: 10 kg x braccio'), 1);
        assert.equal(parseWeightSlots('Peso consigliato: 50 kg / 10 kg x lato'), 2);
        assert.equal(parseWeightSlots(''), 1);
    });

    it('reads ladder, "cedimento" and dash reps', () => {
        const text = [
            'GIORNO 1 (Test)', 'WORKOUT:', 'Esercizio Serie Ripetizioni Recupero Peso',
            '37. High row + 42. Dip (2° piano) - SS', '4 10+cedimento 1\'30" 30 kg',
            '44. High curl machine - Ladder 4-6-8-6-4', '1 4-6-8-6-4 1\' 5 kg x lato',
            '26. Plank - Isometria (30") (1° piano)', '3 - 45" corpo libero',
            'STRETCHING',
        ].join('\n');
        const [day] = parsePdfText(text);
        assert.deepEqual(day.exercises.map((e) => [e.sets, e.reps, e.rest]), [
            ['4', '10+cedimento', '1\'30'],
            ['1', '4-6-8-6-4', '1\''],
            ['3', '30"', '45"'],
        ]);
    });

    it('reads rows and supersets split one cell per line', () => {
        const text = [
            'GIORNO 1 (Test)', 'WORKOUT:', 'Esercizio Serie Ripetizioni Recupero Peso',
            'Trazioni alla torre zavorrate presa prona 4', '5', '2\'30"', '5 kg',
            'Low row presa neutra 4 6 2\' 20 kg per lato',
            'SS:', 'Push down al castello con barra dritta presa', 'prona',
            'Curl a martello con manubri in piedi presa', 'neutra',
            '3', '10', '10', '1\'30"', '25 kg totali', '12 kg x braccio',
            'Plank sugli avambracci - Isometria 1’ 4 1 1\' Corpo libero',
            'STRETCHING',
        ].join('\n');
        const [day] = parsePdfText(text);
        assert.deepEqual(day.exercises.map((e) => [e.name, e.sets, e.reps, e.rest, e.notes]), [
            ['Trazioni alla torre zavorrate presa prona', '4', '5', '2\'30', 'Peso consigliato: 5 kg'],
            ['Low row presa neutra', '4', '6', '2\'', 'Peso consigliato: 20 kg per lato'],
            ['Push down al castello con barra dritta presa prona + Curl a martello con manubri in piedi presa neutra',
                '3', '10 + 10', '1\'30', 'Peso consigliato: 25 kg totali / 12 kg x braccio'],
            ['Plank sugli avambracci - Isometria 1’', '4', '1', '1\'', ''],
        ]);
        assert.equal(day.exercises[2].weightSlots, 2);
    });

    it('reads timed and "max" reps with the rest in minutes', () => {
        const text = [
            'GIORNO 1 (Test)', 'WORKOUT:', 'Esercizio Serie Ripetizioni Recupero Peso',
            'Plank sui gomiti 3 30 sec 1\' corpo libero',
            'Trazioni 4 max 2\' corpo libero',
            'Wall sit 3 45" 1\'30" corpo libero',
            'STRETCHING',
        ].join('\n');
        const [day] = parsePdfText(text);
        assert.deepEqual(day.exercises.map((e) => [e.name, e.sets, e.reps, e.rest]), [
            ['Plank sui gomiti', '3', '30 sec', '1\''],
            ['Trazioni', '4', 'max', '2\''],
            ['Wall sit', '3', '45"', '1\'30'],
        ]);
    });
});
