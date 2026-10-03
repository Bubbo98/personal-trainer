/**
 * Heuristic matcher between training-plan exercises (parsed from the PDF) and
 * exercise videos.
 *
 * PDF names and video titles are written differently, e.g.
 *   "Leg press (n.45, piano 1)"         ↔ "Leg press orizzontale (1°) - 45/46"
 *   "72. Hip trust machine (Primo piano)" ↔ "Hip trust machine (Panatta) (1°) - 72"
 * so we compare two signals: the gym machine numbers and the name words.
 * Supersets ("Total abdominal + Plank [superset]") are split on "+" and each
 * part is matched on its own, so one exercise can get several videos.
 */

const STOPWORDS = new Set([
    'con', 'per', 'presa', 'piano', 'primo', 'secondo', 'terzo', 'terra', 'tappetini', 'tappetino',
    'alla', 'alle', 'allo', 'della', 'delle', 'dei', 'degli', 'del', 'dal', 'sul', 'sulla', 'sui',
    'una', 'uno', 'gli', 'the', 'and', 'machine', 'macchina', 'superset', 'serie', 'lato',
    'isometria', 'contrazione', 'massima', 'finale', 'cedimento', 'ultima',
    // short Italian articles/prepositions (short words like "up" or the "V" of V-push up are kept)
    'di', 'da', 'in', 'su', 'al', 'il', 'la', 'lo', 'le', 'ai', 'ad', 'ed', 'co', 'ss', 'tut', 'rp', 'a', 'e', 'o',
    // weight/volume leftovers from the PDF columns
    'kg', 'corpo', 'libero', 'sec', 'min', 'rip',
]);

// Grip details: titles often omit them ("Lat machine presa prona larga" ↔
// "Lat machine con sbarra"), so they weigh little — enough to break ties
// ("presa neutra" → "Lat machine con trazy bar a presa neutra").
const MINOR_WORDS = new Set(['prona', 'supina', 'neutra', 'neutro', 'larga', 'stretta']);
const MINOR_WEIGHT = 0.25;

// PDF wording → words used in video titles
const SYNONYMS = {
    pressa: ['press', 'leg'],
    thrust: ['trust'],
    pulldown: ['pull', 'down'],
    abs: ['abdominal'],
    seated: ['seduto'],
    seduto: ['seated'],
    curling: ['curl'],
    martello: ['hammer'],
    hammer: ['martello'],
    orizzontale: ['horizontal'],
    horizontal: ['orizzontale'],
    trazioni: ['pull', 'up'],
    trazione: ['pull', 'up'],
};

function normalize(text) {
    return String(text || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '');
}

/** Meaningful words of a name, in order (synonyms not expanded). */
function words(text) {
    return [...new Set(
        normalize(text)
            .replace(/[^a-z0-9]+/g, ' ')
            .split(' ')
            .filter((w) => w.length >= 1 && !STOPWORDS.has(w) && !/^\d+$/.test(w))
    )];
}

/** Words plus their synonyms — used for the video side of the comparison. */
function tokenize(text) {
    const out = [];
    for (const w of words(text)) {
        out.push(w);
        if (SYNONYMS[w]) out.push(...SYNONYMS[w]);
    }
    return [...new Set(out)];
}

/** True when the exercise word (or one of its synonyms) appears among the video tokens. */
function wordFound(word, videoTokens) {
    const variants = [word, ...(SYNONYMS[word] || [])];
    return variants.some((w) => videoTokens.some((v) => wordsMatch(w, v)));
}

/**
 * Two words match when equal or sharing a long enough stem (manubri/manubrio,
 * rialzo/rialzati). Stems need 5+ letters: "pull" must not match "pulley".
 */
function wordsMatch(a, b) {
    if (a === b) return true;
    if (a.length >= 5 && b.length >= 5 && (a.startsWith(b) || b.startsWith(a))) return true;
    return a.length >= 5 && b.length >= 5 && a.slice(0, 5) === b.slice(0, 5);
}

/** Machine numbers in a PDF exercise name, ignoring floors, seconds, kg and set markers. */
function exerciseNumbers(text) {
    const cleaned = normalize(text)
        .replace(/piano\s*\d+/g, ' ')
        .replace(/\(\s*\d+\s*°\s*\)/g, ' ')
        .replace(/\d+\s*(?:''|'|”|"|kg|°|x\b)/g, ' ');
    return new Set(cleaned.match(/\d+/g) || []);
}

/** Machine numbers in a video title ("(1°) - 45/46" → 45, 46), ignoring "(1°)" and angles. */
function videoNumbers(title) {
    const cleaned = normalize(title).replace(/\(\s*\d+\s*°\s*\)/g, ' ');
    return new Set(cleaned.match(/\d+(?![\d°])/g) || []);
}

/** Splits a superset exercise name into its parts. */
function splitParts(name) {
    return String(name || '')
        .replace(/\[[^\]]*\]/g, ' ')
        .split('+')
        .map((p) => p.trim())
        .filter(Boolean);
}

function prepareVideo(video) {
    return {
        ...video,
        _tokens: tokenize(video.title),
        _words: words(video.title),
        _numbers: videoNumbers(video.title),
        _first: words(video.title)[0] || null,
    };
}

/**
 * The exercise name without trailing instructions: PDFs append notes in
 * parentheses, after commas or after " – " ("hip trust machine (Rilassa
 * spalle, a salire…)"), which would dilute the word comparison.
 * Falls back to the full text when the head has no meaningful words.
 */
function nameHead(part) {
    const head = part.split(/\s[–-]\s|[(,]/)[0];
    return words(head).length > 0 ? head : part;
}

/**
 * Scores how well an exercise part matches a video: 0 = unrelated.
 * Returns { score, confidence } where confidence is 'sure' | 'maybe' | null.
 */
function scorePart(part, video) {
    const exWords = words(nameHead(part));
    const numbers = exerciseNumbers(part);
    if (exWords.length === 0) return { score: 0, confidence: null, headMatch: false };

    // The first word names the exercise ("Chin up isometrica al multipower"),
    // so it weighs double: matching only secondary words isn't enough.
    const found = exWords.map((w) => wordFound(w, video._tokens));
    const headMatch = found[0];
    const weightOf = (w, i) => (i === 0 ? 2 : MINOR_WORDS.has(w) ? MINOR_WEIGHT : 1);
    const totalWeight = exWords.reduce((sum, w, i) => sum + weightOf(w, i), 0);
    const matchedWeight = exWords.reduce((sum, w, i) => sum + (found[i] ? weightOf(w, i) : 0), 0);
    const wordScore = matchedWeight / totalWeight;
    // Same, ignoring grip details: a missing "prona" doesn't make a match unsure
    const coreWords = exWords.filter((w, i) => i === 0 || !MINOR_WORDS.has(w));
    const coreScore = exWords.reduce((sum, w, i) => sum + (found[i] && (i === 0 || !MINOR_WORDS.has(w)) ? weightOf(w, i) : 0), 0)
        / coreWords.reduce((sum, w, i) => sum + (i === 0 ? 2 : 1), 0);

    const sharedNumber = [...numbers].some((n) => video._numbers.has(n));
    // Machine numbers in PDFs aren't always reliable (typos, alternatives),
    // so a mismatch only lowers the score a bit instead of excluding the video.
    const conflictingNumbers = numbers.size > 0 && video._numbers.size > 0 && !sharedNumber;

    // Tie-breaker: prefer the video with fewer extra words ("push up" →
    // "Push up" rather than "Push down con corda al cavo singolo")
    const exTokens = tokenize(nameHead(part));
    const coverage = video._words.length
        ? video._words.filter((vw) => exTokens.some((t) => wordsMatch(t, vw))).length / video._words.length
        : 0;

    const score = wordScore * 0.7 + (sharedNumber ? 0.5 : 0) - (conflictingNumbers ? 0.15 : 0) + (headMatch ? 0.1 : 0) + coverage * 0.1;

    // A one-word name ("Plank") is only unambiguous when the video starts with that word too
    const sameFirstWord = video._first !== null && wordsMatch(exWords[0], video._first);
    const fullWordMatch = coreScore >= 0.99 && !conflictingNumbers && (coreWords.length >= 2 || sameFirstWord);

    let confidence = null;
    if (headMatch && ((sharedNumber && coreScore >= 0.5) || fullWordMatch)) {
        confidence = 'sure';
    } else if (score >= 0.35 && (headMatch || sharedNumber)) {
        confidence = 'maybe';
    }
    return { score, confidence, headMatch };
}

/**
 * Matches the exercises of one day against a pool of videos.
 *
 * @param exercises  [{ id, name }]
 * @param videos     [{ videoId, title, ... }] — candidates (each used at most once)
 * @returns Map exerciseId → [{ ...video, confidence, score }]
 */
function matchDay(exercises, videos) {
    const parts = [];
    for (const ex of exercises) {
        for (const part of splitParts(ex.name)) parts.push({ exerciseId: ex.id, text: part });
    }
    return matchParts(parts, videos);
}

/**
 * Greedy matching of exercise parts ({ exerciseId, text }) against a pool of
 * videos: best pairs first, each part and each video used at most once.
 * @returns { matches: Map exerciseId → [{ ...video, confidence, score }], unmatchedParts }
 */
function matchParts(parts, videos) {
    const pool = videos.map(prepareVideo);
    const pairs = [];
    parts.forEach((part, pi) => {
        pool.forEach((video, vi) => {
            const { score, confidence } = scorePart(part.text, video);
            if (confidence) pairs.push({ pi, vi, score, confidence });
        });
    });
    // Greedy: best pairs first, each part and each video used once
    pairs.sort((a, b) => b.score - a.score);

    const usedParts = new Set();
    const usedVideos = new Set();
    const assigned = []; // [{ pi, vi, confidence, score }]
    for (const p of pairs) {
        if (usedParts.has(p.pi) || usedVideos.has(p.vi)) continue;
        usedParts.add(p.pi);
        usedVideos.add(p.vi);
        assigned.push(p);
    }

    // Keep the exercise's part order so superset videos come out in sequence
    assigned.sort((a, b) => a.pi - b.pi);
    const result = new Map();
    for (const a of assigned) {
        const { _tokens, _words, _numbers, _first, ...video } = pool[a.vi];
        const exerciseId = parts[a.pi].exerciseId;
        if (!result.has(exerciseId)) result.set(exerciseId, []);
        result.get(exerciseId).push({ ...video, confidence: a.confidence, score: Math.round(a.score * 100) / 100 });
    }

    const unmatchedParts = parts.filter((_, pi) => !usedParts.has(pi));
    return { matches: result, unmatchedParts };
}

/**
 * Best video from the whole library for an exercise part that found nothing
 * among the day's videos. Stricter than matchDay (the library is large):
 * the exercise's first word must match. Always returned as 'maybe'.
 */
function bestLibraryMatch(partText, preparedLibrary, excludeVideoIds = new Set()) {
    let best = null;
    for (const video of preparedLibrary) {
        if (excludeVideoIds.has(video.videoId)) continue;
        const { score, headMatch } = scorePart(partText, video);
        if (headMatch && score >= 0.55 && (!best || score > best.score)) best = { video, score };
    }
    if (!best) return null;
    const { _tokens, _words, _numbers, _first, ...video } = best.video;
    return { ...video, confidence: 'maybe', score: Math.round(best.score * 100) / 100, fromLibrary: true };
}

/**
 * Proposes videos for every exercise of a client that has no linked video yet.
 * Looks, in order, at:
 *   1. the free videos of the same training day;
 *   2. the free videos of the client's other days (days numbered differently
 *      from the PDF, e.g. all videos put in "Giorno 5");
 *   3. the whole library (always 'maybe', see bestLibraryMatch).
 *
 * @param exercises  [{ id, day_number, name }]
 * @param dayVideos  [{ assignmentId, videoId, title, day_number, exercise_id }]
 * @param library    prepareVideo()'d [{ videoId, title }]
 * @returns { suggestions: Map exerciseId → [{ assignmentId|null, videoId, title, confidence, source }],
 *            usedAssignments: Set of assignment ids linked or suggested }
 */
function suggestLinks(exercises, dayVideos, library) {
    const exerciseIds = new Set(exercises.map((e) => e.id));
    const isLinked = (v) => v.exercise_id != null && exerciseIds.has(v.exercise_id);
    const linkedExercises = new Set(dayVideos.filter(isLinked).map((v) => v.exercise_id));
    const usedAssignments = new Set(dayVideos.filter(isLinked).map((v) => v.assignmentId));
    const suggestions = new Map();

    const add = (exerciseId, matches, source) => {
        for (const m of matches) {
            usedAssignments.add(m.assignmentId);
            const list = suggestions.get(exerciseId) || [];
            list.push({ assignmentId: m.assignmentId, videoId: m.videoId, title: m.title, confidence: m.confidence, source });
            suggestions.set(exerciseId, list);
        }
    };

    // 1. Same day
    const dayNumbers = [...new Set(exercises.map((e) => e.day_number))];
    let leftovers = [];
    for (const day of dayNumbers) {
        const dayExercises = exercises.filter((e) => e.day_number === day && !linkedExercises.has(e.id));
        const free = dayVideos.filter((v) => v.day_number === day && !usedAssignments.has(v.assignmentId) && !isLinked(v));
        const { matches, unmatchedParts } = matchDay(dayExercises, free);
        for (const [exerciseId, list] of matches) add(exerciseId, list, 'day');
        leftovers.push(...unmatchedParts.map((p) => ({ ...p, dayNumber: day })));
    }

    // 2. Other days' free videos
    const otherFree = dayVideos.filter((v) => !usedAssignments.has(v.assignmentId) && !isLinked(v));
    if (leftovers.length > 0 && otherFree.length > 0) {
        const { matches, unmatchedParts } = matchParts(leftovers, otherFree);
        for (const [exerciseId, list] of matches) add(exerciseId, list, 'otherDay');
        leftovers = unmatchedParts;
    }

    // 3. Library (skipping videos already in that exercise's day)
    for (const part of leftovers) {
        const inDay = new Set(dayVideos.filter((v) => v.day_number === part.dayNumber).map((v) => v.videoId));
        for (const list of suggestions.values()) for (const s of list) if (s.assignmentId == null) inDay.add(s.videoId);
        const best = bestLibraryMatch(part.text, library, inDay);
        if (!best) continue;
        const list = suggestions.get(part.exerciseId) || [];
        list.push({ assignmentId: null, videoId: best.videoId, title: best.title, confidence: 'maybe', source: 'library' });
        suggestions.set(part.exerciseId, list);
    }

    // Superset parts may have been found in different passes: keep name order
    const partIndex = (exerciseId, title) => {
        const ex = exercises.find((e) => e.id === exerciseId);
        const parts = splitParts(ex ? ex.name : '');
        const idx = parts.findIndex((p) => scorePart(p, prepareVideo({ title })).score > 0.3);
        return idx === -1 ? parts.length : idx;
    };
    for (const [exerciseId, list] of suggestions) {
        if (list.length > 1) list.sort((a, b) => partIndex(exerciseId, a.title) - partIndex(exerciseId, b.title));
    }

    return { suggestions, usedAssignments };
}

module.exports = { matchDay, matchParts, splitParts, scorePart, prepareVideo, bestLibraryMatch, suggestLinks };
