/**
 * Workout plan written as text (Claude writes it next to the PDF) → days and exercises.
 * Unlike the PDF parser nothing is guessed: every line is a day, an exercise or
 * skippable, anything else is reported with its line number.
 *
 *   GIORNO 1 | Petto + Tricipiti
 *   Esercizio | Serie | Ripetizioni | Recupero | Peso | Note
 *   Panca piana con manubri | 4 | 8 | 2'30" | 30 kg x braccio |
 *   Leg curl + Ponte glutei | 3 | 12 + 15 | 1'30" | 25 kg totali + corpo libero | Isometria 2" in alto
 *
 * Markdown tables (outer pipes, |---| rows), code fences, headings and bold are tolerated.
 */
const { parseWeightSlots } = require('./planParser');

const MAX_LENGTH = 100_000;

/** Line with the markdown decoration removed ("## **GIORNO 1**" → "GIORNO 1"). */
const clean = (line) => line.replace(/\*\*/g, '').replace(/^#+\s*/, '').trim();

const isSkippable = (line) =>
    !line ||
    /^```/.test(line) ||
    /^\|?[\s|:-]*-{3,}[\s|:-]*$/.test(line) || // |---|---|
    /^\|?\s*esercizio\s*\|/i.test(line);       // column headers

const cellsOf = (line) => line.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());

/**
 * @returns {{ days: object[], errors: { line: number, text: string, reason: string }[] }}
 *   reason: columns | beforeDay | duplicateDay | missingField | empty | tooLong
 */
function parsePlanText(text) {
    const errors = [];
    if (typeof text !== 'string' || !text.trim()) return { days: [], errors: [{ line: 0, text: '', reason: 'empty' }] };
    if (text.length > MAX_LENGTH) return { days: [], errors: [{ line: 0, text: '', reason: 'tooLong' }] };

    const days = [];
    let day = null;

    text.split(/\r?\n/).forEach((raw, index) => {
        const line = clean(raw);
        const lineNumber = index + 1;
        if (isSkippable(line)) return;

        const dayMatch = cellsOf(line).join(' | ').match(/^GIORNO\s+(\d+)\b\s*(?:[|:(–-]\s*)?(.*?)\s*\)?\s*\|*\s*$/i);
        if (dayMatch) {
            const dayNumber = Number(dayMatch[1]);
            if (days.some((d) => d.dayNumber === dayNumber)) {
                errors.push({ line: lineNumber, text: raw.trim(), reason: 'duplicateDay' });
                day = null;
                return;
            }
            const title = dayMatch[2].replace(/\s*\|\s*/g, ' ').trim();
            day = { dayNumber, dayName: title ? `Giorno ${dayNumber} - ${title}` : `Giorno ${dayNumber}`, exercises: [] };
            days.push(day);
            return;
        }

        const cells = cellsOf(line);
        if (cells.length !== 5 && cells.length !== 6) return errors.push({ line: lineNumber, text: raw.trim(), reason: 'columns' });
        if (!day) return errors.push({ line: lineNumber, text: raw.trim(), reason: 'beforeDay' });

        const [name, sets, reps, rest, weight, note = ''] = cells;
        if (!name || !sets || !reps || !rest) return errors.push({ line: lineNumber, text: raw.trim(), reason: 'missingField' });

        // "Peso consigliato: …" stays last: the dashboard reads the weights up to the end
        const weightNote = weight && !/^[-–]$/.test(weight) ? `Peso consigliato: ${weight}` : '';
        const notes = [note, weightNote].filter(Boolean).join(' · ');
        day.exercises.push({ name, sets, reps, rest, notes, weightSlots: parseWeightSlots(weightNote) });
    });

    if (!errors.length && !days.some((d) => d.exercises.length)) errors.push({ line: 0, text: '', reason: 'empty' });
    return { days: days.filter((d) => d.exercises.length), errors };
}

module.exports = { parsePlanText };
