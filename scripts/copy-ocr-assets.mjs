// Copies the OCR engine and English model into public/ocr/ so the site serves them
// itself instead of tesseract.js fetching from a CDN. See docs/adr/0008.
import { copyFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { basename, dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const out = join(import.meta.dirname, '..', 'public', 'ocr');
const core = dirname(require.resolve('tesseract.js-core/package.json'));
const files = [
  require.resolve('tesseract.js/dist/worker.min.js'),
  ...['', 'simd-', 'relaxedsimd-'].map((v) => join(core, `tesseract-core-${v}lstm.wasm.js`)),
  require.resolve('@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz'),
];

mkdirSync(out, { recursive: true });
for (const file of files) copyFileSync(file, join(out, basename(file)));
console.log(`Copied ${files.length} OCR files to public/ocr/`);
