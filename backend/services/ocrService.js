'use strict';

const Tesseract = require('tesseract.js');
const os = require('os');
const path = require('path');

const CACHE_PATH = process.env.TESSERACT_CACHE_PATH || path.join(os.tmpdir(), 'tesseract-cache');

// Singleton worker — initialized once, reused across all requests
let _workerPromise = null;

function getWorker() {
  if (!_workerPromise) {
    _workerPromise = Tesseract.createWorker('ita', 1, {
      cachePath: CACHE_PATH,
      cacheMethod: 'readWrite',
      logger: () => {},
    }).catch(err => {
      _workerPromise = null; // reset on failure so next call retries
      throw err;
    });
  }
  return _workerPromise;
}

async function extractTextFromImage(buffer) {
  const worker = await getWorker();
  const { data: { text } } = await worker.recognize(buffer);
  return text;
}

module.exports = { extractTextFromImage };
