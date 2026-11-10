const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const sourceIccPath = path.resolve(
  __dirname,
  '../lib/mixins/data/sRGB_IEC61966_2_1.icc',
);
const emittedIccPath = path.resolve(
  __dirname,
  '../js/data/sRGB_IEC61966_2_1.icc',
);
const nodeBundlePath = require.resolve('fcmpdfkit');
const browserBundlePath = path.resolve(__dirname, '../js/pdfkit.browser.js');
const browserEsBundleUrl = require('node:url').pathToFileURL(
  path.resolve(__dirname, '../js/pdfkit.browser.mjs'),
);
const outputHelpers = require('fcmpdfkit/output');
const sourceIcc = fs.readFileSync(sourceIccPath);

assert.deepEqual(fs.readFileSync(emittedIccPath), sourceIcc);
assert.equal(
  fs
    .readFileSync(nodeBundlePath, 'utf8')
    .includes(sourceIcc.toString('base64')),
  false,
);

const originalReadFileSync = fs.readFileSync;
let iccReads = 0;
fs.readFileSync = function (file, ...args) {
  if (String(file).endsWith('/sRGB_IEC61966_2_1.icc')) {
    iccReads++;
  }
  return originalReadFileSync.call(this, file, ...args);
};

let PDFDocument;
try {
  PDFDocument = require('fcmpdfkit');

  assert.equal(iccReads, 0);

  const document = new PDFDocument({ autoFirstPage: false, font: null });
  document.resume();
  document.end();
  assert.equal(iccReads, 0);

  for (let i = 0; i < 2; i++) {
    const pdfaDocument = new PDFDocument({
      autoFirstPage: false,
      font: null,
      subset: 'PDF/A-1',
    });
    pdfaDocument.resume();
    pdfaDocument.end();
  }
  assert.equal(iccReads, 1);
} finally {
  fs.readFileSync = originalReadFileSync;
}

assert.equal(typeof PDFDocument, 'function');
assert.equal(PDFDocument.name, 'PDFDocument');
assert.equal(PDFDocument.PDFDocument, PDFDocument);
assert.equal(typeof PDFDocument.LineWrapper, 'function');
assert.equal(typeof PDFDocument.registerFile, 'function');
const { LineWrapper, registerFile } = require('fcmpdfkit');
assert.equal(LineWrapper, PDFDocument.LineWrapper);
assert.equal(registerFile, PDFDocument.registerFile);
assert.equal(typeof outputHelpers.toBlob, 'function');
assert.equal(typeof outputHelpers.toBytes, 'function');

const BrowserPDFDocument = require(browserBundlePath);
assert.equal(typeof BrowserPDFDocument, 'function');
assert.equal(BrowserPDFDocument.PDFDocument, BrowserPDFDocument);
// fcmpdfkit: the named exports are static members of the default export in
// every build (lib/document.node.js, lib/document.browser.js)
assert.equal(typeof BrowserPDFDocument.LineWrapper, 'function');
assert.equal(typeof BrowserPDFDocument.registerFile, 'function');
assert.equal(typeof BrowserPDFDocument.registerStdFonts, 'function');
assert.equal(PDFDocument.registerStdFonts, undefined);

(async () => {
  const nodeDocument = new PDFDocument({ autoFirstPage: false, font: null });
  const nodeOutput = outputHelpers.toBytes(nodeDocument);
  nodeDocument.end();
  assert.ok((await nodeOutput) instanceof Uint8Array);

  const nodeEsModule = await import('fcmpdfkit');
  assert.equal(typeof nodeEsModule.default, 'function');
  assert.equal(nodeEsModule.PDFDocument, nodeEsModule.default);
  assert.equal(typeof nodeEsModule.LineWrapper, 'function');
  assert.equal(typeof nodeEsModule.registerFile, 'function');
  assert.equal(nodeEsModule.default.LineWrapper, nodeEsModule.LineWrapper);
  assert.equal(nodeEsModule.default.registerFile, nodeEsModule.registerFile);

  const browserModule = await import(browserEsBundleUrl);
  const browserOutputHelpers = await import('fcmpdfkit/output');

  assert.equal(typeof browserModule.default, 'function');
  assert.equal(browserModule.PDFDocument, browserModule.default);
  assert.equal(typeof browserModule.LineWrapper, 'function');
  assert.equal(browserModule.default.LineWrapper, browserModule.LineWrapper);
  assert.equal(typeof browserModule.registerFile, 'function');
  assert.equal(browserModule.default.registerFile, browserModule.registerFile);
  assert.equal(
    browserModule.default.registerStdFonts,
    browserModule.registerStdFonts,
  );
  assert.equal(typeof browserOutputHelpers.toBlob, 'function');
  assert.equal(typeof browserOutputHelpers.toBytes, 'function');

  const browserDocument = new browserModule.default({
    autoFirstPage: false,
    font: null,
  });
  const browserOutput = browserOutputHelpers.toBlob(browserDocument);
  browserDocument.end();
  const blob = await browserOutput;
  assert.equal(blob.type, 'application/pdf');
  assert.ok(blob.size > 0);

  const pdfaDocument = new browserModule.default({
    autoFirstPage: false,
    font: null,
    subset: 'PDF/A-1',
  });
  pdfaDocument.on('data', () => {});
  pdfaDocument.end();
  assert.equal(pdfaDocument._root.data.OutputIntents.length, 1);
})();
