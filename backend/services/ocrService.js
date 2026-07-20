'use strict';

const Tesseract = require('tesseract.js');
const os = require('os');
const path = require('path');

const CACHE_PATH = process.env.TESSERACT_CACHE_PATH || path.join(os.tmpdir(), 'tesseract-cache');

async function extractTextFromImage(buffer) {
  const worker = await Tesseract.createWorker('ita', 1, {
    cachePath: CACHE_PATH,
    cacheMethod: 'readWrite',
    logger: () => {},
  });
  try {
    const { data: { text } } = await worker.recognize(buffer);
    return text;
  } finally {
    await worker.terminate();
  }
}

module.exports = { extractTextFromImage };
